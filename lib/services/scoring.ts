import { createId, getRepository } from "@/lib/data/repository";
import { CommuteCache, Home, HomeScore, HomeScorePoiBreakdown, PointOfInterest } from "@/lib/types";
import { env, featureFlags } from "@/lib/env";
import { clamp, haversineMiles } from "@/lib/utils";

async function fetchDriveMetrics(
  home: Home,
  poi: PointOfInterest,
  existingCache: CommuteCache[],
) {
  const cached = existingCache.find((item) => item.homeId === home.id && item.poiId === poi.id);
  if (cached && (cached.source === "mapbox" || !featureFlags.hasMapbox)) {
    return cached;
  }

  const crowMiles =
    home.latitude !== null &&
    home.longitude !== null &&
    poi.latitude !== null &&
    poi.longitude !== null
      ? haversineMiles(
          { latitude: home.latitude, longitude: home.longitude },
          { latitude: poi.latitude, longitude: poi.longitude },
        )
      : 0;

  if (
    !featureFlags.hasMapbox ||
    home.latitude === null ||
    home.longitude === null ||
    poi.latitude === null ||
    poi.longitude === null
  ) {
    return {
      id: createId("commute"),
      homeId: home.id,
      poiId: poi.id,
      driveMinutes: Number((crowMiles * 2.4).toFixed(1)),
      roadMiles: Number((crowMiles * 1.22).toFixed(1)),
      crowMiles: Number(crowMiles.toFixed(1)),
      source: "estimated" as const,
      computedAt: new Date().toISOString(),
    };
  }

  const coordinates = `${home.longitude},${home.latitude};${poi.longitude},${poi.latitude}`;
  const searchParams = new URLSearchParams({
    overview: "false",
    steps: "false",
    access_token: env.NEXT_PUBLIC_MAPBOX_TOKEN!,
  });
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${searchParams.toString()}`,
    { cache: "no-store" },
  ).catch(() => null);

  if (!response?.ok) {
    if (cached) {
      return cached;
    }

    return {
      id: createId("commute"),
      homeId: home.id,
      poiId: poi.id,
      driveMinutes: Number((crowMiles * 2.4).toFixed(1)),
      roadMiles: Number((crowMiles * 1.22).toFixed(1)),
      crowMiles: Number(crowMiles.toFixed(1)),
      source: "estimated" as const,
      computedAt: new Date().toISOString(),
    };
  }

  const payload = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
    }>;
  };

  const route = payload.routes?.[0];
  return {
    id: createId("commute"),
    homeId: home.id,
    poiId: poi.id,
    driveMinutes: Number(((route?.duration ?? 0) / 60).toFixed(1)),
    roadMiles: Number(((route?.distance ?? 0) / 1609.34).toFixed(1)),
    crowMiles: Number(crowMiles.toFixed(1)),
    source: "mapbox" as const,
    computedAt: new Date().toISOString(),
  };
}

export async function recomputeScores() {
  const repository = getRepository();
  const homes = (await repository.listHomes()).filter(
    (home) => home.latitude !== null && home.longitude !== null && home.status !== "archived",
  );
  const pois = (await repository.listPois())
    .filter((poi) => poi.enabled && poi.latitude !== null && poi.longitude !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, 3);
  const existingCache = await repository.listCommuteCache();

  if (homes.length === 0 || pois.length === 0) {
    await repository.saveScores([], existingCache);
    return {
      scores: [] satisfies HomeScore[],
      cache: existingCache,
    };
  }

  const nextCache = [...existingCache];
  const rawBreakdowns = new Map<string, HomeScorePoiBreakdown[]>();

  for (const poi of pois) {
    const rows: Array<{
      homeId: string;
      metric: CommuteCache;
      insideRadius: boolean;
    }> = [];

    for (const home of homes) {
      const metric = await fetchDriveMetrics(home, poi, nextCache);
      const cachedIndex = nextCache.findIndex(
        (item) => item.homeId === metric.homeId && item.poiId === metric.poiId,
      );

      if (cachedIndex >= 0) {
        nextCache[cachedIndex] = metric;
      } else {
        nextCache.push(metric);
      }

      rows.push({
        homeId: home.id,
        metric,
        insideRadius: metric.crowMiles <= poi.radiusMiles,
      });
    }

    rows.sort((left, right) => left.metric.driveMinutes - right.metric.driveMinutes);

    rows.forEach((row, index) => {
      const percentile =
        rows.length === 1 ? 100 : clamp(100 * (1 - index / (rows.length - 1)), 0, 100);
      const breakdown: HomeScorePoiBreakdown = {
        poiId: poi.id,
        label: poi.label,
        weight: poi.weight,
        driveMinutes: row.metric.driveMinutes,
        roadMiles: row.metric.roadMiles,
        crowMiles: row.metric.crowMiles,
        isInsideRadius: row.insideRadius,
        percentileScore: Number(percentile.toFixed(1)),
        source: row.metric.source,
      };

      const current = rawBreakdowns.get(row.homeId) ?? [];
      rawBreakdowns.set(row.homeId, [...current, breakdown]);
    });
  }

  const scores = homes.map((home) => {
    const breakdown = rawBreakdowns.get(home.id) ?? [];
    const totalWeight = breakdown.reduce((sum, item) => sum + item.weight, 0) || 1;
    const weightedScore = breakdown.reduce(
      (sum, item) => sum + item.percentileScore * item.weight,
      0,
    );

    return {
      id: createId("score"),
      homeId: home.id,
      overallScore: Number((weightedScore / totalWeight).toFixed(1)),
      overallRank: 0,
      insideRadiusCount: breakdown.filter((item) => item.isInsideRadius).length,
      computedAt: new Date().toISOString(),
      breakdown,
    };
  });

  scores.sort((left, right) => {
    const scoreDelta = right.overallScore - left.overallScore;
    if (scoreDelta !== 0) return scoreDelta;
    const radiusDelta = right.insideRadiusCount - left.insideRadiusCount;
    if (radiusDelta !== 0) return radiusDelta;
    const leftHome = homes.find((home) => home.id === left.homeId);
    const rightHome = homes.find((home) => home.id === right.homeId);
    return (leftHome?.rent ?? Number.MAX_SAFE_INTEGER) - (rightHome?.rent ?? Number.MAX_SAFE_INTEGER);
  });

  const rankedScores = scores.map((score, index) => ({
    ...score,
    overallRank: index + 1,
  }));

  await repository.saveScores(rankedScores, nextCache);

  return {
    scores: rankedScores,
    cache: nextCache,
  };
}

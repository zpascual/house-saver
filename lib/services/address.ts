import { env, featureFlags } from "@/lib/env";
import { createSuggestionId } from "@/lib/data/repository";
import { AddressSuggestion } from "@/lib/types";
import { haversineMiles } from "@/lib/utils";

const ADDRESS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const SOUTH_BAY_BBOX = "-122.6,36.5,-121.1,37.5";
const addressSearchCache = new Map<
  string,
  { expiresAt: number; suggestions: AddressSuggestion[] }
>();
const reverseGeocodeCache = new Map<
  string,
  { expiresAt: number; suggestion: AddressSuggestion | null }
>();

const regionalSuggestions: Omit<AddressSuggestion, "id">[] = [
  {
    label: "7550 Princevalle Street, Gilroy, CA 95020",
    normalizedAddress: "7550 Princevalle Street, Gilroy, CA 95020",
    streetAddress: "7550 Princevalle Street",
    city: "Gilroy",
    state: "CA",
    zipCode: "95020",
    latitude: 37.0182,
    longitude: -121.5683,
    provider: "demo",
  },
  {
    label: "18615 Monterey Road, Morgan Hill, CA 95037",
    normalizedAddress: "18615 Monterey Road, Morgan Hill, CA 95037",
    streetAddress: "18615 Monterey Road",
    city: "Morgan Hill",
    state: "CA",
    zipCode: "95037",
    latitude: 37.1305,
    longitude: -121.6544,
    provider: "demo",
  },
  {
    label: "804 Ocean Street, Santa Cruz, CA 95060",
    normalizedAddress: "804 Ocean Street, Santa Cruz, CA 95060",
    streetAddress: "804 Ocean Street",
    city: "Santa Cruz",
    state: "CA",
    zipCode: "95060",
    latitude: 36.9844,
    longitude: -122.0191,
    provider: "demo",
  },
  {
    label: "650 San Benito Street, Hollister, CA 95023",
    normalizedAddress: "650 San Benito Street, Hollister, CA 95023",
    streetAddress: "650 San Benito Street",
    city: "Hollister",
    state: "CA",
    zipCode: "95023",
    latitude: 36.8525,
    longitude: -121.4016,
    provider: "demo",
  },
  {
    label: "1 Civic Center Drive, Scotts Valley, CA 95066",
    normalizedAddress: "1 Civic Center Drive, Scotts Valley, CA 95066",
    streetAddress: "1 Civic Center Drive",
    city: "Scotts Valley",
    state: "CA",
    zipCode: "95066",
    latitude: 37.0505,
    longitude: -122.0167,
    provider: "demo",
  },
];

type MapboxForwardPayload = {
  features?: Array<{
    id?: string;
    geometry?: { coordinates?: [number, number] };
    properties?: {
      full_address?: string;
      name?: string;
      name_preferred?: string;
      coordinates?: {
        longitude?: number;
        latitude?: number;
        routable_points?: Array<{
          longitude?: number;
          latitude?: number;
        }>;
      };
      context?: {
        place?: { name?: string };
        locality?: { name?: string };
        region?: { name?: string; region_code?: string; region_code_full?: string };
        postcode?: { name?: string };
      };
    };
  }>;
};

function withIds(suggestions: Omit<AddressSuggestion, "id">[]) {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    id: createSuggestionId(suggestion),
  }));
}

function filterDemoSuggestions(query: string) {
  const needle = query.toLowerCase();
  return withIds(
    regionalSuggestions.filter((suggestion) =>
      suggestion.normalizedAddress.toLowerCase().includes(needle),
    ),
  );
}

function nearestDemoSuggestion(latitude: number, longitude: number) {
  const [closest] = withIds(regionalSuggestions)
    .map((suggestion) => ({
      suggestion,
      distance: haversineMiles(
        { latitude, longitude },
        { latitude: suggestion.latitude, longitude: suggestion.longitude },
      ),
    }))
    .sort((left, right) => left.distance - right.distance);

  return closest && closest.distance <= 1 ? closest.suggestion : null;
}

function formatStateCode(region?: { name?: string; region_code?: string; region_code_full?: string }) {
  if (region?.region_code) {
    return region.region_code.toUpperCase();
  }

  if (region?.region_code_full?.includes("-")) {
    return region.region_code_full.split("-").pop() ?? "CA";
  }

  if (region?.name === "California") {
    return "CA";
  }

  return "CA";
}

function parseMapboxSuggestion(feature: NonNullable<MapboxForwardPayload["features"]>[number]) {
  const properties = feature.properties;
  const context = properties?.context;
  const routablePoint = properties?.coordinates?.routable_points?.[0];
  const [fallbackLongitude = 0, fallbackLatitude = 0] = feature.geometry?.coordinates ?? [];
  const longitude = routablePoint?.longitude ?? properties?.coordinates?.longitude ?? fallbackLongitude;
  const latitude = routablePoint?.latitude ?? properties?.coordinates?.latitude ?? fallbackLatitude;
  const label = properties?.full_address ?? properties?.name ?? "";
  const streetAddress = properties?.name_preferred ?? properties?.name ?? label.split(",")[0]?.trim() ?? "";
  const city = context?.place?.name ?? context?.locality?.name ?? "";
  const state = formatStateCode(context?.region);
  const zipCode = context?.postcode?.name ?? "";

  const suggestion: Omit<AddressSuggestion, "id"> = {
    label,
    normalizedAddress: label,
    streetAddress,
    city,
    state,
    zipCode,
    latitude,
    longitude,
    provider: "mapbox",
  };

  return {
    ...suggestion,
    id: createSuggestionId(suggestion),
  };
}

export async function searchAddresses(query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [] satisfies AddressSuggestion[];
  }

  const cacheKey = normalizedQuery.toLowerCase();
  const cached = addressSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.suggestions;
  }

  if (!featureFlags.hasMapbox) {
    return filterDemoSuggestions(normalizedQuery).slice(0, 5);
  }

  const searchParams = new URLSearchParams({
    q: normalizedQuery,
    autocomplete: "true",
    limit: "5",
    country: "us",
    bbox: SOUTH_BAY_BBOX,
    access_token: env.NEXT_PUBLIC_MAPBOX_TOKEN!,
  });

  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${searchParams.toString()}`,
    { cache: "no-store" },
  ).catch(() => null);

  if (!response?.ok) {
    return filterDemoSuggestions(normalizedQuery).slice(0, 5);
  }

  const payload = (await response.json()) as MapboxForwardPayload;
  const suggestions =
    payload.features
      ?.map(parseMapboxSuggestion)
      .filter(
        (suggestion) =>
          Number.isFinite(suggestion.latitude) &&
          Number.isFinite(suggestion.longitude) &&
          Boolean(suggestion.normalizedAddress),
      ) ?? [];

  const finalSuggestions =
    suggestions.length > 0 ? suggestions : filterDemoSuggestions(normalizedQuery).slice(0, 5);

  addressSearchCache.set(cacheKey, {
    expiresAt: Date.now() + ADDRESS_CACHE_TTL_MS,
    suggestions: finalSuggestions,
  });

  return finalSuggestions;
}

export async function resolveAddressSuggestion(selectedId: string, fallbackLabel?: string) {
  const regionalMatch = withIds(regionalSuggestions).find((item) => item.id === selectedId);
  if (regionalMatch) {
    return regionalMatch;
  }

  const liveSuggestions = fallbackLabel ? await searchAddresses(fallbackLabel) : [];
  return liveSuggestions.find((item) => item.id === selectedId) ?? null;
}

export async function reverseGeocodeCoordinates(latitude: number, longitude: number) {
  const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const cached = reverseGeocodeCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.suggestion;
  }

  if (!featureFlags.hasMapbox) {
    const fallback = nearestDemoSuggestion(latitude, longitude);
    reverseGeocodeCache.set(cacheKey, {
      expiresAt: Date.now() + ADDRESS_CACHE_TTL_MS,
      suggestion: fallback,
    });
    return fallback;
  }

  const searchParams = new URLSearchParams({
    longitude: longitude.toString(),
    latitude: latitude.toString(),
    types: "address",
    access_token: env.NEXT_PUBLIC_MAPBOX_TOKEN!,
  });

  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/reverse?${searchParams.toString()}`,
    { cache: "no-store" },
  ).catch(() => null);

  if (!response?.ok) {
    const fallback = nearestDemoSuggestion(latitude, longitude);
    reverseGeocodeCache.set(cacheKey, {
      expiresAt: Date.now() + ADDRESS_CACHE_TTL_MS,
      suggestion: fallback,
    });
    return fallback;
  }

  const payload = (await response.json()) as MapboxForwardPayload;
  const suggestion = payload.features?.[0] ? parseMapboxSuggestion(payload.features[0]) : null;
  const finalSuggestion = suggestion ?? nearestDemoSuggestion(latitude, longitude);

  reverseGeocodeCache.set(cacheKey, {
    expiresAt: Date.now() + ADDRESS_CACHE_TTL_MS,
    suggestion: finalSuggestion,
  });

  return finalSuggestion;
}

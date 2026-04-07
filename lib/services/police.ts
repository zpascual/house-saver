import { getRepository } from "@/lib/data/repository";
import { CrimeSnapshot, CrimeSource } from "@/lib/types";

export async function refreshCrimeSnapshots() {
  const repository = getRepository();
  const sources = await repository.listCrimeSources();
  const currentSnapshots = await repository.listCrimeSnapshots();

  const refreshedSnapshots: CrimeSnapshot[] = currentSnapshots.map((snapshot) => ({
    ...snapshot,
    fetchedAt: new Date().toISOString(),
    summary:
      snapshot.coverageStatus === "unavailable"
        ? "No free supported public feed is connected for this ZIP yet."
        : snapshot.summary,
  }));

  await repository.upsertCrimeData({
    sources: sources.map((source) => ({
      ...source,
      notes: source.notes,
    })),
    snapshots: refreshedSnapshots,
  });

  return {
    sources,
    snapshots: refreshedSnapshots,
  };
}

export function coverageForZip(zipCode: string, sources: CrimeSource[]) {
  return (
    sources.find((source) => source.zipCodes.includes(zipCode)) ?? {
      id: `crime-source-${zipCode}`,
      sourceName: "Coverage unavailable",
      sourceUrl: "",
      jurisdiction: zipCode,
      sourceKind: "manual",
      coverageStatus: "unavailable",
      scope: "zip",
      zipCodes: [zipCode],
      active: false,
      notes: "No free supported public feed configured yet.",
    }
  );
}

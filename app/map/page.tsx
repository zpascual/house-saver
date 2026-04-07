import { AppShell } from "@/components/app-shell";
import { RentalMap } from "@/components/map/rental-map";
import { getRepository } from "@/lib/data/repository";
import { env } from "@/lib/env";
import { requireWorkspacePageAccess } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  await requireWorkspacePageAccess();
  const data = await getRepository().getDashboardData();

  return (
    <AppShell currentPath="/map" heading="Map + ranking overlay" eyebrow="Map View">
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <aside className="grid gap-4">
          {data.homes.map((home) => (
            <div key={home.id} className="hs-panel rounded-[2rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-[#17324f]">
                    {home.displayName}
                  </h2>
                  <p className="hs-muted mt-1 text-sm">{home.normalizedAddress}</p>
                </div>
                <div className="rounded-full bg-[#034078] px-3 py-2 text-sm font-semibold text-[#fffffc]">
                  #{home.score?.overallRank ?? "-"}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#4d6277]">
                <span className="hs-chip-gold rounded-full px-3 py-1">{formatCurrency(home.rent)}</span>
                <span className="hs-chip-green rounded-full px-3 py-1">{home.city}</span>
                <span className="hs-chip-blue rounded-full px-3 py-1">
                  Crime: {home.crimeSnapshot?.coverageStatus ?? "unavailable"}
                </span>
              </div>
            </div>
          ))}
        </aside>
        <div className="hs-panel rounded-[2rem] p-3">
          <RentalMap homes={data.homes} pois={data.pois} mapboxToken={env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null} />
        </div>
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { PointsOfInterestForm } from "@/components/points-of-interest-form";
import { getRepository } from "@/lib/data/repository";
import { requireWorkspacePageAccess } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PointsOfInterestPage() {
  await requireWorkspacePageAccess();
  const data = await getRepository().getDashboardData();

  return (
    <AppShell currentPath="/settings/points-of-interest" heading="Points of interest" eyebrow="Scoring Setup">
      <div className="grid gap-6">
        <div className="hs-panel rounded-[2rem] p-5 text-sm leading-7 text-[#5d7287]">
          Add up to three destinations, assign a weight to each, and set a radius in miles. Rankings
          use drive time where the free routing API is available, then cache results so you do not
          burn quota on every page load. Disabled POIs stay saved but will not affect ranking or
          appear on the map.
        </div>
        <PointsOfInterestForm pois={data.pois} />
      </div>
    </AppShell>
  );
}

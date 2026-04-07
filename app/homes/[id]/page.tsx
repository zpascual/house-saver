import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeForm } from "@/components/home-form";
import { getRepository } from "@/lib/data/repository";
import { requireWorkspacePageAccess } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomeDetailPage(props: PageProps<"/homes/[id]">) {
  await requireWorkspacePageAccess();
  const { id } = await props.params;
  const home = await getRepository().getHome(id);

  if (!home) {
    notFound();
  }

  return (
    <AppShell currentPath="/homes" heading={home.displayName} eyebrow="Listing Detail">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <HomeForm home={home} />
        <aside className="grid gap-4">
          <div className="hs-panel rounded-[2rem] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[#6f8498]">Current rank</div>
            <div className="mt-3 font-[family-name:var(--font-space-grotesk)] text-5xl font-bold text-[#034078]">
              {home.score?.overallRank ?? "-"}
            </div>
            <p className="hs-muted mt-2 text-sm">
              Overall score: {home.score?.overallScore ?? "Not computed"}.
            </p>
          </div>
          <div className="hs-panel rounded-[2rem] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[#6f8498]">Police activity signal</div>
            <div className="mt-3 text-lg font-semibold text-[#17324f]">
              {home.crimeSnapshot?.coverageStatus ?? "unavailable"}
            </div>
            <p className="hs-muted mt-2 text-sm leading-6">
              {home.crimeSnapshot?.summary ??
                "No supported free public feed is connected for this ZIP yet."}
            </p>
          </div>
          <div className="hs-panel rounded-[2rem] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[#6f8498]">Latest import</div>
            <div className="mt-3 text-lg font-semibold text-[#17324f]">
              {home.latestImport?.status ?? "manual"}
            </div>
            <p className="hs-muted mt-2 text-sm leading-6">
              {home.latestImport?.summary ??
                "This listing was created manually, so there is no import payload yet."}
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

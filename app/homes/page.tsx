import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { HomeTable } from "@/components/home-table";
import { ImportUrlForm } from "@/components/import-url-form";
import { getRepository } from "@/lib/data/repository";
import { recomputeScores } from "@/lib/services/scoring";
import { requireWorkspacePageAccess } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomesPage() {
  await requireWorkspacePageAccess();
  const repository = getRepository();
  let data = await repository.getDashboardData();

  if (data.scores.length === 0 && data.pois.length > 0) {
    await recomputeScores();
    data = await repository.getDashboardData();
  }

  const favoriteCount = data.homes.filter((home) => home.status === "favorite").length;
  const bestHome = data.homes[0];

  return (
    <AppShell currentPath="/homes" heading="Rental scoreboard" eyebrow="HouseSaver">
      <div className="grid gap-6">
        <ImportUrlForm />
        <section className="grid gap-4 md:grid-cols-3">
          <div className="hs-panel rounded-[2rem] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[#6f8498]">Saved rentals</div>
            <div className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-[#17324f]">
              {data.homes.length}
            </div>
            <p className="hs-muted mt-2 text-sm">
              Includes imported and manual entries across your shared workspace.
            </p>
          </div>
          <div className="hs-panel rounded-[2rem] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[#6f8498]">Favorites</div>
            <div className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-[#17324f]">
              {favoriteCount}
            </div>
            <p className="hs-muted mt-2 text-sm">
              Your shortlist stays editable after imports or manual corrections.
            </p>
          </div>
          <div className="hs-panel rounded-[2rem] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[#6f8498]">Current best fit</div>
            <div className="mt-3 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#17324f]">
              {bestHome ? bestHome.displayName : "No ranked homes yet"}
            </div>
            <p className="hs-muted mt-2 text-sm">
              {bestHome
                ? `${formatCurrency(bestHome.rent)} • rank #${bestHome.score?.overallRank ?? "-"}`
                : "Add POIs and refresh rankings to score homes."}
            </p>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="hs-muted text-sm">
            {data.pois.length > 0
              ? `${data.pois.length} active points of interest are shaping the current rank.`
              : "Add up to three points of interest to start commute-based ranking."}
          </div>
          <Link
            href="/settings/points-of-interest"
            className="hs-button-secondary rounded-full px-4 py-2 text-sm font-medium transition"
          >
            Manage POIs
          </Link>
        </div>
        <HomeTable homes={data.homes} />
      </div>
    </AppShell>
  );
}

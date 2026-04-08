import Link from "next/link";
import { featureFlags } from "@/lib/env";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/homes", label: "Homes" },
  { href: "/map", label: "Map" },
  { href: "/settings/points-of-interest", label: "POIs" },
  { href: "/settings/access", label: "Access" },
];

export function AppShell({
  currentPath,
  heading,
  eyebrow,
  children,
}: {
  currentPath: string;
  heading: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(117,142,79,0.18),transparent_34%),radial-gradient(circle_at_top_right,_rgba(246,174,45,0.16),transparent_28%),linear-gradient(180deg,#f7fafb_0%,#fffffc_34%,#f2f6f8_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="hs-panel rounded-[2rem] px-5 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="hs-chip-green inline-flex rounded-full border border-[rgba(117,142,79,0.2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]">
                {eyebrow}
              </div>
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight text-[#17324f] sm:text-5xl">
                  {heading}
                </h1>
                <p className="hs-muted max-w-3xl text-sm leading-7 sm:text-base">
                  Save rentals from Zillow, Redfin, or Craigslist, clean up the details,
                  compare commute ranking across three weighted destinations, and keep a free
                  public-safety signal tied to ZIP coverage.
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(124,144,160,0.24)] bg-[rgba(124,144,160,0.08)] px-4 py-3">
                <div className="hs-kicker text-xs uppercase tracking-[0.24em]">Auth</div>
                <div className="mt-1 font-medium text-[#17324f]">
                  {featureFlags.hasSupabase ? "Invite-only mode ready" : "Demo mode until Supabase keys are set"}
                </div>
              </div>
              <div className="rounded-2xl border border-[rgba(124,144,160,0.24)] bg-[rgba(124,144,160,0.08)] px-4 py-3">
                <div className="hs-kicker text-xs uppercase tracking-[0.24em]">Maps + Routing</div>
                <div className="mt-1 font-medium text-[#17324f]">
                  {featureFlags.hasMapbox
                    ? "Live Mapbox services connected"
                    : "Fallback demo data active"}
                </div>
              </div>
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  currentPath === item.href
                    ? "bg-[#034078] text-[#fffffc] shadow-[0_10px_30px_-18px_rgba(3,64,120,0.8)]"
                    : "bg-[rgba(124,144,160,0.12)] text-[#4d6277] hover:bg-[rgba(124,144,160,0.2)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mt-6 flex-1">{children}</main>
      </div>
    </div>
  );
}

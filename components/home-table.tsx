import Link from "next/link";
import { HomeWithDetails } from "@/lib/types";
import { formatBedsBaths, formatCurrency } from "@/lib/utils";

export function HomeTable({ homes }: { homes: HomeWithDetails[] }) {
  return (
    <div className="hs-panel overflow-hidden rounded-[2rem]">
      <div className="border-b border-[rgba(124,144,160,0.18)] px-5 py-4">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-semibold text-[#17324f]">
          Ranked homes
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[rgba(124,144,160,0.08)] text-xs uppercase tracking-[0.22em] text-[#6f8498]">
            <tr>
              <th className="px-5 py-4">Rank</th>
              <th className="px-5 py-4">Listing</th>
              <th className="px-5 py-4">Rent</th>
              <th className="px-5 py-4">Beds/Baths</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Crime signal</th>
              <th className="px-5 py-4">Source</th>
            </tr>
          </thead>
          <tbody>
            {homes.map((home) => (
              <tr key={home.id} className="border-t border-[rgba(124,144,160,0.12)] text-sm text-[#4d6277]">
                <td className="px-5 py-4 align-top">
                  <div className="inline-flex size-10 items-center justify-center rounded-full bg-[#034078] font-semibold text-[#fffffc] shadow-[0_10px_26px_-18px_rgba(3,64,120,0.9)]">
                    {home.score?.overallRank ?? "-"}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <Link href={`/homes/${home.id}`} className="font-semibold text-[#17324f] hover:text-[#034078]">
                    {home.displayName}
                  </Link>
                  <div className="mt-1 max-w-sm text-xs leading-6 text-[#6f8498]">
                    {home.normalizedAddress || "Address still needs to be confirmed"}
                  </div>
                </td>
                <td className="px-5 py-4 align-top font-medium text-[#17324f]">
                  {formatCurrency(home.rent)}
                </td>
                <td className="px-5 py-4 align-top">{formatBedsBaths(home.beds, home.baths)}</td>
                <td className="px-5 py-4 align-top">{home.city || "Unknown"}, {home.state}</td>
                <td className="px-5 py-4 align-top">
                  <span className="hs-chip-blue rounded-full px-3 py-1 text-xs font-medium">
                    {home.crimeSnapshot?.coverageStatus ?? "unavailable"}
                  </span>
                  <div className="mt-1 text-xs text-[#6f8498]">
                    {home.crimeSnapshot?.incidentCount ?? "?"} incidents /{" "}
                    {home.crimeSnapshot?.recentWindowDays ?? 7}d
                  </div>
                </td>
                <td className="px-5 py-4 align-top uppercase text-[#6f8498]">
                  {home.sourceSite}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

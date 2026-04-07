"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function ImportUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/import-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const payload = (await response.json()) as { homeId?: string; error?: string };
      if (!response.ok || !payload.homeId) {
        throw new Error(payload.error ?? "Import failed");
      }

      startTransition(() => {
        router.push(`/homes/${payload.homeId}`);
        router.refresh();
      });
      setUrl("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Import failed");
    } finally {
      setPending(false);
    }
  }

  async function createManualListing() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/homes", {
        method: "POST",
      });
      const payload = (await response.json()) as { home?: { id: string }; error?: string };
      if (!response.ok || !payload.home) {
        throw new Error(payload.error ?? "Could not create a manual listing");
      }
      const home = payload.home;

      startTransition(() => {
        router.push(`/homes/${home.id}`);
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not create manual listing",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="hs-panel rounded-[2rem] p-5">
      <div className="mb-4 space-y-2">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-semibold text-[#17324f]">
          Add a rental fast
        </h2>
        <p className="hs-muted text-sm leading-6">
          Paste a Zillow, Redfin, or Craigslist link for a best-effort import, or start a manual
          listing and fill in rent, address, beds, baths, and notes yourself.
        </p>
      </div>
      <form onSubmit={handleImport} className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input
          className="hs-input rounded-2xl px-4 py-3 text-sm outline-none ring-0"
          placeholder="https://www.zillow.com/... or https://sfbay.craigslist.org/..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className="hs-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed"
        >
          {pending ? "Importing..." : "Import URL"}
        </button>
        <button
          type="button"
          onClick={createManualListing}
          disabled={pending}
          className="hs-button-secondary rounded-2xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Manual entry
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

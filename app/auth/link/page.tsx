import { AppShell } from "@/components/app-shell";
import { getSafeNextPath } from "@/lib/app-url";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthLinkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "email";
  const next = getSafeNextPath(typeof params.next === "string" ? params.next : null);

  return (
    <AppShell currentPath="/homes" heading="Finish sign-in" eyebrow="Magic Link">
      <div className="mx-auto max-w-2xl">
        <div className="hs-panel grid gap-5 rounded-[2rem] p-6">
          <div className="space-y-2">
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-[#17324f]">
              Continue into House Saver
            </h2>
            <p className="hs-muted text-sm leading-7">
              This extra click keeps email scanners from consuming your sign-in link before you do.
            </p>
          </div>
          <form action="/api/auth/consume-link" method="post" className="grid gap-4">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="hs-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition"
              disabled={!tokenHash}
            >
              Sign in to House Saver
            </button>
          </form>
          {!tokenHash ? (
            <p className="text-sm text-rose-600">
              This sign-in link is missing its token. Request a fresh email from the sign-in page.
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

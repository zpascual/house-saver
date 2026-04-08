import { AppShell } from "@/components/app-shell";
import { SignInForm } from "@/components/sign-in-form";
import { featureFlags } from "@/lib/env";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialError = typeof params.error === "string" ? params.error : null;

  return (
    <AppShell currentPath="/homes" heading="Shared workspace access" eyebrow="Sign In">
      <div className="mx-auto max-w-2xl">
        {featureFlags.hasSupabase ? (
          <SignInForm initialError={initialError} />
        ) : (
          <div className="hs-panel rounded-[2rem] p-6 text-sm leading-7 text-[#5d7287]">
            Supabase keys are not set, so the app is currently running in open demo mode. Add the
            Supabase env vars in `.env.local` when you want invite-only email access.
          </div>
        )}
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { AccessForm } from "@/components/access-form";
import { getRepository } from "@/lib/data/repository";
import { requireWorkspaceOwnerPageAccess } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const owner = await requireWorkspaceOwnerPageAccess();
  const members = await getRepository().listMembers();

  return (
    <AppShell currentPath="/settings/access" heading="Workspace access" eyebrow="Sharing">
      <div className="grid gap-6">
        <div className="hs-panel rounded-[2rem] p-5 text-sm leading-7 text-[#5d7287]">
          Add or remove the email addresses that can sign in to this workspace. New people can use
          the normal sign-in page as soon as their email is on this list. Owners stay protected here
          so you do not accidentally lock yourself out.
        </div>
        <AccessForm members={members} ownerEmail={owner.email} />
      </div>
    </AppShell>
  );
}

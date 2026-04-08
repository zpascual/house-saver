import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { featureFlags, env, supabasePublicKey } from "@/lib/env";
import { getRepository } from "@/lib/data/repository";
import { createClient } from "@/utils/supabase/server";

export async function getSupabaseServerClient() {
  if (!featureFlags.hasSupabase || !supabasePublicKey) {
    return null;
  }

  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getWorkspaceUser() {
  const membership = await getWorkspaceMembership();
  if (!membership) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return membership.email.toLowerCase() === user.email.toLowerCase() ? user : null;
}

export async function getWorkspaceMembership() {
  const members = await getRepository().listMembers();

  if (!featureFlags.authEnabled) {
    return members.find((member) => member.role === "owner") ?? members[0] ?? null;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return (
    members.find((member) => member.email.toLowerCase() === user.email!.toLowerCase()) ?? null
  );
}

export async function requireWorkspacePageAccess() {
  if (!featureFlags.authEnabled) {
    return null;
  }

  const user = await getWorkspaceUser();
  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireWorkspaceOwnerPageAccess() {
  const membership = await getWorkspaceMembership();

  if (!membership) {
    if (featureFlags.authEnabled) {
      redirect("/sign-in");
    }

    redirect("/homes");
  }

  if (membership.role !== "owner") {
    redirect("/homes");
  }

  return membership;
}

export async function assertWorkspaceApiAccess() {
  if (!featureFlags.authEnabled) {
    return null;
  }

  const user = await getWorkspaceUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function assertWorkspaceOwnerApiAccess() {
  const membership = await getWorkspaceMembership();

  if (!membership) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (membership.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export function hasValidCronSecret(request: Request) {
  if (!env.CRON_SECRET) {
    return false;
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerToken = request.headers.get("x-cron-secret");

  return bearerToken === env.CRON_SECRET || headerToken === env.CRON_SECRET;
}

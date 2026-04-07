"use client";

import { createBrowserClient } from "@supabase/ssr";
import { featureFlags, env, supabasePublicKey } from "@/lib/env";

export function getSupabaseBrowserClient() {
  if (!featureFlags.hasSupabase || !supabasePublicKey) {
    return null;
  }

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublicKey,
  );
}

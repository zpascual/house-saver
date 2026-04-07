"use client";

import { featureFlags, supabasePublicKey } from "@/lib/env";
import { createClient } from "@/utils/supabase/client";

export function getSupabaseBrowserClient() {
  if (!featureFlags.hasSupabase || !supabasePublicKey) {
    return null;
  }

  return createClient();
}

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, supabasePublicKey } from "@/lib/env";

export const createClient = () =>
  createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublicKey!,
  );

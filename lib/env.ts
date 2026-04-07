import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ENABLE_INVITE_ONLY_AUTH: z.enum(["true", "false"]).optional(),
});

export const env = envSchema.parse(process.env);

export const supabasePublicKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const featureFlags = {
  hasDatabase: Boolean(env.DATABASE_URL),
  hasSupabase:
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(supabasePublicKey),
  authEnabled:
    env.ENABLE_INVITE_ONLY_AUTH === "true" &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(supabasePublicKey),
  hasMapbox: Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN),
};

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, supabasePublicKey } from "@/lib/env";

export const createClient = async (
  cookieStore?: Awaited<ReturnType<typeof cookies>>,
) => {
  const resolvedCookieStore = cookieStore ?? (await cookies());

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublicKey!,
    {
      cookies: {
        getAll() {
          return resolvedCookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              resolvedCookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot always set cookies directly.
          }
        },
      },
    },
  );
};

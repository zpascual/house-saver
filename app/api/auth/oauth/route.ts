import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl, getSafeNextPath } from "@/lib/app-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  provider: z.enum(["google"]),
  next: z.string().optional(),
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = inputSchema.safeParse({
    provider: formData.get("provider"),
    next: formData.get("next"),
  });

  const appUrl = getAppUrl(request);
  if (!parsed.success) {
    const errorUrl = new URL("/sign-in", appUrl);
    errorUrl.searchParams.set("error", "That sign-in provider is not available.");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    const errorUrl = new URL("/sign-in", appUrl);
    errorUrl.searchParams.set("error", "Supabase sign-in is not configured yet.");
    return NextResponse.redirect(errorUrl);
  }

  const next = getSafeNextPath(parsed.data.next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsed.data.provider,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    const errorUrl = new URL("/sign-in", appUrl);
    errorUrl.searchParams.set(
      "error",
      error?.message ?? "Could not start Google sign-in. Check the provider configuration.",
    );
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(data.url);
}

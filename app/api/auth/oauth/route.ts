import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl, getSafeNextPath } from "@/lib/app-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  provider: z.enum(["google"]),
  next: z.string().optional(),
});

function buildErrorRedirect(request: Request, message: string) {
  const errorUrl = new URL("/sign-in", getAppUrl(request));
  errorUrl.searchParams.set("error", message);
  return NextResponse.redirect(errorUrl);
}

async function startOAuthSignIn(request: Request, values: { provider: FormDataEntryValue | null; next: FormDataEntryValue | null }) {
  const parsed = inputSchema.safeParse({
    provider: values.provider,
    next: values.next,
  });

  if (!parsed.success) {
    return buildErrorRedirect(request, "That sign-in provider is not available.");
  }

  const appUrl = getAppUrl(request);
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildErrorRedirect(request, "Supabase sign-in is not configured yet.");
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
    return buildErrorRedirect(
      request,
      error?.message ?? "Could not start Google sign-in. Check the provider configuration.",
    );
  }

  return NextResponse.redirect(data.url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return startOAuthSignIn(request, {
    provider: url.searchParams.get("provider"),
    next: url.searchParams.get("next"),
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  return startOAuthSignIn(request, {
    provider: formData.get("provider"),
    next: formData.get("next"),
  });
}

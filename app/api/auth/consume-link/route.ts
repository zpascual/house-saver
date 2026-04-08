import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl, getSafeNextPath } from "@/lib/app-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  token_hash: z.string().trim().min(1),
  type: z.enum(["signup", "invite", "magiclink", "recovery", "email_change", "email"]),
  next: z.string().optional(),
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = inputSchema.safeParse({
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
    next: formData.get("next"),
  });

  const appUrl = getAppUrl(request);
  if (!parsed.success) {
    const errorUrl = new URL("/sign-in", appUrl);
    errorUrl.searchParams.set("error", "This sign-in link is incomplete. Request a new email.");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    const errorUrl = new URL("/sign-in", appUrl);
    errorUrl.searchParams.set("error", "Supabase sign-in is not configured yet.");
    return NextResponse.redirect(errorUrl);
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.token_hash,
    type: parsed.data.type as EmailOtpType,
  });

  if (error) {
    const errorUrl = new URL("/sign-in", appUrl);
    errorUrl.searchParams.set(
      "error",
      "That sign-in link is invalid or expired. Request the newest email and try again.",
    );
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(getSafeNextPath(parsed.data.next), appUrl));
}

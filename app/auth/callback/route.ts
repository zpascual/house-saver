import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { getAppUrl, getSafeNextPath } from "@/lib/app-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(url.searchParams.get("next"));
  const supabase = await getSupabaseServerClient();

  if (supabase) {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
    }
  }

  return NextResponse.redirect(new URL(next, getAppUrl(request)));
}

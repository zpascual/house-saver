import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { getAppUrl, getSafeNextPath } from "@/lib/app-url";
import { getRepository } from "@/lib/data/repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(url.searchParams.get("next"));
  const supabase = await getSupabaseServerClient();
  const appUrl = getAppUrl(request);

  if (supabase) {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const members = await getRepository().listMembers();
      const allowed = members.some(
        (member) => member.email.toLowerCase() === user.email!.toLowerCase(),
      );

      if (!allowed) {
        await supabase.auth.signOut();

        const errorUrl = new URL("/sign-in", appUrl);
        errorUrl.searchParams.set(
          "error",
          "That account is not invited to this shared workspace.",
        );
        return NextResponse.redirect(errorUrl);
      }
    }
  }

  return NextResponse.redirect(new URL(next, appUrl));
}

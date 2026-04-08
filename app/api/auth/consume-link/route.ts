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

function buildErrorRedirect(request: Request, message: string) {
  const errorUrl = new URL("/sign-in", getAppUrl(request));
  errorUrl.searchParams.set("error", message);
  return NextResponse.redirect(errorUrl, { status: 303 });
}

async function consumeLink(request: Request, values: { token_hash: FormDataEntryValue | null; type: FormDataEntryValue | null; next: FormDataEntryValue | null }) {
  const parsed = inputSchema.safeParse({
    token_hash: values.token_hash,
    type: values.type,
    next: values.next,
  });

  if (!parsed.success) {
    return buildErrorRedirect(request, "This sign-in link is incomplete. Request a new email.");
  }

  const appUrl = getAppUrl(request);
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildErrorRedirect(request, "Supabase sign-in is not configured yet.");
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.token_hash,
    type: parsed.data.type as EmailOtpType,
  });

  if (error) {
    return buildErrorRedirect(
      request,
      "That sign-in link is invalid or expired. Request the newest email and try again.",
    );
  }

  return NextResponse.redirect(new URL(getSafeNextPath(parsed.data.next), appUrl), {
    status: 303,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return consumeLink(request, {
    token_hash: url.searchParams.get("token_hash"),
    type: url.searchParams.get("type"),
    next: url.searchParams.get("next"),
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  return consumeLink(request, {
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
    next: formData.get("next"),
  });
}

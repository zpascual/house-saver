import { z } from "zod";
import { getRepository } from "@/lib/data/repository";
import { featureFlags } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  email: z.string().email(),
  token: z.string().trim().regex(/^\d{6,10}$/, "Enter the numeric sign-in code from your email."),
});

export async function POST(request: Request) {
  try {
    if (!featureFlags.hasSupabase) {
      return Response.json(
        { error: "Supabase is not configured yet. The app is still in demo mode." },
        { status: 400 },
      );
    }

    const payload = inputSchema.parse(await request.json());
    const members = await getRepository().listMembers();
    const allowed = members.some(
      (member) => member.email.toLowerCase() === payload.email.toLowerCase(),
    );

    if (!allowed) {
      return Response.json(
        { error: "That email is not invited to the shared workspace." },
        { status: 403 },
      );
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return Response.json({ error: "Supabase client unavailable." }, { status: 500 });
    }

    const { error } = await supabase.auth.verifyOtp({
      email: payload.email,
      token: payload.token,
      type: "email",
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ redirectTo: "/homes" });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not verify sign-in code." },
      { status: 400 },
    );
  }
}

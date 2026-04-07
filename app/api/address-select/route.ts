import { z } from "zod";
import { resolveAddressSuggestion } from "@/lib/services/address";
import { assertWorkspaceApiAccess } from "@/lib/supabase/server";

const inputSchema = z.object({
  selectedId: z.string(),
  label: z.string().optional(),
});

export async function POST(request: Request) {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = inputSchema.parse(await request.json());
    const suggestion = await resolveAddressSuggestion(payload.selectedId, payload.label);

    if (!suggestion) {
      return Response.json({ error: "Address suggestion not found." }, { status: 404 });
    }

    return Response.json({ suggestion });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not resolve address." },
      { status: 400 },
    );
  }
}

import { z } from "zod";
import { searchAddresses } from "@/lib/services/address";
import { assertWorkspaceApiAccess } from "@/lib/supabase/server";

const inputSchema = z.object({
  query: z.string().min(2),
});

export async function POST(request: Request) {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = inputSchema.parse(await request.json());
    const suggestions = await searchAddresses(payload.query);
    return Response.json({ suggestions });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not search addresses." },
      { status: 400 },
    );
  }
}

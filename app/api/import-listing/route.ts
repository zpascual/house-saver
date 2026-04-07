import { z } from "zod";
import { importListingFromUrl } from "@/lib/services/import-listing";
import { recomputeScores } from "@/lib/services/scoring";
import { assertWorkspaceApiAccess } from "@/lib/supabase/server";

const inputSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = inputSchema.parse(await request.json());
    const result = await importListingFromUrl(payload.url);
    await recomputeScores();

    return Response.json({
      homeId: result.home.id,
      warnings: result.warnings,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not import the listing." },
      { status: 400 },
    );
  }
}

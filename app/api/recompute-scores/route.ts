import { recomputeScores } from "@/lib/services/scoring";
import { assertWorkspaceApiAccess } from "@/lib/supabase/server";

export async function POST() {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const result = await recomputeScores();
  return Response.json({
    scoreCount: result.scores.length,
    cacheCount: result.cache.length,
  });
}

import { refreshCrimeSnapshots } from "@/lib/services/police";
import { assertWorkspaceApiAccess, hasValidCronSecret } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const unauthorized = hasValidCronSecret(request)
    ? null
    : await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const result = await refreshCrimeSnapshots();
  return Response.json({
    sourceCount: result.sources.length,
    snapshotCount: result.snapshots.length,
    refreshedAt: new Date().toISOString(),
  });
}

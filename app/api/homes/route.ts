import { getRepository } from "@/lib/data/repository";
import { createManualHome } from "@/lib/services/homes";
import { assertWorkspaceApiAccess } from "@/lib/supabase/server";

export async function GET() {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const data = await getRepository().getDashboardData();
  return Response.json(data.homes);
}

export async function POST() {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const home = await createManualHome();
  return Response.json({ home }, { status: 201 });
}

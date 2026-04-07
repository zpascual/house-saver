import { z } from "zod";
import { getRepository } from "@/lib/data/repository";
import { deleteHome, saveHomePatch } from "@/lib/services/homes";
import { recomputeScores } from "@/lib/services/scoring";
import { assertWorkspaceApiAccess } from "@/lib/supabase/server";

const patchSchema = z.object({
  displayName: z.string().min(1).optional(),
  sourceUrl: z.string().nullable().optional(),
  status: z.enum(["draft", "saved", "favorite", "archived"]).optional(),
  normalizedAddress: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  rent: z.number().nullable().optional(),
  beds: z.number().nullable().optional(),
  baths: z.number().nullable().optional(),
  notes: z.string().optional(),
});

export async function GET(_: Request, context: RouteContext<"/api/homes/[id]">) {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const home = await getRepository().getHome(id);

  if (!home) {
    return Response.json({ error: "Home not found." }, { status: 404 });
  }

  return Response.json(home);
}

export async function PATCH(request: Request, context: RouteContext<"/api/homes/[id]">) {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await context.params;
    const payload = patchSchema.parse(await request.json());
    const home = await saveHomePatch(id, payload);

    if (!home) {
      return Response.json({ error: "Home not found." }, { status: 404 });
    }

    await recomputeScores();

    return Response.json({ home });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update the home." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext<"/api/homes/[id]">) {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const deleted = await deleteHome(id);

  if (!deleted) {
    return Response.json({ error: "Home not found." }, { status: 404 });
  }

  await recomputeScores();

  return Response.json({ deleted: true });
}

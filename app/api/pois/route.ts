import { z } from "zod";
import { createId, getRepository } from "@/lib/data/repository";
import { PointOfInterest } from "@/lib/types";
import { assertWorkspaceApiAccess } from "@/lib/supabase/server";

const poiSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  enabled: z.boolean(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  weight: z.number().min(1).max(10),
  radiusMiles: z.number().min(1).max(100),
  sortOrder: z.number().min(0).max(2),
});

const inputSchema = z.object({
  pois: z.array(poiSchema).max(3),
});

export async function GET() {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  return Response.json(await getRepository().listPois());
}

export async function PUT(request: Request) {
  const unauthorized = await assertWorkspaceApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = inputSchema.parse(await request.json());
    const now = new Date().toISOString();
    const nextPois: PointOfInterest[] = payload.pois.map((poi) => ({
      id: poi.id ?? createId("poi"),
      workspaceId: "workspace-default",
      label: poi.label,
      enabled: poi.enabled,
      address: poi.address,
      city: poi.city,
      state: poi.state,
      zipCode: poi.zipCode,
      latitude: poi.latitude,
      longitude: poi.longitude,
      weight: poi.weight,
      radiusMiles: poi.radiusMiles,
      sortOrder: poi.sortOrder,
      createdAt: now,
      updatedAt: now,
    }));

    await getRepository().replacePois(nextPois);
    return Response.json({ pois: nextPois });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not save points of interest." },
      { status: 400 },
    );
  }
}

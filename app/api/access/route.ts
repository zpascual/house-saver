import { z } from "zod";
import { getRepository } from "@/lib/data/repository";
import { assertWorkspaceOwnerApiAccess } from "@/lib/supabase/server";

const addMemberSchema = z.object({
  email: z.email(),
});

const removeMemberSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  const unauthorized = await assertWorkspaceOwnerApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  return Response.json({ members: await getRepository().listMembers() });
}

export async function POST(request: Request) {
  const unauthorized = await assertWorkspaceOwnerApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = addMemberSchema.parse(await request.json());
    const member = await getRepository().addMember({
      email: payload.email,
      role: "editor",
    });

    return Response.json({
      member,
      members: await getRepository().listMembers(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not add access." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await assertWorkspaceOwnerApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = removeMemberSchema.parse(await request.json());
    const deleted = await getRepository().removeMember(payload.id);

    if (!deleted) {
      return Response.json({ error: "Member not found." }, { status: 404 });
    }

    return Response.json({
      deleted: true,
      members: await getRepository().listMembers(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not remove access." },
      { status: 400 },
    );
  }
}

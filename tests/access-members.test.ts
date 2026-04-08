import { getRepository, resetDemoState } from "@/lib/data/repository";

describe("workspace access management", () => {
  beforeEach(async () => {
    await resetDemoState();
  });

  it("adds a new member by email", async () => {
    const member = await getRepository().addMember({ email: "Friend@Example.com" });
    const members = await getRepository().listMembers();

    expect(member.email).toBe("friend@example.com");
    expect(member.role).toBe("editor");
    expect(members.some((item) => item.email === "friend@example.com")).toBe(true);
  });

  it("prevents removing the workspace owner", async () => {
    const [owner] = await getRepository().listMembers();

    await expect(getRepository().removeMember(owner.id)).rejects.toThrow(
      "Owners cannot be removed from this page.",
    );
  });
});

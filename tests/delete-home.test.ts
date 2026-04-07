import { getRepository, resetDemoState } from "@/lib/data/repository";
import { deleteHome } from "@/lib/services/homes";

describe("deleteHome", () => {
  beforeEach(async () => {
    await resetDemoState();
  });

  it("removes the home and its related imports and scores", async () => {
    const deleted = await deleteHome("home-gilroy-1");
    const homes = await getRepository().listHomes();
    const imports = await getRepository().listImports("home-gilroy-1");
    const scores = await getRepository().listScores();
    const commuteCache = await getRepository().listCommuteCache();

    expect(deleted).toBe(true);
    expect(homes.find((home) => home.id === "home-gilroy-1")).toBeUndefined();
    expect(imports).toHaveLength(0);
    expect(scores.find((score) => score.homeId === "home-gilroy-1")).toBeUndefined();
    expect(commuteCache.find((item) => item.homeId === "home-gilroy-1")).toBeUndefined();
  });
});

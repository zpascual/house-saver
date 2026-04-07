import { resetDemoState, getRepository } from "@/lib/data/repository";
import { recomputeScores } from "@/lib/services/scoring";

describe("recomputeScores", () => {
  beforeEach(async () => {
    await resetDemoState();
  });

  it("assigns a stable rank to each seeded home", async () => {
    const result = await recomputeScores();
    const ranks = result.scores.map((score) => score.overallRank);

    expect(result.scores).toHaveLength(3);
    expect(ranks).toEqual([1, 2, 3]);
    expect(result.cache.length).toBeGreaterThan(0);
  });

  it("stores the computed scores in the repository", async () => {
    await recomputeScores();
    const scores = await getRepository().listScores();

    expect(scores.every((score) => score.breakdown.length > 0)).toBe(true);
  });
});

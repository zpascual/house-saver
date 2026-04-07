import { getRepository, resetDemoState } from "@/lib/data/repository";
import { recomputeScores } from "@/lib/services/scoring";

describe("enabled POIs", () => {
  beforeEach(async () => {
    await resetDemoState();
  });

  it("excludes disabled POIs from score breakdowns", async () => {
    const pois = await getRepository().listPois();
    await getRepository().replacePois(
      pois.map((poi, index) => ({
        ...poi,
        enabled: index === 0,
      })),
    );

    const result = await recomputeScores();

    expect(result.scores).toHaveLength(3);
    expect(result.scores.every((score) => score.breakdown.length > 0)).toBe(true);
    expect(result.scores.every((score) => score.breakdown.length === 1)).toBe(true);
  });
});

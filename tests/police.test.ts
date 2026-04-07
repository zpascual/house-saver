import { coverageForZip } from "@/lib/services/police";
import { createDefaultState } from "@/lib/data/defaults";

describe("coverageForZip", () => {
  it("returns an unavailable placeholder for unsupported ZIP codes", () => {
    const result = coverageForZip("99999", createDefaultState().crimeSources);

    expect(result.coverageStatus).toBe("unavailable");
    expect(result.zipCodes).toContain("99999");
  });
});

import { createDefaultState } from "@/lib/data/defaults";

function toFormStateLikeComponent(
  pois: Array<{ enabled?: boolean; label?: string; address?: string; city?: string; state?: string; zipCode?: string; latitude?: number | null; longitude?: number | null; weight?: number; radiusMiles?: number }>,
) {
  return Array.from({ length: 3 }).map((_, index) => {
    const poi = pois[index];
    return {
      enabled: poi?.enabled ?? false,
      label: poi?.label ?? "",
      address: poi?.address ?? "",
    };
  });
}

describe("POI form defaults", () => {
  it("keeps empty slots disabled by default", () => {
    const state = createDefaultState();
    const form = toFormStateLikeComponent(state.pois);

    expect(form[0].enabled).toBe(true);
    expect(form[1].enabled).toBe(true);
    expect(form[2].enabled).toBe(false);
    expect(form[2].label).toBe("");
    expect(form[2].address).toBe("");
  });
});

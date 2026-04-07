import { getRepository, resetDemoState } from "@/lib/data/repository";
import * as addressService from "@/lib/services/address";
import { saveHomePatch } from "@/lib/services/homes";

describe("saveHomePatch", () => {
  beforeEach(async () => {
    await resetDemoState();
  });

  it("keeps a manual display name after the address changes", async () => {
    await saveHomePatch("home-gilroy-1", { displayName: "Dream spot" });
    await saveHomePatch("home-gilroy-1", {
      streetAddress: "100 New Street",
      city: "Morgan Hill",
    });

    const updated = await getRepository().getHome("home-gilroy-1");

    expect(updated?.displayName).toBe("Dream spot");
    expect(updated?.displayNameIsOverridden).toBe(true);
  });

  it("regenerates the auto name when the address changes and the name was not overridden", async () => {
    await saveHomePatch("home-gilroy-1", {
      streetAddress: "100 New Street",
      city: "Morgan Hill",
    });

    const updated = await getRepository().getHome("home-gilroy-1");

    expect(updated?.displayName).toContain("Morgan Hill");
  });

  it("reverse geocodes blank address fields from coordinates on save", async () => {
    const reverseSpy = vi
      .spyOn(addressService, "reverseGeocodeCoordinates")
      .mockResolvedValue({
        id: "mapbox:37.01235:-121.583449:95020",
        label: "766 First Street, Gilroy, California 95020, United States",
        normalizedAddress: "766 First Street, Gilroy, California 95020, United States",
        streetAddress: "766 First Street",
        city: "Gilroy",
        state: "CA",
        zipCode: "95020",
        latitude: 37.01235,
        longitude: -121.583449,
        provider: "mapbox",
      });

    await saveHomePatch("home-gilroy-1", {
      normalizedAddress: "",
      streetAddress: "",
      city: "",
      state: "CA",
      zipCode: "",
      latitude: 37.01235,
      longitude: -121.583449,
    });

    const updated = await getRepository().getHome("home-gilroy-1");

    expect(reverseSpy).toHaveBeenCalledWith(37.01235, -121.583449);
    expect(updated?.normalizedAddress).toBe(
      "766 First Street, Gilroy, California 95020, United States",
    );
    expect(updated?.streetAddress).toBe("766 First Street");
    expect(updated?.city).toBe("Gilroy");
    expect(updated?.zipCode).toBe("95020");
    expect(updated?.displayName).toContain("Gilroy");
  });
});

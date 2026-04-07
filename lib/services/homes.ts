import { createId, getRepository } from "@/lib/data/repository";
import { Home, HomeWithDetails } from "@/lib/types";
import { reverseGeocodeCoordinates } from "@/lib/services/address";
import { titleFromAddress } from "@/lib/utils";

export function createBlankHome(): Home {
  const now = new Date().toISOString();

  return {
    id: createId("home"),
    workspaceId: "workspace-default",
    displayName: "New rental",
    displayNameIsOverridden: false,
    sourceUrl: null,
    sourceSite: "manual",
    status: "draft",
    normalizedAddress: "",
    streetAddress: "",
    city: "",
    state: "CA",
    zipCode: "",
    latitude: null,
    longitude: null,
    rent: null,
    beds: null,
    baths: null,
    notes: "",
    importedPayload: null,
    overrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

export async function createManualHome() {
  const repository = getRepository();
  const home = createBlankHome();
  await repository.saveHome(home);
  return home;
}

export async function saveHomePatch(
  homeId: string,
  patch: Partial<Home>,
  options?: { preserveImportedValues?: boolean },
) {
  const repository = getRepository();
  const existingHome = await repository.getHome(homeId);

  if (!existingHome) {
    return null;
  }

  const editableFields = [
    "displayName",
    "normalizedAddress",
    "streetAddress",
    "city",
    "state",
    "zipCode",
    "latitude",
    "longitude",
    "rent",
    "beds",
    "baths",
    "notes",
  ] as const;

  const nextHome: Home = {
    ...existingHome,
    ...patch,
    overrides: {
      ...existingHome.overrides,
      ...Object.fromEntries(
        editableFields
          .filter((field) => field in patch)
          .map((field) => [field, true]),
      ),
    },
    updatedAt: new Date().toISOString(),
  };

  const hasAddressText = [
    nextHome.normalizedAddress,
    nextHome.streetAddress,
    nextHome.city,
    nextHome.zipCode,
  ].some((value) => value.trim().length > 0);

  if (!hasAddressText && nextHome.latitude !== null && nextHome.longitude !== null) {
    const suggestion = await reverseGeocodeCoordinates(nextHome.latitude, nextHome.longitude);

    if (suggestion) {
      nextHome.normalizedAddress = suggestion.normalizedAddress;
      nextHome.streetAddress = suggestion.streetAddress;
      nextHome.city = suggestion.city;
      nextHome.state = suggestion.state;
      nextHome.zipCode = suggestion.zipCode;
      nextHome.overrides = {
        ...nextHome.overrides,
        normalizedAddress: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
      };
    }
  }

  if (
    !nextHome.displayNameIsOverridden &&
    (patch.streetAddress || patch.city || (!hasAddressText && nextHome.streetAddress && nextHome.city)) &&
    nextHome.streetAddress &&
    nextHome.city
  ) {
    nextHome.displayName = titleFromAddress(nextHome.city, nextHome.streetAddress);
  }

  if (patch.displayName && patch.displayName !== existingHome.displayName) {
    nextHome.displayNameIsOverridden = true;
  }

  if (options?.preserveImportedValues === false) {
    nextHome.importedPayload = patch.importedPayload ?? existingHome.importedPayload;
  }

  await repository.saveHome(nextHome);
  return nextHome;
}

export async function getHomeOrThrow(homeId: string) {
  const repository = getRepository();
  return repository.getHome(homeId);
}

export async function deleteHome(homeId: string) {
  const repository = getRepository();
  return repository.deleteHome(homeId);
}

export function toEditablePayload(home: HomeWithDetails) {
  return {
    id: home.id,
    displayName: home.displayName,
    sourceUrl: home.sourceUrl,
    sourceSite: home.sourceSite,
    status: home.status,
    normalizedAddress: home.normalizedAddress,
    streetAddress: home.streetAddress,
    city: home.city,
    state: home.state,
    zipCode: home.zipCode,
    latitude: home.latitude,
    longitude: home.longitude,
    rent: home.rent,
    beds: home.beds,
    baths: home.baths,
    notes: home.notes,
  };
}

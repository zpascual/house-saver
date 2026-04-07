import { load } from "cheerio";
import { Home, HomeImport, HomeImportResult, ListingSource } from "@/lib/types";
import { parseMoney, parseNumber, safeJsonParse, titleFromAddress } from "@/lib/utils";
import { createId, getRepository } from "@/lib/data/repository";
import { searchAddresses } from "@/lib/services/address";

function detectSource(url: string): ListingSource {
  const host = new URL(url).hostname;
  if (host.includes("zillow")) return "zillow";
  if (host.includes("redfin")) return "redfin";
  if (host.includes("craigslist")) return "craigslist";
  return "unknown";
}

function readMeta($: ReturnType<typeof load>, key: string) {
  return (
    $(`meta[property="${key}"]`).attr("content") ??
    $(`meta[name="${key}"]`).attr("content") ??
    null
  );
}

function extractJsonLd($: ReturnType<typeof load>) {
  const documents: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    const parsed = safeJsonParse(raw);

    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (item && typeof item === "object") {
          documents.push(item as Record<string, unknown>);
        }
      });
      return;
    }

    if (parsed && typeof parsed === "object") {
      documents.push(parsed as Record<string, unknown>);
    }
  });

  return documents;
}

function findAddressCandidate(documents: Record<string, unknown>[]) {
  for (const document of documents) {
    const address = document.address;
    if (address && typeof address === "object") {
      const street = String((address as Record<string, unknown>).streetAddress ?? "").trim();
      const city = String((address as Record<string, unknown>).addressLocality ?? "").trim();
      const state = String((address as Record<string, unknown>).addressRegion ?? "").trim();
      const zipCode = String((address as Record<string, unknown>).postalCode ?? "").trim();

      if (street && city && state) {
        return {
          streetAddress: street,
          city,
          state,
          zipCode,
          normalizedAddress: `${street}, ${city}, ${state} ${zipCode}`.trim(),
        };
      }
    }
  }

  return null;
}

function findOfferValue(documents: Record<string, unknown>[]) {
  for (const document of documents) {
    const offers = document.offers;

    if (offers && typeof offers === "object") {
      const price = Number((offers as Record<string, unknown>).price ?? NaN);
      if (!Number.isNaN(price)) {
        return price;
      }
    }
  }

  return null;
}

function siteSelectors(source: ListingSource) {
  if (source === "zillow") {
    return {
      price: ["[data-testid='price']", ".ds-summary-row .ds-value"],
      beds: ["[data-testid='bed-bath-beyond']", "span:contains('bd')"],
      baths: ["span:contains('ba')"],
      address: ["h1", "[data-testid='home-details-chip-container'] h1"],
    };
  }

  if (source === "redfin") {
    return {
      price: [".price", "[data-rf-test-id='abp-price']"],
      beds: [".statsValue"],
      baths: [".statsValue"],
      address: ["h1[data-rf-test-id='abp-streetLine']"],
    };
  }

  return {
    price: [".price", "span.price"],
    beds: [".attrgroup .attr.important", "span.attrgroup span"],
    baths: [".attrgroup .attr.important", "span.attrgroup span"],
    address: ["h2.street-address", ".mapaddress", "section#postingbody"],
  };
}

function pickText($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      return text;
    }
  }

  return null;
}

function parseMetricFromText(input: string | null, token: "bd" | "ba") {
  if (!input) {
    return null;
  }

  const aliases =
    token === "bd"
      ? ["bd", "br", "bed", "beds", "bedroom", "bedrooms"]
      : ["ba", "bath", "baths", "bathroom", "bathrooms"];
  const match = input.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${aliases.join("|")})`, "i"),
  );
  return match ? Number(match[1]) : null;
}

function parseAddressText(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const addressMatch = normalized.match(
    /^(.+?),\s*([^,]+?),\s*([A-Z]{2})\s*(\d{5})?$/i,
  );

  if (!addressMatch) {
    return null;
  }

  const [, streetAddress, city, state, zipCode] = addressMatch;

  return {
    normalizedAddress: [streetAddress, city, `${state}${zipCode ? ` ${zipCode}` : ""}`]
      .filter(Boolean)
      .join(", "),
    streetAddress: streetAddress.trim(),
    city: city.trim(),
    state: state.trim().toUpperCase(),
    zipCode: zipCode?.trim() ?? "",
  };
}

function extractCraigslistMetrics($: ReturnType<typeof load>) {
  const metricText =
    $(".attrgroup .attr.important")
      .toArray()
      .map((element) => $(element).text().trim())
      .find((value) => /(br|bd|ba|bath)/i.test(value)) ??
    pickText($, ["span.attrgroup span"]);

  return {
    beds: parseMetricFromText(metricText, "bd") ?? parseNumber(metricText),
    baths: parseMetricFromText(metricText, "ba"),
  };
}

function extractCraigslistAddress($: ReturnType<typeof load>) {
  const visibleAddress =
    parseAddressText($("h2.street-address").first().text()) ??
    parseAddressText(readMeta($, "description")) ??
    parseAddressText(readMeta($, "og:description")) ??
    parseAddressText($(".mapAndAttrs p.mapaddress").first().text());

  if (visibleAddress) {
    return visibleAddress;
  }

  return null;
}

function extractCraigslistCoordinates($: ReturnType<typeof load>) {
  const latitude = parseNumber($("[data-latitude]").first().attr("data-latitude"));
  const longitude = parseNumber($("[data-longitude]").first().attr("data-longitude"));

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function buildHomeFromParsed({
  sourceUrl,
  sourceSite,
  address,
  rent,
  beds,
  baths,
  title,
  coordinates,
}: {
  sourceUrl: string;
  sourceSite: ListingSource;
  address: {
    normalizedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  } | null;
  rent: number | null;
  beds: number | null;
  baths: number | null;
  title: string | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}): Home {
  const now = new Date().toISOString();
  const workspaceId = "workspace-default";

  return {
    id: createId("home"),
    workspaceId,
    displayName: titleFromAddress(address?.city ?? "Unknown", address?.streetAddress ?? title ?? "Rental"),
    displayNameIsOverridden: false,
    sourceUrl,
    sourceSite,
    status: "draft",
    normalizedAddress: address?.normalizedAddress ?? "",
    streetAddress: address?.streetAddress ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "CA",
    zipCode: address?.zipCode ?? "",
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    rent,
    beds,
    baths,
    notes: "",
    importedPayload: null,
    overrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

export async function parseListingHtml(sourceUrl: string, html: string) {
  const sourceSite = detectSource(sourceUrl);
  const $ = load(html);
  const jsonLd = extractJsonLd($);
  const selectors = siteSelectors(sourceSite);
  const warnings: string[] = [];
  const craigslistCoordinates =
    sourceSite === "craigslist" ? extractCraigslistCoordinates($) : null;

  const address =
    (sourceSite === "craigslist" ? extractCraigslistAddress($) : null) ??
    findAddressCandidate(jsonLd) ??
    (() => {
      const fallbackAddress = pickText($, selectors.address);
      if (!fallbackAddress) {
        return null;
      }

      return parseAddressText(fallbackAddress);
    })();

  const title = readMeta($, "og:title") ?? $("title").text().trim() ?? null;
  const price =
    findOfferValue(jsonLd) ??
    parseMoney(readMeta($, "og:price:amount")) ??
    parseMoney(pickText($, selectors.price));
  const craigslistMetrics =
    sourceSite === "craigslist" ? extractCraigslistMetrics($) : null;
  const bedText = pickText($, selectors.beds);
  const bathText = pickText($, selectors.baths) ?? bedText;
  const beds =
    craigslistMetrics?.beds ??
    parseMetricFromText(bedText, "bd") ??
    parseNumber(bedText);
  const baths =
    craigslistMetrics?.baths ??
    parseMetricFromText(bathText, "ba") ??
    parseNumber(bathText);

  if (!address) {
    warnings.push("Could not confidently parse the address from the listing.");
  }
  if (price === null) {
    warnings.push("Price was missing or blocked by the listing page.");
  }

  return {
    sourceSite,
    title,
    address,
    price,
    beds,
    baths,
    coordinates: craigslistCoordinates,
    warnings,
    rawPayload: {
      title,
      address,
      price,
      beds,
      baths,
      coordinates: craigslistCoordinates,
      jsonLdCount: jsonLd.length,
    },
  };
}

export async function importListingFromUrl(sourceUrl: string): Promise<HomeImportResult> {
  const repository = getRepository();
  const sourceSite = detectSource(sourceUrl);
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; HouseSaverBot/1.0; +https://example.com/housesaver)",
    },
    cache: "no-store",
  }).catch(() => null);

  let parsed:
    | Awaited<ReturnType<typeof parseListingHtml>>
    | null = null;
  let errorMessage: string | null = null;

  if (response?.ok) {
    parsed = await parseListingHtml(sourceUrl, await response.text());
  } else {
    errorMessage = response
      ? `Listing fetch returned ${response.status}.`
      : "Listing fetch failed before a response was returned.";
  }

  const home = buildHomeFromParsed({
    sourceUrl,
    sourceSite,
    address: parsed?.address ?? null,
    rent: parsed?.price ?? null,
    beds: parsed?.beds ?? null,
    baths: parsed?.baths ?? null,
    title: parsed?.title ?? null,
    coordinates: parsed?.coordinates ?? null,
  });

  if (home.normalizedAddress && (home.latitude === null || home.longitude === null)) {
    const [candidate] = await searchAddresses(home.normalizedAddress);
    if (candidate) {
      home.normalizedAddress = candidate.normalizedAddress;
      home.streetAddress = candidate.streetAddress;
      home.city = candidate.city;
      home.state = candidate.state;
      home.zipCode = candidate.zipCode;
      home.latitude = candidate.latitude;
      home.longitude = candidate.longitude;
      home.displayName = titleFromAddress(candidate.city, candidate.streetAddress);
    }
  }

  home.importedPayload = parsed?.rawPayload ?? null;

  const importRecord: HomeImport = {
    id: createId("import"),
    homeId: home.id,
    sourceUrl,
    sourceSite,
    status: parsed ? (parsed.warnings.length ? "partial" : "success") : "failed",
    importedAt: new Date().toISOString(),
    summary: parsed
      ? `Imported ${parsed.address ? "address" : "partial metadata"} from ${sourceSite}.`
      : `Import failed for ${sourceSite}.`,
    extractedData: {
      rent: home.rent,
      beds: home.beds,
      baths: home.baths,
      normalizedAddress: home.normalizedAddress,
    },
    rawPayload: parsed?.rawPayload ?? null,
    errorMessage,
  };

  await repository.saveHome(home);
  await repository.saveImport(importRecord);

  return {
    home,
    importRecord,
    warnings: [...(parsed?.warnings ?? []), ...(errorMessage ? [errorMessage] : [])],
  };
}

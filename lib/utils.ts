import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBedsBaths(beds: number | null, baths: number | null) {
  const bedLabel = beds === null ? "?" : beds;
  const bathLabel = baths === null ? "?" : baths;
  return `${bedLabel} bd / ${bathLabel} ba`;
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function titleFromAddress(city: string, street: string) {
  const shortStreet = street
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${city} - ${shortStreet || "Rental"}`;
}

export function parseMoney(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const match = input.replace(/,/g, "").match(/(\d{3,6})/);
  return match ? Number(match[1]) : null;
}

export function parseNumber(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const match = input.match(/(-?\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function haversineMiles(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLon / 2) ** 2 * Math.cos(startLat) * Math.cos(endLat);

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

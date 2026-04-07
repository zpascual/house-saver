import { boolean, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import {
  CrimeSource,
  FieldOverrides,
  HomeImport,
  HomeScorePoiBreakdown,
} from "@/lib/types";

export const workspaces = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const workspaceMembers = pgTable("workspace_member", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull(),
});

export const homes = pgTable("home", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  displayName: text("display_name").notNull(),
  displayNameIsOverridden: boolean("display_name_is_overridden").notNull(),
  sourceUrl: text("source_url"),
  sourceSite: text("source_site").notNull(),
  status: text("status").notNull(),
  normalizedAddress: text("normalized_address").notNull(),
  streetAddress: text("street_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  rent: integer("rent"),
  beds: numeric("beds", { precision: 4, scale: 1 }),
  baths: numeric("baths", { precision: 4, scale: 1 }),
  notes: text("notes").notNull(),
  importedPayload: jsonb("imported_payload"),
  overrides: jsonb("overrides").$type<FieldOverrides>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const homeImports = pgTable("home_import", {
  id: text("id").primaryKey(),
  homeId: text("home_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceSite: text("source_site").notNull(),
  status: text("status").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  extractedData: jsonb("extracted_data").$type<Partial<HomeImport["extractedData"]>>().notNull(),
  rawPayload: jsonb("raw_payload"),
  errorMessage: text("error_message"),
});

export const pois = pgTable("poi", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  weight: integer("weight").notNull(),
  radiusMiles: numeric("radius_miles", { precision: 5, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const homeScores = pgTable("home_score", {
  id: text("id").primaryKey(),
  homeId: text("home_id").notNull(),
  overallScore: numeric("overall_score", { precision: 6, scale: 2 }).notNull(),
  overallRank: integer("overall_rank").notNull(),
  insideRadiusCount: integer("inside_radius_count").notNull(),
  breakdown: jsonb("breakdown").$type<HomeScorePoiBreakdown[]>().notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
});

export const commuteCache = pgTable("commute_cache", {
  id: text("id").primaryKey(),
  homeId: text("home_id").notNull(),
  poiId: text("poi_id").notNull(),
  driveMinutes: numeric("drive_minutes", { precision: 6, scale: 2 }).notNull(),
  roadMiles: numeric("road_miles", { precision: 6, scale: 2 }).notNull(),
  crowMiles: numeric("crow_miles", { precision: 6, scale: 2 }).notNull(),
  source: text("source").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
});

export const crimeSources = pgTable("crime_source", {
  id: text("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  sourceKind: text("source_kind").notNull(),
  coverageStatus: text("coverage_status").notNull(),
  scope: text("scope").notNull(),
  zipCodes: jsonb("zip_codes").$type<CrimeSource["zipCodes"]>().notNull(),
  active: boolean("active").notNull(),
  notes: text("notes").notNull(),
});

export const crimeSnapshots = pgTable("crime_snapshot", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  zipCode: text("zip_code").notNull(),
  coverageStatus: text("coverage_status").notNull(),
  scope: text("scope").notNull(),
  incidentCount: integer("incident_count"),
  recentWindowDays: integer("recent_window_days").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
});

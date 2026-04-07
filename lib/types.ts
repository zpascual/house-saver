export type HomeStatus = "draft" | "saved" | "favorite" | "archived";
export type CoverageStatus = "supported" | "approximate" | "unavailable";
export type CrimeScope = "zip" | "jurisdiction";
export type CrimeSourceKind = "html" | "pdf" | "rss" | "manual";
export type ImportStatus = "success" | "partial" | "failed";
export type ListingSource = "zillow" | "redfin" | "craigslist" | "manual" | "unknown";

export type EditableField =
  | "displayName"
  | "normalizedAddress"
  | "streetAddress"
  | "city"
  | "state"
  | "zipCode"
  | "latitude"
  | "longitude"
  | "rent"
  | "beds"
  | "baths"
  | "notes";

export type FieldOverrides = Partial<Record<EditableField, boolean>>;

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  invitedAt: string;
}

export interface Home {
  id: string;
  workspaceId: string;
  displayName: string;
  displayNameIsOverridden: boolean;
  sourceUrl: string | null;
  sourceSite: ListingSource;
  status: HomeStatus;
  normalizedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  rent: number | null;
  beds: number | null;
  baths: number | null;
  notes: string;
  importedPayload: Record<string, unknown> | null;
  overrides: FieldOverrides;
  createdAt: string;
  updatedAt: string;
}

export interface HomeImport {
  id: string;
  homeId: string;
  sourceUrl: string;
  sourceSite: ListingSource;
  status: ImportStatus;
  importedAt: string;
  summary: string;
  extractedData: Partial<Home>;
  rawPayload: Record<string, unknown> | null;
  errorMessage: string | null;
}

export interface PointOfInterest {
  id: string;
  workspaceId: string;
  label: string;
  enabled: boolean;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  weight: number;
  radiusMiles: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommuteCache {
  id: string;
  homeId: string;
  poiId: string;
  driveMinutes: number;
  roadMiles: number;
  crowMiles: number;
  source: "mapbox" | "openrouteservice" | "estimated";
  computedAt: string;
}

export interface HomeScorePoiBreakdown {
  poiId: string;
  label: string;
  weight: number;
  driveMinutes: number;
  roadMiles: number;
  crowMiles: number;
  isInsideRadius: boolean;
  percentileScore: number;
  source: "mapbox" | "openrouteservice" | "estimated";
}

export interface HomeScore {
  id: string;
  homeId: string;
  overallScore: number;
  overallRank: number;
  insideRadiusCount: number;
  computedAt: string;
  breakdown: HomeScorePoiBreakdown[];
}

export interface CrimeSource {
  id: string;
  sourceName: string;
  sourceUrl: string;
  jurisdiction: string;
  sourceKind: CrimeSourceKind;
  coverageStatus: CoverageStatus;
  scope: CrimeScope;
  zipCodes: string[];
  active: boolean;
  notes: string;
}

export interface CrimeSnapshot {
  id: string;
  sourceId: string;
  zipCode: string;
  coverageStatus: CoverageStatus;
  scope: CrimeScope;
  incidentCount: number | null;
  recentWindowDays: number;
  fetchedAt: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  normalizedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  provider: "mapbox" | "openrouteservice" | "demo";
}

export interface HomeWithDetails extends Home {
  latestImport: HomeImport | null;
  score: HomeScore | null;
  crimeSnapshot: CrimeSnapshot | null;
}

export interface DashboardData {
  workspace: Workspace;
  members: WorkspaceMember[];
  homes: HomeWithDetails[];
  pois: PointOfInterest[];
  scores: HomeScore[];
  crimeSnapshots: CrimeSnapshot[];
  crimeSources: CrimeSource[];
  commuteCache: CommuteCache[];
}

export interface HomeImportResult {
  home: Home;
  importRecord: HomeImport;
  warnings: string[];
}

export interface PoiInput {
  id?: string;
  label: string;
  enabled: boolean;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  weight: number;
  radiusMiles: number;
  sortOrder: number;
}

import fs from "node:fs/promises";
import path from "node:path";
import { asc, desc, eq, sql } from "drizzle-orm";
import { createDefaultState, type AppState } from "@/lib/data/defaults";
import { getDatabase } from "@/lib/data/db";
import {
  commuteCache as commuteCacheTable,
  crimeSnapshots as crimeSnapshotsTable,
  crimeSources as crimeSourcesTable,
  homeImports as homeImportsTable,
  homeScores as homeScoresTable,
  homes as homesTable,
  pois as poisTable,
  workspaceMembers as workspaceMembersTable,
  workspaces,
} from "@/lib/data/schema";
import {
  AddressSuggestion,
  CommuteCache,
  CrimeSnapshot,
  CrimeSource,
  DashboardData,
  Home,
  HomeImport,
  HomeScore,
  HomeWithDetails,
  PointOfInterest,
  Workspace,
  WorkspaceMember,
} from "@/lib/types";

const demoFile = path.join(process.cwd(), ".data", "demo-store.json");
const DEFAULT_OWNER_EMAIL = "zacharympascual@gmail.com";

function normalizePoi(poi: PointOfInterest | (Partial<PointOfInterest> & { id: string })) {
  return {
    ...poi,
    enabled: poi.enabled ?? true,
  } as PointOfInterest;
}

function withHomeDetails(state: AppState): HomeWithDetails[] {
  return state.homes
    .map((home) => ({
      ...home,
      latestImport:
        [...state.homeImports]
          .filter((item) => item.homeId === home.id)
          .sort((left, right) => right.importedAt.localeCompare(left.importedAt))[0] ?? null,
      score: state.scores.find((score) => score.homeId === home.id) ?? null,
      crimeSnapshot:
        state.crimeSnapshots.find((snapshot) => snapshot.zipCode === home.zipCode) ?? null,
    }))
    .sort((left, right) => {
      const leftRank = left.score?.overallRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.score?.overallRank ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.displayName.localeCompare(right.displayName);
    });
}

function sortHomes(homes: HomeWithDetails[]) {
  return [...homes].sort((left, right) => {
    const leftRank = left.score?.overallRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.score?.overallRank ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || left.displayName.localeCompare(right.displayName);
  });
}

async function ensureDemoFile() {
  await fs.mkdir(path.dirname(demoFile), { recursive: true });

  try {
    await fs.access(demoFile);
  } catch {
    await fs.writeFile(demoFile, JSON.stringify(createDefaultState(), null, 2), "utf8");
  }
}

async function readState() {
  await ensureDemoFile();
  const raw = await fs.readFile(demoFile, "utf8");
  return JSON.parse(raw) as AppState;
}

async function writeState(nextState: AppState) {
  await ensureDemoFile();
  await fs.writeFile(demoFile, JSON.stringify(nextState, null, 2), "utf8");
}

export async function resetDemoState() {
  await writeState(createDefaultState());
}

export interface Repository {
  getDashboardData(): Promise<DashboardData>;
  getWorkspace(): Promise<Workspace>;
  listMembers(): Promise<WorkspaceMember[]>;
  addMember(input: {
    email: string;
    role?: WorkspaceMember["role"];
  }): Promise<WorkspaceMember>;
  removeMember(id: string): Promise<boolean>;
  listHomes(): Promise<Home[]>;
  getHome(id: string): Promise<HomeWithDetails | null>;
  saveHome(home: Home): Promise<Home>;
  deleteHome(id: string): Promise<boolean>;
  listImports(homeId?: string): Promise<HomeImport[]>;
  saveImport(homeImport: HomeImport): Promise<HomeImport>;
  listPois(): Promise<PointOfInterest[]>;
  replacePois(pois: PointOfInterest[]): Promise<PointOfInterest[]>;
  listScores(): Promise<HomeScore[]>;
  saveScores(scores: HomeScore[], cache: CommuteCache[]): Promise<void>;
  listCommuteCache(): Promise<CommuteCache[]>;
  listCrimeSources(): Promise<CrimeSource[]>;
  listCrimeSnapshots(): Promise<CrimeSnapshot[]>;
  upsertCrimeData(payload: {
    sources: CrimeSource[];
    snapshots: CrimeSnapshot[];
  }): Promise<void>;
}

function createLocalRepository(): Repository {
  return {
    async getDashboardData() {
      const state = await readState();

      return {
        workspace: state.workspace,
        members: state.members,
        homes: withHomeDetails(state),
        pois: [...state.pois].map(normalizePoi).sort((left, right) => left.sortOrder - right.sortOrder),
        scores: state.scores,
        crimeSnapshots: state.crimeSnapshots,
        crimeSources: state.crimeSources,
        commuteCache: state.commuteCache,
      };
    },
    async getWorkspace() {
      return (await readState()).workspace;
    },
    async listMembers() {
      return (await readState()).members;
    },
    async addMember(input) {
      const state = await readState();
      const email = input.email.trim().toLowerCase();
      const existing = state.members.find((member) => member.email.toLowerCase() === email);

      if (existing) {
        throw new Error("That email already has access.");
      }

      const member: WorkspaceMember = {
        id: createId("member"),
        workspaceId: state.workspace.id,
        email,
        role: input.role ?? "editor",
        invitedAt: new Date().toISOString(),
      };

      state.members.push(member);
      await writeState(state);
      return member;
    },
    async removeMember(id) {
      const state = await readState();
      const member = state.members.find((item) => item.id === id);

      if (!member) {
        return false;
      }

      if (member.role === "owner") {
        throw new Error("Owners cannot be removed from this page.");
      }

      state.members = state.members.filter((item) => item.id !== id);
      await writeState(state);
      return true;
    },
    async listHomes() {
      return (await readState()).homes;
    },
    async getHome(id) {
      const state = await readState();
      return withHomeDetails(state).find((home) => home.id === id) ?? null;
    },
    async saveHome(home) {
      const state = await readState();
      const existingIndex = state.homes.findIndex((item) => item.id === home.id);

      if (existingIndex >= 0) {
        state.homes[existingIndex] = home;
      } else {
        state.homes.push(home);
      }

      await writeState(state);
      return home;
    },
    async deleteHome(id) {
      const state = await readState();
      const existingHomeCount = state.homes.length;

      state.homes = state.homes.filter((home) => home.id !== id);
      state.homeImports = state.homeImports.filter((item) => item.homeId !== id);
      state.scores = state.scores.filter((score) => score.homeId !== id);
      state.commuteCache = state.commuteCache.filter((item) => item.homeId !== id);

      if (state.homes.length === existingHomeCount) {
        return false;
      }

      await writeState(state);
      return true;
    },
    async listImports(homeId) {
      const imports = (await readState()).homeImports;
      if (!homeId) {
        return imports;
      }

      return imports.filter((item) => item.homeId === homeId);
    },
    async saveImport(homeImport) {
      const state = await readState();
      const existingIndex = state.homeImports.findIndex((item) => item.id === homeImport.id);

      if (existingIndex >= 0) {
        state.homeImports[existingIndex] = homeImport;
      } else {
        state.homeImports.push(homeImport);
      }

      await writeState(state);
      return homeImport;
    },
    async listPois() {
      return (await readState()).pois.map(normalizePoi);
    },
    async replacePois(pois) {
      const state = await readState();
      state.pois = pois.map(normalizePoi);
      await writeState(state);
      return state.pois;
    },
    async listScores() {
      return (await readState()).scores;
    },
    async saveScores(scores, cache) {
      const state = await readState();
      state.scores = scores;
      state.commuteCache = cache;
      await writeState(state);
    },
    async listCommuteCache() {
      return (await readState()).commuteCache;
    },
    async listCrimeSources() {
      return (await readState()).crimeSources;
    },
    async listCrimeSnapshots() {
      return (await readState()).crimeSnapshots;
    },
    async upsertCrimeData(payload) {
      const state = await readState();
      state.crimeSources = payload.sources;
      state.crimeSnapshots = payload.snapshots;
      await writeState(state);
    },
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

function toWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    name: row.name,
    createdAt: toIso(row.createdAt),
  };
}

function toMember(row: typeof workspaceMembersTable.$inferSelect): WorkspaceMember {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    email: row.email,
    role: row.role as WorkspaceMember["role"],
    invitedAt: toIso(row.invitedAt),
  };
}

function toHome(row: typeof homesTable.$inferSelect): Home {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    displayName: row.displayName,
    displayNameIsOverridden: row.displayNameIsOverridden,
    sourceUrl: row.sourceUrl,
    sourceSite: row.sourceSite as Home["sourceSite"],
    status: row.status as Home["status"],
    normalizedAddress: row.normalizedAddress,
    streetAddress: row.streetAddress,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    rent: row.rent,
    beds: toNumber(row.beds),
    baths: toNumber(row.baths),
    notes: row.notes,
    importedPayload: row.importedPayload as Record<string, unknown> | null,
    overrides: row.overrides,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toHomeImport(row: typeof homeImportsTable.$inferSelect): HomeImport {
  return {
    id: row.id,
    homeId: row.homeId,
    sourceUrl: row.sourceUrl,
    sourceSite: row.sourceSite as HomeImport["sourceSite"],
    status: row.status as HomeImport["status"],
    importedAt: toIso(row.importedAt),
    summary: row.summary,
    extractedData: row.extractedData as Partial<Home>,
    rawPayload: row.rawPayload as Record<string, unknown> | null,
    errorMessage: row.errorMessage,
  };
}

function toPoi(row: typeof poisTable.$inferSelect): PointOfInterest {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    label: row.label,
    enabled: row.enabled,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    weight: row.weight,
    radiusMiles: toNumber(row.radiusMiles) ?? 0,
    sortOrder: row.sortOrder,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toScore(row: typeof homeScoresTable.$inferSelect): HomeScore {
  return {
    id: row.id,
    homeId: row.homeId,
    overallScore: toNumber(row.overallScore) ?? 0,
    overallRank: row.overallRank,
    insideRadiusCount: row.insideRadiusCount,
    breakdown: row.breakdown,
    computedAt: toIso(row.computedAt),
  };
}

function toCommuteCache(row: typeof commuteCacheTable.$inferSelect): CommuteCache {
  return {
    id: row.id,
    homeId: row.homeId,
    poiId: row.poiId,
    driveMinutes: toNumber(row.driveMinutes) ?? 0,
    roadMiles: toNumber(row.roadMiles) ?? 0,
    crowMiles: toNumber(row.crowMiles) ?? 0,
    source: row.source as CommuteCache["source"],
    computedAt: toIso(row.computedAt),
  };
}

function toCrimeSource(row: typeof crimeSourcesTable.$inferSelect): CrimeSource {
  return {
    id: row.id,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    jurisdiction: row.jurisdiction,
    sourceKind: row.sourceKind as CrimeSource["sourceKind"],
    coverageStatus: row.coverageStatus as CrimeSource["coverageStatus"],
    scope: row.scope as CrimeSource["scope"],
    zipCodes: row.zipCodes,
    active: row.active,
    notes: row.notes,
  };
}

function toCrimeSnapshot(row: typeof crimeSnapshotsTable.$inferSelect): CrimeSnapshot {
  return {
    id: row.id,
    sourceId: row.sourceId,
    zipCode: row.zipCode,
    coverageStatus: row.coverageStatus as CrimeSnapshot["coverageStatus"],
    scope: row.scope as CrimeSnapshot["scope"],
    incidentCount: row.incidentCount,
    recentWindowDays: row.recentWindowDays,
    fetchedAt: toIso(row.fetchedAt),
    summary: row.summary,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
  };
}

function homeRow(home: Home): typeof homesTable.$inferInsert {
  return {
    id: home.id,
    workspaceId: home.workspaceId,
    displayName: home.displayName,
    displayNameIsOverridden: home.displayNameIsOverridden,
    sourceUrl: home.sourceUrl,
    sourceSite: home.sourceSite,
    status: home.status,
    normalizedAddress: home.normalizedAddress,
    streetAddress: home.streetAddress,
    city: home.city,
    state: home.state,
    zipCode: home.zipCode,
    latitude: home.latitude === null ? null : home.latitude.toString(),
    longitude: home.longitude === null ? null : home.longitude.toString(),
    rent: home.rent,
    beds: home.beds === null ? null : home.beds.toString(),
    baths: home.baths === null ? null : home.baths.toString(),
    notes: home.notes,
    importedPayload: home.importedPayload,
    overrides: home.overrides,
    createdAt: new Date(home.createdAt),
    updatedAt: new Date(home.updatedAt),
  };
}

function homeImportRow(homeImport: HomeImport): typeof homeImportsTable.$inferInsert {
  return {
    id: homeImport.id,
    homeId: homeImport.homeId,
    sourceUrl: homeImport.sourceUrl,
    sourceSite: homeImport.sourceSite,
    status: homeImport.status,
    importedAt: new Date(homeImport.importedAt),
    summary: homeImport.summary,
    extractedData: homeImport.extractedData,
    rawPayload: homeImport.rawPayload,
    errorMessage: homeImport.errorMessage,
  };
}

function poiRow(poi: PointOfInterest): typeof poisTable.$inferInsert {
  return {
    id: poi.id,
    workspaceId: poi.workspaceId,
    label: poi.label,
    enabled: poi.enabled,
    address: poi.address,
    city: poi.city,
    state: poi.state,
    zipCode: poi.zipCode,
    latitude: poi.latitude === null ? null : poi.latitude.toString(),
    longitude: poi.longitude === null ? null : poi.longitude.toString(),
    weight: poi.weight,
    radiusMiles: poi.radiusMiles.toString(),
    sortOrder: poi.sortOrder,
    createdAt: new Date(poi.createdAt),
    updatedAt: new Date(poi.updatedAt),
  };
}

function scoreRow(score: HomeScore): typeof homeScoresTable.$inferInsert {
  return {
    id: score.id,
    homeId: score.homeId,
    overallScore: score.overallScore.toString(),
    overallRank: score.overallRank,
    insideRadiusCount: score.insideRadiusCount,
    breakdown: score.breakdown,
    computedAt: new Date(score.computedAt),
  };
}

function commuteRow(item: CommuteCache): typeof commuteCacheTable.$inferInsert {
  return {
    id: item.id,
    homeId: item.homeId,
    poiId: item.poiId,
    driveMinutes: item.driveMinutes.toString(),
    roadMiles: item.roadMiles.toString(),
    crowMiles: item.crowMiles.toString(),
    source: item.source,
    computedAt: new Date(item.computedAt),
  };
}

function crimeSourceRow(source: CrimeSource): typeof crimeSourcesTable.$inferInsert {
  return {
    id: source.id,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    jurisdiction: source.jurisdiction,
    sourceKind: source.sourceKind,
    coverageStatus: source.coverageStatus,
    scope: source.scope,
    zipCodes: source.zipCodes,
    active: source.active,
    notes: source.notes,
  };
}

function crimeSnapshotRow(snapshot: CrimeSnapshot): typeof crimeSnapshotsTable.$inferInsert {
  return {
    id: snapshot.id,
    sourceId: snapshot.sourceId,
    zipCode: snapshot.zipCode,
    coverageStatus: snapshot.coverageStatus,
    scope: snapshot.scope,
    incidentCount: snapshot.incidentCount,
    recentWindowDays: snapshot.recentWindowDays,
    fetchedAt: new Date(snapshot.fetchedAt),
    summary: snapshot.summary,
    sourceName: snapshot.sourceName,
    sourceUrl: snapshot.sourceUrl,
  };
}

function seedMembers(): WorkspaceMember[] {
  const now = new Date().toISOString();
  return [
    {
      id: "member-owner",
      workspaceId: "workspace-default",
      email: DEFAULT_OWNER_EMAIL,
      role: "owner",
      invitedAt: now,
    },
  ];
}

let databaseSeedPromise: Promise<void> | null = null;

async function ensureDatabaseSeeded() {
  const db = getDatabase();
  if (!db) {
    return;
  }

  if (!databaseSeedPromise) {
    databaseSeedPromise = (async () => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaces);

      if (count === 0) {
        const defaultState = createDefaultState();
        const members = seedMembers();

        await db.insert(workspaces).values({
          id: defaultState.workspace.id,
          name: defaultState.workspace.name,
          createdAt: new Date(defaultState.workspace.createdAt),
        });

        if (members.length > 0) {
          await db.insert(workspaceMembersTable).values(
            members.map((member) => ({
              id: member.id,
              workspaceId: member.workspaceId,
              email: member.email,
              role: member.role,
              invitedAt: new Date(member.invitedAt),
            })),
          );
        }

        if (defaultState.homes.length > 0) {
          await db.insert(homesTable).values(defaultState.homes.map(homeRow));
        }
        if (defaultState.homeImports.length > 0) {
          await db.insert(homeImportsTable).values(defaultState.homeImports.map(homeImportRow));
        }
        if (defaultState.pois.length > 0) {
          await db.insert(poisTable).values(defaultState.pois.map(poiRow));
        }
        if (defaultState.scores.length > 0) {
          await db.insert(homeScoresTable).values(defaultState.scores.map(scoreRow));
        }
        if (defaultState.commuteCache.length > 0) {
          await db.insert(commuteCacheTable).values(defaultState.commuteCache.map(commuteRow));
        }
        if (defaultState.crimeSources.length > 0) {
          await db.insert(crimeSourcesTable).values(defaultState.crimeSources.map(crimeSourceRow));
        }
        if (defaultState.crimeSnapshots.length > 0) {
          await db.insert(crimeSnapshotsTable).values(
            defaultState.crimeSnapshots.map(crimeSnapshotRow),
          );
        }
      } else {
        await db
          .insert(workspaceMembersTable)
          .values({
            id: createId("member"),
            workspaceId: "workspace-default",
            email: DEFAULT_OWNER_EMAIL,
            role: "owner",
            invitedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    })();
  }

  await databaseSeedPromise;
}

function createDatabaseRepository(): Repository {
  return {
    async getDashboardData() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;

      const [workspaceRows, memberRows, homeRows, importRows, poiRows, scoreRows, crimeSourceRows, crimeSnapshotRows, commuteRows] =
        await Promise.all([
          db.select().from(workspaces),
          db.select().from(workspaceMembersTable).orderBy(asc(workspaceMembersTable.invitedAt)),
          db.select().from(homesTable),
          db.select().from(homeImportsTable).orderBy(desc(homeImportsTable.importedAt)),
          db.select().from(poisTable).orderBy(asc(poisTable.sortOrder)),
          db.select().from(homeScoresTable),
          db.select().from(crimeSourcesTable),
          db.select().from(crimeSnapshotsTable),
          db.select().from(commuteCacheTable),
        ]);

      const workspace = workspaceRows[0] ? toWorkspace(workspaceRows[0]) : createDefaultState().workspace;
      const members = memberRows.map(toMember);
      const homes = homeRows.map(toHome);
      const imports = importRows.map(toHomeImport);
      const pois = poiRows.map(toPoi);
      const scores = scoreRows.map(toScore);
      const crimeSources = crimeSourceRows.map(toCrimeSource);
      const crimeSnapshots = crimeSnapshotRows.map(toCrimeSnapshot);
      const commuteCache = commuteRows.map(toCommuteCache);

      const homeDetails = sortHomes(
        homes.map((home) => ({
          ...home,
          latestImport:
            imports.filter((item) => item.homeId === home.id).sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0] ??
            null,
          score: scores.find((score) => score.homeId === home.id) ?? null,
          crimeSnapshot: crimeSnapshots.find((snapshot) => snapshot.zipCode === home.zipCode) ?? null,
        })),
      );

      return {
        workspace,
        members,
        homes: homeDetails,
        pois,
        scores,
        crimeSnapshots,
        crimeSources,
        commuteCache,
      };
    },
    async getWorkspace() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const [workspace] = await db.select().from(workspaces).limit(1);
      return workspace ? toWorkspace(workspace) : createDefaultState().workspace;
    },
    async listMembers() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = await db.select().from(workspaceMembersTable).orderBy(asc(workspaceMembersTable.invitedAt));
      return rows.map(toMember);
    },
    async addMember(input) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const email = input.email.trim().toLowerCase();
      const existingRows = await db.select().from(workspaceMembersTable);
      const existing = existingRows.find((member) => member.email.toLowerCase() === email);

      if (existing) {
        throw new Error("That email already has access.");
      }

      const member: WorkspaceMember = {
        id: createId("member"),
        workspaceId: "workspace-default",
        email,
        role: input.role ?? "editor",
        invitedAt: new Date().toISOString(),
      };

      await db.insert(workspaceMembersTable).values({
        id: member.id,
        workspaceId: member.workspaceId,
        email: member.email,
        role: member.role,
        invitedAt: new Date(member.invitedAt),
      });

      return member;
    },
    async removeMember(id) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const [member] = await db
        .select()
        .from(workspaceMembersTable)
        .where(eq(workspaceMembersTable.id, id))
        .limit(1);

      if (!member) {
        return false;
      }

      if (member.role === "owner") {
        throw new Error("Owners cannot be removed from this page.");
      }

      await db.delete(workspaceMembersTable).where(eq(workspaceMembersTable.id, id));
      return true;
    },
    async listHomes() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = await db.select().from(homesTable);
      return rows.map(toHome);
    },
    async getHome(id) {
      const data = await this.getDashboardData();
      return data.homes.find((home) => home.id === id) ?? null;
    },
    async saveHome(home) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      await db.insert(homesTable).values(homeRow(home)).onConflictDoUpdate({
        target: homesTable.id,
        set: {
          workspaceId: home.workspaceId,
          displayName: home.displayName,
          displayNameIsOverridden: home.displayNameIsOverridden,
          sourceUrl: home.sourceUrl,
          sourceSite: home.sourceSite,
          status: home.status,
          normalizedAddress: home.normalizedAddress,
          streetAddress: home.streetAddress,
          city: home.city,
          state: home.state,
          zipCode: home.zipCode,
          latitude: home.latitude === null ? null : home.latitude.toString(),
          longitude: home.longitude === null ? null : home.longitude.toString(),
          rent: home.rent,
          beds: home.beds === null ? null : home.beds.toString(),
          baths: home.baths === null ? null : home.baths.toString(),
          notes: home.notes,
          importedPayload: home.importedPayload,
          overrides: home.overrides,
          updatedAt: new Date(home.updatedAt),
        },
      });
      return home;
    },
    async deleteHome(id) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const deleted = await db.delete(homesTable).where(eq(homesTable.id, id)).returning({ id: homesTable.id });
      return deleted.length > 0;
    },
    async listImports(homeId) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = homeId
        ? await db
            .select()
            .from(homeImportsTable)
            .where(eq(homeImportsTable.homeId, homeId))
            .orderBy(desc(homeImportsTable.importedAt))
        : await db.select().from(homeImportsTable).orderBy(desc(homeImportsTable.importedAt));
      return rows.map(toHomeImport);
    },
    async saveImport(homeImport) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      await db.insert(homeImportsTable).values(homeImportRow(homeImport)).onConflictDoUpdate({
        target: homeImportsTable.id,
        set: {
          homeId: homeImport.homeId,
          sourceUrl: homeImport.sourceUrl,
          sourceSite: homeImport.sourceSite,
          status: homeImport.status,
          importedAt: new Date(homeImport.importedAt),
          summary: homeImport.summary,
          extractedData: homeImport.extractedData,
          rawPayload: homeImport.rawPayload,
          errorMessage: homeImport.errorMessage,
        },
      });
      return homeImport;
    },
    async listPois() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = await db.select().from(poisTable).orderBy(asc(poisTable.sortOrder));
      return rows.map(toPoi);
    },
    async replacePois(pois) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      await db.delete(poisTable).where(eq(poisTable.workspaceId, "workspace-default"));
      if (pois.length > 0) {
        await db.insert(poisTable).values(pois.map(poiRow));
      }
      return pois.map(normalizePoi);
    },
    async listScores() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = await db.select().from(homeScoresTable);
      return rows.map(toScore);
    },
    async saveScores(scores, cache) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      await db.delete(homeScoresTable);
      await db.delete(commuteCacheTable);
      if (scores.length > 0) {
        await db.insert(homeScoresTable).values(scores.map(scoreRow));
      }
      if (cache.length > 0) {
        await db.insert(commuteCacheTable).values(cache.map(commuteRow));
      }
    },
    async listCommuteCache() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = await db.select().from(commuteCacheTable);
      return rows.map(toCommuteCache);
    },
    async listCrimeSources() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = await db.select().from(crimeSourcesTable);
      return rows.map(toCrimeSource);
    },
    async listCrimeSnapshots() {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      const rows = await db.select().from(crimeSnapshotsTable);
      return rows.map(toCrimeSnapshot);
    },
    async upsertCrimeData(payload) {
      await ensureDatabaseSeeded();
      const db = getDatabase()!;
      await db.delete(crimeSnapshotsTable);
      await db.delete(crimeSourcesTable);
      if (payload.sources.length > 0) {
        await db.insert(crimeSourcesTable).values(payload.sources.map(crimeSourceRow));
      }
      if (payload.snapshots.length > 0) {
        await db.insert(crimeSnapshotsTable).values(payload.snapshots.map(crimeSnapshotRow));
      }
    },
  };
}

let repositoryInstance: Repository | null = null;

export function getRepository() {
  if (!repositoryInstance) {
    repositoryInstance = getDatabase() ? createDatabaseRepository() : createLocalRepository();
  }

  return repositoryInstance;
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createSuggestionId(suggestion: Omit<AddressSuggestion, "id">) {
  return `${suggestion.provider}:${suggestion.latitude}:${suggestion.longitude}:${suggestion.zipCode}`;
}

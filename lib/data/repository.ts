import fs from "node:fs/promises";
import path from "node:path";
import { createDefaultState, type AppState } from "@/lib/data/defaults";
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

let repositoryInstance: Repository | null = null;

export function getRepository() {
  if (!repositoryInstance) {
    repositoryInstance = createLocalRepository();
  }

  return repositoryInstance;
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createSuggestionId(suggestion: Omit<AddressSuggestion, "id">) {
  return `${suggestion.provider}:${suggestion.latitude}:${suggestion.longitude}:${suggestion.zipCode}`;
}

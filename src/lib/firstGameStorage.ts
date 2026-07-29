import type { GameState } from "./gameEngine.ts";
import { createInitialGameState, getPlayerSeasonStats, upsertCompletedGame } from "./gameEngine.ts";
import { getVerifiedTeamAccountHeaders, isSameTeamWorkspace, loadActiveTeam, saveActiveTeam, syncActiveTeamToBackend } from "./teamStorage.ts";
import { subscribeBrowserStore } from "./browserStoreSubscription.ts";
import { normalizeStoredGameState } from "./storedGameState.ts";
import type { ActiveTeam } from "@/types/player";

export { normalizeStoredGameState } from "./storedGameState.ts";

const storageKey = "baseball-tracker:first-game-state:v1";
const completedGameHistoryStorageKey = "baseball-tracker:completed-game-history:v1";
const storageEventName = "baseball-tracker:first-game-state-updated";
const serverState = createInitialGameState([]);
const serverCompletedGames: GameState[] = [];
let cachedRaw: string | null | undefined;
let cachedTeamId: string | null | undefined;
let cachedState: GameState | undefined;
let cachedCompletedRaw: string | null | undefined;
let cachedCompletedTeamId: string | null | undefined;
let cachedCompletedGames: GameState[] | undefined;
let hydrateStarted = false;
let prismaSyncQueue = Promise.resolve();

export function loadFirstGameState(): GameState {
  if (typeof window === "undefined") {
    return serverState;
  }

  const raw = window.localStorage.getItem(storageKey);
  const activeTeam = loadActiveTeam();
  const activeTeamId = getActiveTeamId(activeTeam);

  const cachedGameState = getCachedFirstGameState(raw, activeTeamId);

  if (cachedGameState) {
    return cachedGameState;
  }

  return cacheFirstGameState(raw, activeTeamId, getFirstGameStateFromStorage(raw, activeTeam));
}

function getFirstGameStateFromStorage(raw: string | null, activeTeam: ActiveTeam | null) {
  if (!activeTeam) {
    return createInitialGameState([]);
  }

  if (!raw) {
    return createInitialGameState(activeTeam.players);
  }

  return readStoredFirstGameState(raw, activeTeam);
}

export function saveFirstGameState(state: GameState) {
  if (typeof window === "undefined") {
    return;
  }

  if (state.status === "FINAL") {
    upsertCompletedGameHistory(state);
    syncActiveTeamSeasonStatsFromFinalGame(state);
  }

  writeFirstGameState(state);
  queueFirstGamePrismaSync(state);
}

export function resetFirstGameState() {
  if (typeof window === "undefined") {
    return serverState;
  }

  const activeTeam = loadActiveTeam();

  window.localStorage.removeItem(storageKey);
  cachedRaw = null;
  cachedTeamId = getActiveTeamId(activeTeam);
  cachedState = createInitialGameState(getActiveTeamPlayers(activeTeam));
  window.dispatchEvent(new Event(storageEventName));
  queueFirstGamePrismaReset();
  return cachedState;
}

export function prepareFirstGameStateForTeam(
  previousTeam: ActiveTeam | null,
  nextTeam: ActiveTeam,
) {
  if (isSameTeamWorkspace(previousTeam, nextTeam)) {
    return loadFirstGameState();
  }

  const nextState = createInitialGameState(nextTeam.players);
  writeFirstGameState(nextState);
  return nextState;
}

export function subscribeFirstGameState(onStoreChange: () => void) {
  return subscribeBrowserStore(storageEventName, onStoreChange);
}

export function getFirstGameServerSnapshot() {
  return serverState;
}

export function loadCompletedGameStates(): GameState[] {
  if (typeof window === "undefined") {
    return serverCompletedGames;
  }

  const raw = window.localStorage.getItem(completedGameHistoryStorageKey);
  const activeTeam = loadActiveTeam();
  const activeTeamId = getActiveTeamId(activeTeam);

  const cachedGames = getCachedCompletedGameStates(raw, activeTeamId);

  if (cachedGames) {
    return cachedGames;
  }

  return cacheCompletedGameStates(raw, activeTeamId, getCompletedGameStatesFromStorage(raw, activeTeam));
}

function getCompletedGameStatesFromStorage(raw: string | null, activeTeam: ActiveTeam | null) {
  if (!activeTeam) {
    return [];
  }

  const fallbackGames = getFallbackCompletedGames();

  if (!raw) {
    return fallbackGames;
  }

  return readStoredCompletedGameStates(raw, activeTeam, fallbackGames);
}

function getFallbackCompletedGames() {
  const fallbackActiveGame = loadFirstGameState();

  return fallbackActiveGame.status === "FINAL" ? [fallbackActiveGame] : [];
}

function upsertCompletedGameHistory(state: GameState) {
  if (typeof window === "undefined" || state.status !== "FINAL") {
    return;
  }

  writeCompletedGameStates(upsertCompletedGame(loadCompletedGameStates(), state));
}

export function subscribeCompletedGameStates(onStoreChange: () => void) {
  return subscribeFirstGameState(onStoreChange);
}

export function getCompletedGameStatesServerSnapshot() {
  return serverCompletedGames;
}

export async function hydrateFirstGameStateFromPrisma(options: { force?: boolean } = {}) {
  if (!canHydrateFirstGameState(options.force === true)) {
    return;
  }

  hydrateStarted = true;
  const hydrationRequest = createFirstGameHydrationRequest();

  // Publish a team-normalized local snapshot before navigation can react to an
  // in-progress game left behind by a different team.
  writeFirstGameState(loadFirstGameState());

  await hydrateFirstGameStateFromRemote(hydrationRequest);
}

function canHydrateFirstGameState(force: boolean) {
  if (typeof window === "undefined") {
    return false;
  }

  if (!hydrateStarted) {
    return true;
  }

  return force;
}

async function hydrateFirstGameStateFromRemote(hydrationRequest: FirstGameHydrationRequest) {
  try {
    const payload = await fetchFirstGameHydrationPayload(hydrationRequest.query);

    if (!payload) {
      return;
    }

    const latestActiveTeam = loadActiveTeam();

    if (!isHydrationRequestStillCurrent(hydrationRequest, latestActiveTeam)) {
      return;
    }

    applyHydratedFirstGameState(getHydratedRemoteState(payload), latestActiveTeam);
  } catch {
    // Local scoring stays available when Prisma is not configured.
  }
}

type FirstGameHydrationRequest = {
  query: string;
  requestedOwnerUid: string | null;
  requestedTeamId: string | null;
};

type FirstGameHydrationPayload = {
  state?: GameState | null;
};

function getHydratedRemoteState(payload: FirstGameHydrationPayload) {
  if (!payload.state) {
    return null;
  }

  return payload.state;
}

function createFirstGameHydrationRequest(): FirstGameHydrationRequest {
  const activeTeam = loadActiveTeam();
  const requestedTeamId = getActiveTeamId(activeTeam);

  return {
    query: requestedTeamId ? `?teamId=${encodeURIComponent(requestedTeamId)}` : "",
    requestedOwnerUid: getActiveTeamOwnerUid(activeTeam),
    requestedTeamId,
  };
}

async function fetchFirstGameHydrationPayload(query: string): Promise<FirstGameHydrationPayload | null> {
  const response = await fetch(`/api/first-game${query}`, {
    cache: "no-store",
    headers: await getVerifiedTeamAccountHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<FirstGameHydrationPayload>;
}

function isHydrationRequestStillCurrent(
  hydrationRequest: FirstGameHydrationRequest,
  latestActiveTeam: ActiveTeam | null,
) {
  const latestTeamId = getActiveTeamId(latestActiveTeam);
  const latestOwnerUid = getActiveTeamOwnerUid(latestActiveTeam);

  return latestTeamId === hydrationRequest.requestedTeamId && latestOwnerUid === hydrationRequest.requestedOwnerUid;
}

function applyHydratedFirstGameState(remoteState: GameState | null, latestActiveTeam: ActiveTeam | null) {
  const localState = loadFirstGameState();

  if (!remoteState) {
    applyEmptyRemoteFirstGameState(localState, latestActiveTeam);
    return;
  }

  const normalizedRemoteState = normalizeStoredGameState(
    remoteState,
    getActiveTeamPlayers(latestActiveTeam, remoteState.lineup),
  );

  if (shouldKeepLocalGameState(localState, normalizedRemoteState)) {
    queueLocalFinalStateSyncIfNeeded(localState, normalizedRemoteState);
    return;
  }

  writeHydratedRemoteState(normalizedRemoteState);
}

function applyEmptyRemoteFirstGameState(localState: GameState, latestActiveTeam: ActiveTeam | null) {
  if (shouldKeepLocalGameState(localState, null)) {
    queueLocalFinalStateSyncIfNeeded(localState, null);
    return;
  }

  writeFirstGameState(createInitialGameState(getActiveTeamPlayers(latestActiveTeam)));
}

function queueLocalFinalStateSyncIfNeeded(localState: GameState, remoteState: GameState | null) {
  if (localState.status === "FINAL" && remoteState?.status !== "FINAL") {
    queueFirstGamePrismaSync(localState);
  }
}

function writeHydratedRemoteState(normalizedRemoteState: GameState) {
  writeFirstGameState(normalizedRemoteState);

  if (normalizedRemoteState.status === "FINAL") {
    upsertCompletedGameHistory(normalizedRemoteState);
    syncActiveTeamSeasonStatsFromFinalGame(normalizedRemoteState);
  }
}

function getCachedFirstGameState(raw: string | null, activeTeamId: string | null) {
  return raw === cachedRaw && activeTeamId === cachedTeamId
    ? cachedState ?? null
    : null;
}

function cacheFirstGameState(raw: string | null, activeTeamId: string | null, state: GameState) {
  cachedRaw = raw;
  cachedTeamId = activeTeamId;
  cachedState = state;
  return state;
}

function getCachedCompletedGameStates(raw: string | null, activeTeamId: string | null) {
  return raw === cachedCompletedRaw && activeTeamId === cachedCompletedTeamId
    ? cachedCompletedGames ?? null
    : null;
}

function cacheCompletedGameStates(raw: string | null, activeTeamId: string | null, games: GameState[]) {
  cachedCompletedRaw = raw;
  cachedCompletedTeamId = activeTeamId;
  cachedCompletedGames = games;
  return games;
}

function readStoredFirstGameState(raw: string, activeTeam: ActiveTeam) {
  const parsedState = parseStoredFirstGameState(raw);

  if (!parsedState) {
    return createInitialGameState(activeTeam.players);
  }

  return normalizeStoredGameState(parsedState, activeTeam.players);
}

function parseStoredFirstGameState(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as GameState;
    return isStoredGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isStoredGameState(state: Partial<GameState>) {
  return Array.isArray(state.lineup) && Boolean(state.statsByPlayerId);
}

function readStoredCompletedGameStates(
  raw: string,
  activeTeam: ActiveTeam,
  fallbackGames: GameState[],
) {
  const parsedGames = parseStoredCompletedGameStates(raw);

  if (!parsedGames) {
    return fallbackGames;
  }

  return parsedGames
    .map((game) => normalizeStoredGameState(game, activeTeam.players))
    .filter((game) => game.status === "FINAL");
}

function parseStoredCompletedGameStates(raw: string): GameState[] | null {
  try {
    const parsed = JSON.parse(raw) as GameState[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function syncActiveTeamSeasonStatsFromFinalGame(state: GameState) {
  if (typeof window === "undefined" || state.status !== "FINAL") {
    return;
  }

  const activeTeam = loadActiveTeam();

  if (!activeTeam) {
    return;
  }

  const lineupPlayerIds = new Set(state.lineup.map((player) => player.id));
  const nextPlayers = activeTeam.players.map((player) => {
    if (!lineupPlayerIds.has(player.id)) {
      return player;
    }

    return {
      ...player,
      seasonStats: getPlayerSeasonStats(player, state),
    };
  });
  const nextTeam = {
    ...activeTeam,
    players: nextPlayers,
    updatedAt: new Date().toISOString(),
  };

  saveActiveTeam(nextTeam);
  syncActiveTeamToBackend(nextTeam);
}

export function shouldKeepLocalGameState(localState: GameState, remoteState: GameState | null) {
  if (!localState.lineup.length) {
    return false;
  }

  const localStateDecision: Record<GameState["status"], () => boolean> = {
    FINAL: () => shouldKeepFinalLocalGame(localState, remoteState),
    IN_PROGRESS: () => shouldKeepInProgressLocalGame(localState, remoteState),
    PREGAME: () => false,
  };

  return localStateDecision[localState.status]?.() ?? false;
}

function shouldKeepFinalLocalGame(localState: GameState, remoteState: GameState | null) {
  return remoteState?.status !== "FINAL" || getSavedActionCount(localState) >= getSavedActionCount(remoteState);
}

function shouldKeepInProgressLocalGame(localState: GameState, remoteState: GameState | null) {
  if (!remoteState || remoteState.status === "PREGAME") {
    return true;
  }

  return remoteState.status === "FINAL"
    ? isRemoteFinalOlderThanLocalGame(localState, remoteState)
    : getSavedActionCount(remoteState) <= getSavedActionCount(localState);
}

function isRemoteFinalOlderThanLocalGame(localState: GameState, remoteState: GameState) {
  const localStartedAt = localState.defensiveAlignments
    .map((alignment) => Date.parse(alignment.updatedAt))
    .filter(Number.isFinite)
    .sort((first, second) => first - second)[0];
  const remoteEndedAt = remoteState.endedAt ? Date.parse(remoteState.endedAt) : Number.NaN;

  if (Number.isFinite(localStartedAt) && Number.isFinite(remoteEndedAt)) {
    return remoteEndedAt <= localStartedAt;
  }

  return getSavedActionCount(remoteState) < getSavedActionCount(localState);
}

function writeFirstGameState(state: GameState) {
  const raw = JSON.stringify(state);

  cachedRaw = raw;
  cachedTeamId = getActiveTeamId(loadActiveTeam());
  cachedState = state;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

function writeCompletedGameStates(games: GameState[]) {
  const raw = JSON.stringify(games);

  cachedCompletedRaw = raw;
  cachedCompletedTeamId = getActiveTeamId(loadActiveTeam());
  cachedCompletedGames = games;
  window.localStorage.setItem(completedGameHistoryStorageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

function queueFirstGamePrismaSync(state: GameState) {
  const activeTeam = loadActiveTeam();

  prismaSyncQueue = prismaSyncQueue
    .catch(() => undefined)
    .then(() => syncFirstGameStateToPrisma(state, activeTeam))
    .then(() => undefined)
    .catch(() => {
      // Keep the local game usable if DATABASE_URL or the network is unavailable.
    });
}

async function syncFirstGameStateToPrisma(state: GameState, activeTeam: ActiveTeam | null) {
  for (const retryDelay of getPrismaSyncRetryDelays(state)) {
    const didSync = await tryPostFirstGameStateToPrisma(state, activeTeam);

    if (didSync) {
      return;
    }

    if (retryDelay > 0) {
      await waitForRetry(retryDelay);
    }
  }

  throw new Error("Unable to sync game state.");
}

function getPrismaSyncRetryDelays(state: GameState) {
  return state.status === "FINAL" ? [2_000, 0] : [0];
}

async function tryPostFirstGameStateToPrisma(state: GameState, activeTeam: ActiveTeam | null) {
  try {
    const response = await fetch("/api/first-game", {
      method: "POST",
      headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ state, team: activeTeam }),
    });

    return response.ok;
  } catch {
    // A final state gets one short retry and remains authoritative locally until it syncs.
    return false;
  }
}

function waitForRetry(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function queueFirstGamePrismaReset() {
  const activeTeam = loadActiveTeam();
  const activeTeamId = getActiveTeamId(activeTeam);
  const query = activeTeamId ? `?teamId=${encodeURIComponent(activeTeamId)}` : "";

  prismaSyncQueue = prismaSyncQueue
    .catch(() => undefined)
    .then(async () => fetch(`/api/first-game${query}`, {
      method: "DELETE",
      headers: await getVerifiedTeamAccountHeaders(),
    }))
    .then(() => undefined)
    .catch(() => {
      // Reset local state even if Prisma is unavailable.
    });
}

function getActiveTeamId(activeTeam: ActiveTeam | null) {
  if (!activeTeam) {
    return null;
  }

  return activeTeam.id;
}

function getActiveTeamOwnerUid(activeTeam: ActiveTeam | null) {
  if (!activeTeam) {
    return null;
  }

  return activeTeam.ownerUid ?? null;
}

function getActiveTeamPlayers(
  activeTeam: ActiveTeam | null,
  fallback: GameState["lineup"] = [],
) {
  if (!activeTeam) {
    return fallback;
  }

  return activeTeam.players;
}

function getSavedActionCount(state: GameState) {
  return state.plays.length + (Array.isArray(state.defensiveEvents) ? state.defensiveEvents.length : 0);
}

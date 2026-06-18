import type { GameState } from "./gameEngine.ts";
import { createInitialGameState, upsertCompletedGame } from "./gameEngine.ts";
import { defensivePositions, normalizeDefensiveAlignment } from "./defenseEngine.ts";
import { normalizeGameRules } from "./gameRules.ts";
import { getTeamAccountHeaders, loadActiveTeam } from "./teamStorage.ts";

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
  const activeTeamId = activeTeam?.id ?? null;

  if (raw === cachedRaw && activeTeamId === cachedTeamId && cachedState) {
    return cachedState;
  }

  if (!activeTeam) {
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedState = createInitialGameState([]);
    return cachedState;
  }

  if (!raw) {
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedState = createInitialGameState(activeTeam.players);
    return cachedState;
  }

  try {
    const parsed = JSON.parse(raw) as GameState;

    if (!Array.isArray(parsed.lineup) || !parsed.statsByPlayerId) {
      cachedRaw = raw;
      cachedTeamId = activeTeamId;
      cachedState = createInitialGameState(activeTeam.players);
      return cachedState;
    }

    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedState = normalizeStoredGameState(parsed, activeTeam.players);
    return cachedState;
  } catch {
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedState = createInitialGameState(activeTeam.players);
    return cachedState;
  }
}

export function saveFirstGameState(state: GameState) {
  if (typeof window === "undefined") {
    return;
  }

  if (state.status === "FINAL") {
    upsertCompletedGameHistory(state);
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
  cachedTeamId = activeTeam?.id ?? null;
  cachedState = createInitialGameState(activeTeam?.players ?? []);
  window.dispatchEvent(new Event(storageEventName));
  queueFirstGamePrismaReset();
  return cachedState;
}

export function subscribeFirstGameState(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(storageEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(storageEventName, onStoreChange);
  };
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
  const activeTeamId = activeTeam?.id ?? null;

  if (raw === cachedCompletedRaw && activeTeamId === cachedCompletedTeamId && cachedCompletedGames) {
    return cachedCompletedGames;
  }

  if (!activeTeam) {
    cachedCompletedRaw = raw;
    cachedCompletedTeamId = activeTeamId;
    cachedCompletedGames = [];
    return cachedCompletedGames;
  }

  const fallbackActiveGame = loadFirstGameState();
  const fallbackGames = fallbackActiveGame.status === "FINAL" ? [fallbackActiveGame] : [];

  if (!raw) {
    cachedCompletedRaw = raw;
    cachedCompletedTeamId = activeTeamId;
    cachedCompletedGames = fallbackGames;
    return cachedCompletedGames;
  }

  try {
    const parsed = JSON.parse(raw) as GameState[];

    if (!Array.isArray(parsed)) {
      cachedCompletedRaw = raw;
      cachedCompletedTeamId = activeTeamId;
      cachedCompletedGames = fallbackGames;
      return cachedCompletedGames;
    }

    cachedCompletedRaw = raw;
    cachedCompletedTeamId = activeTeamId;
    cachedCompletedGames = parsed
      .map((game) => normalizeStoredGameState(game, activeTeam.players))
      .filter((game) => game.status === "FINAL");
    return cachedCompletedGames;
  } catch {
    cachedCompletedRaw = raw;
    cachedCompletedTeamId = activeTeamId;
    cachedCompletedGames = fallbackGames;
    return cachedCompletedGames;
  }
}

export function upsertCompletedGameHistory(state: GameState) {
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

export function hydrateFirstGameStateFromPrisma(options: { force?: boolean } = {}) {
  if (typeof window === "undefined" || (hydrateStarted && !options.force)) {
    return;
  }

  hydrateStarted = true;
  const activeTeam = loadActiveTeam();
  const query = activeTeam?.id ? `?teamId=${encodeURIComponent(activeTeam.id)}` : "";

  fetch(`/api/first-game${query}`, {
    cache: "no-store",
    headers: getTeamAccountHeaders(),
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      return (await response.json()) as { state?: GameState | null };
    })
    .then((payload) => {
      const latestActiveTeam = loadActiveTeam();
      const localState = loadFirstGameState();

      if (!payload?.state) {
        if (shouldKeepLocalGameState(localState, null)) {
          return;
        }

        writeFirstGameState(createInitialGameState(latestActiveTeam?.players ?? []));
        return;
      }

      const normalizedRemoteState = normalizeStoredGameState(
        payload.state,
        latestActiveTeam?.players ?? payload.state.lineup,
      );

      if (shouldKeepLocalGameState(localState, normalizedRemoteState)) {
        return;
      }

      writeFirstGameState(normalizedRemoteState);

      if (normalizedRemoteState.status === "FINAL") {
        upsertCompletedGameHistory(normalizedRemoteState);
      }
    })
    .catch(() => {
      // Local scoring stays available when Prisma is not configured.
    });
}

export function shouldKeepLocalGameState(localState: GameState, remoteState: GameState | null) {
  if (localState.status !== "IN_PROGRESS" || !localState.lineup.length) {
    return false;
  }

  if (!remoteState || remoteState.status === "PREGAME") {
    return true;
  }

  if (remoteState.status === "FINAL") {
    return isRemoteFinalOlderThanLocalGame(localState, remoteState);
  }

  return getSavedActionCount(remoteState) <= getSavedActionCount(localState);
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
  cachedTeamId = loadActiveTeam()?.id ?? null;
  cachedState = state;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

function writeCompletedGameStates(games: GameState[]) {
  const raw = JSON.stringify(games);

  cachedCompletedRaw = raw;
  cachedCompletedTeamId = loadActiveTeam()?.id ?? null;
  cachedCompletedGames = games;
  window.localStorage.setItem(completedGameHistoryStorageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

function queueFirstGamePrismaSync(state: GameState) {
  const activeTeam = loadActiveTeam();

  prismaSyncQueue = prismaSyncQueue
    .catch(() => undefined)
    .then(() => fetch("/api/first-game", {
      method: "POST",
      headers: getTeamAccountHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        state,
        team: activeTeam,
      }),
    }))
    .then(() => undefined)
    .catch(() => {
      // Keep the local game usable if DATABASE_URL or the network is unavailable.
    });
}

function queueFirstGamePrismaReset() {
  const activeTeam = loadActiveTeam();
  const query = activeTeam?.id ? `?teamId=${encodeURIComponent(activeTeam.id)}` : "";

  prismaSyncQueue = prismaSyncQueue
    .catch(() => undefined)
    .then(() => fetch(`/api/first-game${query}`, {
      method: "DELETE",
      headers: getTeamAccountHeaders(),
    }))
    .then(() => undefined)
    .catch(() => {
      // Reset local state even if Prisma is unavailable.
    });
}

export function normalizeStoredGameState(
  state: GameState,
  activePlayers: GameState["lineup"],
): GameState {
  const activePlayerIds = new Set(activePlayers.map((player) => player.id));
  const stateUsesActiveTeam = state.lineup.some((player) => activePlayerIds.has(player.id));

  if (!stateUsesActiveTeam) {
    return createInitialGameState(activePlayers);
  }

  const defensiveAlignments = Array.isArray(state.defensiveAlignments)
    ? state.defensiveAlignments.map((alignment) => normalizeDefensiveAlignment(alignment, state.lineup))
    : [];
  const firstPitcherSlot = defensiveAlignments
    .find((alignment) => alignment.slots.P?.status === "ASSIGNED")
    ?.slots.P;
  const inferredPitcherPlayerId = firstPitcherSlot?.status === "ASSIGNED"
    ? firstPitcherSlot.playerId
    : null;

  return {
    ...state,
    lineup: state.lineup.map((player) => {
      const activePlayer = activePlayers.find((item) => item.id === player.id);

      return activePlayer
        ? {
            ...activePlayer,
            seasonStats: player.seasonStats,
          }
        : player;
    }),
    status: state.status ?? "PREGAME",
    endedAt: state.endedAt ?? null,
    opponent: state.opponent ?? "Opponent",
    isHome: state.isHome ?? false,
    defensiveAlignments,
    defensiveEvents: Array.isArray(state.defensiveEvents)
      ? state.defensiveEvents.filter((event) => (
        !event.position || defensivePositions.includes(event.position)
      ))
      : [],
    lockedPitcherPlayerId: state.lockedPitcherPlayerId ?? inferredPitcherPlayerId,
    gameRules: normalizeGameRules(state.gameRules),
  };
}

function getSavedActionCount(state: GameState) {
  return state.plays.length + (Array.isArray(state.defensiveEvents) ? state.defensiveEvents.length : 0);
}

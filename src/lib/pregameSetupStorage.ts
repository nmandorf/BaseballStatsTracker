"use client";

import { useSyncExternalStore } from "react";
import type { ActiveTeam } from "@/types/player";
import type { Player } from "@/types/player";
import type { GameRules } from "@/types/game";
import type { DefensiveAlignment } from "@/types/defense";
import type { GameState } from "./gameEngine.ts";
import { getPlayerSeasonStats } from "./gameEngine.ts";
import { normalizeGameRules } from "./gameRules.ts";
import { isLineupGenderOptimized, recommendBattingOrder, validateLineupGenderRules, validateLineupPlayerPool } from "./lineupRules.ts";
import { defaultGameRules } from "./seedTeam.ts";
import { getVerifiedTeamAccountHeaders, loadActiveTeam } from "./teamStorage.ts";
import { loadSelectedScheduledGameId, saveSelectedScheduledGameId, subscribeSelectedScheduledGame } from "./scheduleClient.ts";
import type { ScheduleWeek } from "@/types/schedule";

export type LineupSizeOption = "9" | "10" | "11" | "Everyone";
export type PregameSetupStatus = "SETUP" | "GENERATED" | "ACCEPTED" | "STARTED";

export type PregameSetup = {
  gameId: string | null;
  opponent: string;
  isHome: boolean;
  lineupSize: LineupSizeOption;
  selectedPlayerIds: string[];
  generatedLineupIds: string[];
  acceptedLineupIds: string[];
  gameRules: GameRules;
  startingDefense: DefensiveAlignment | null;
  status: PregameSetupStatus;
  updatedAt: string | null;
};

export type SuggestedLineupResolution = {
  lineupIds: string[];
  canGenerate: boolean;
  emptyReason: string | null;
  warnings: string[];
};

const storageKey = "baseball-tracker:pregame-setup-by-game:v2";
const storageEventName = "baseball-tracker:pregame-setup-updated";

const defaultSetup: PregameSetup = {
  gameId: null,
  opponent: "Rebels",
  isHome: true,
  lineupSize: "10",
  selectedPlayerIds: [],
  generatedLineupIds: [],
  acceptedLineupIds: [],
  gameRules: defaultGameRules,
  startingDefense: null,
  status: "SETUP",
  updatedAt: null,
};

let cachedRaw: string | null | undefined;
let cachedTeamId: string | null | undefined;
let cachedGameId: string | null | undefined;
let cachedSetup: PregameSetup | undefined;
let preparationSyncQueue = Promise.resolve();

export function createDefaultPregameSetup(activeTeam?: ActiveTeam | null): PregameSetup {
  const activePlayers = activeTeam?.players.filter((player) => player.isActive).map((player) => player.id) ?? [];

  return {
    ...defaultSetup,
    selectedPlayerIds: activePlayers,
    generatedLineupIds: [...defaultSetup.generatedLineupIds],
    acceptedLineupIds: [...defaultSetup.acceptedLineupIds],
    gameRules: { ...defaultGameRules },
    startingDefense: null,
  };
}

export function loadPregameSetup(): PregameSetup {
  if (typeof window === "undefined") {
    return createDefaultPregameSetup();
  }

  const raw = window.localStorage.getItem(storageKey);
  const activeTeam = loadActiveTeam();
  const activeTeamId = activeTeam?.id ?? null;
  const selectedGameId = activeTeamId ? loadSelectedScheduledGameId(activeTeamId) : null;

  if (raw === cachedRaw && activeTeamId === cachedTeamId && selectedGameId === cachedGameId && cachedSetup) {
    return cachedSetup;
  }

  if (!raw) {
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedGameId = selectedGameId;
    cachedSetup = createDefaultPregameSetup(activeTeam ?? undefined);
    return cachedSetup;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, PregameSetup>;
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedGameId = selectedGameId;
    const storedSetup = selectedGameId ? parsed[selectedGameId] ?? { gameId: selectedGameId } : parsed.unscheduled ?? {};
    cachedSetup = normalizePregameSetup(storedSetup, activeTeam ?? undefined);
    return cachedSetup;
  } catch {
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedGameId = selectedGameId;
    cachedSetup = createDefaultPregameSetup(activeTeam ?? undefined);
    return cachedSetup;
  }
}

export function savePregameSetup(setup: PregameSetup, options: { sync?: boolean } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const nextSetup = normalizePregameSetup({
    ...setup,
    updatedAt: new Date().toISOString(),
  }, loadActiveTeam() ?? undefined);
  let setups: Record<string, PregameSetup> = {};
  try { setups = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}"); } catch { /* replace malformed storage */ }
  const gameKey = nextSetup.gameId ?? "unscheduled";
  const raw = JSON.stringify({ ...setups, [gameKey]: nextSetup });

  cachedRaw = raw;
  cachedTeamId = loadActiveTeam()?.id ?? null;
  cachedGameId = nextSetup.gameId;
  cachedSetup = nextSetup;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));

  if (options.sync !== false && nextSetup.gameId && nextSetup.status !== "STARTED") {
    preparationSyncQueue = preparationSyncQueue
      .catch(() => undefined)
      .then(async () => fetch(`/api/games/${encodeURIComponent(nextSetup.gameId!)}/preparation`, {
        method: "PUT",
        headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(nextSetup),
      }))
      .then(() => undefined)
      .catch(() => {
        // Keep the game-scoped local preparation available; start still requires server confirmation.
      });
  }
}

export function subscribePregameSetup(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(storageEventName, onStoreChange);
  const unsubscribeSelectedGame = subscribeSelectedScheduledGame(onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(storageEventName, onStoreChange);
    unsubscribeSelectedGame();
  };
}

export function selectScheduledGameForPregame(teamId: string, game: Extract<ScheduleWeek, { kind: "GAME" }>, activeTeam?: ActiveTeam | null) {
  saveSelectedScheduledGameId(teamId, game.gameId);
  const existing = loadPregameSetup();
  const setup = existing.gameId === game.gameId ? existing : createDefaultPregameSetup(activeTeam);
  savePregameSetup({
    ...setup,
    gameId: game.gameId,
    opponent: game.opponent,
    isHome: game.isHome,
    status: game.preparationStatus === "ACCEPTED" ? "ACCEPTED" : game.preparationStatus === "GENERATED" ? "GENERATED" : "SETUP",
  }, { sync: false });

  void getVerifiedTeamAccountHeaders().then((headers) => fetch(`/api/games/${encodeURIComponent(game.gameId)}/preparation`, {
    cache: "no-store",
    headers,
  })).then(async (response) => {
    if (!response.ok) return;
    const payload = await response.json() as { preparation?: PregameSetup };
    if (payload.preparation?.gameId === game.gameId) savePregameSetup(payload.preparation);
  }).catch(() => {
    // The game-scoped local copy remains available; starting still requires the backend.
  });
}

export function getPregameSetupServerSnapshot() {
  return createDefaultPregameSetup();
}

export function usePregameSetup() {
  return useSyncExternalStore(
    subscribePregameSetup,
    loadPregameSetup,
    getPregameSetupServerSnapshot,
  );
}

export async function flushPregameSetupSync() {
  await preparationSyncQueue.catch(() => undefined);
}

export function buildPregamePlayerPool(setup: PregameSetup, state: GameState, activeTeam: ActiveTeam | null): Player[] {
  const playersById = new Map(
    buildRosterWithStats(state, activeTeam?.players.filter((player) => player.isActive) ?? []).map((player) => [player.id, player]),
  );

  return setup.selectedPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player))
    .map((player) => ({
      ...player,
      isActive: true,
    }));
}

export function generateLineupIds(setup: PregameSetup, state: GameState, activeTeam: ActiveTeam | null) {
  const pool = buildPregamePlayerPool(setup, state, activeTeam);
  const targetCount = getLineupTargetCount(setup.lineupSize, pool.length);

  if (!validateLineupPlayerPool(pool).isLeagueCompliant) {
    return [];
  }

  const targetLineupPlayers = recommendBattingOrder(pool)
    .slice(0, targetCount)
    .map((row) => row.player);

  return recommendBattingOrder(targetLineupPlayers).map((row) => row.player.id);
}

export function resolveSuggestedLineupIds(
  setup: PregameSetup,
  state: GameState,
  activeTeam: ActiveTeam | null,
): SuggestedLineupResolution {
  const pool = buildPregamePlayerPool(setup, state, activeTeam);
  const validation = validateLineupPlayerPool(pool);

  if (!pool.length) {
    return {
      lineupIds: [],
      canGenerate: false,
      emptyReason: "Select active players in Game Setup before reviewing the order.",
      warnings: validation.warnings,
    };
  }

  if (!validation.isLeagueCompliant) {
    return {
      lineupIds: [],
      canGenerate: false,
      emptyReason: "Update the selected player pool before generating a lineup.",
      warnings: validation.warnings,
    };
  }

  const generatedLineupIds = generateLineupIds(setup, state, activeTeam);
  const savedGeneratedLineupIds = resolveSavedGeneratedLineupIds(
    setup.generatedLineupIds,
    pool,
    getLineupTargetCount(setup.lineupSize, pool.length),
  );
  const lineupIds = savedGeneratedLineupIds.length ? savedGeneratedLineupIds : generatedLineupIds;

  if (!lineupIds.length) {
    return {
      lineupIds: [],
      canGenerate: true,
      emptyReason: "Generate the lineup from today's selected players.",
      warnings: [],
    };
  }

  return {
    lineupIds,
    canGenerate: true,
    emptyReason: null,
    warnings: [],
  };
}

export function resolveLineupPlayers(lineupIds: string[], state: GameState, activeTeam: ActiveTeam | null) {
  const playersById = new Map(buildRosterWithStats(state, activeTeam?.players ?? []).map((player) => [player.id, player]));

  return lineupIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

function resolveSavedGeneratedLineupIds(lineupIds: string[], pool: Player[], targetCount: number) {
  if (lineupIds.length !== targetCount) {
    return [];
  }

  const playersById = new Map(pool.map((player) => [player.id, player]));
  const savedLineup = lineupIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));

  if (savedLineup.length !== targetCount || !validateLineupGenderRules(savedLineup).isLeagueCompliant) {
    return [];
  }

  if (!isLineupGenderOptimized(savedLineup)) {
    return [];
  }

  return lineupIds;
}

function buildRosterWithStats(state: GameState, players: Player[]) {
  return players.map((player) => ({
    ...player,
    seasonStats: getPlayerSeasonStats(player, state),
  }));
}

export function getLineupTargetCount(lineupSize: LineupSizeOption, selectedCount: number) {
  if (lineupSize === "Everyone") {
    return selectedCount;
  }

  return Math.min(Number(lineupSize), selectedCount);
}

function normalizePregameSetup(setup: Partial<PregameSetup>, activeTeam?: ActiveTeam): PregameSetup {
  const fallback = createDefaultPregameSetup(activeTeam);
  const playerIds = new Set((activeTeam?.players ?? []).map((player) => player.id));
  const selectedPlayerIds = Array.isArray(setup.selectedPlayerIds)
    ? setup.selectedPlayerIds.filter((id) => playerIds.has(id))
    : fallback.selectedPlayerIds;
  const generatedLineupIds = Array.isArray(setup.generatedLineupIds)
    ? setup.generatedLineupIds.filter((id) => playerIds.has(id))
    : [];
  const acceptedLineupIds = Array.isArray(setup.acceptedLineupIds)
    ? setup.acceptedLineupIds.filter((id) => playerIds.has(id))
    : [];

  return {
    gameId: typeof setup.gameId === "string" ? setup.gameId : fallback.gameId,
    opponent: typeof setup.opponent === "string" ? setup.opponent : fallback.opponent,
    isHome: typeof setup.isHome === "boolean" ? setup.isHome : fallback.isHome,
    lineupSize: isLineupSize(setup.lineupSize) ? setup.lineupSize : fallback.lineupSize,
    selectedPlayerIds,
    generatedLineupIds,
    acceptedLineupIds,
    gameRules: normalizeGameRules(setup.gameRules),
    startingDefense: setup.startingDefense && typeof setup.startingDefense === "object" ? setup.startingDefense : null,
    status: isPregameStatus(setup.status) ? setup.status : fallback.status,
    updatedAt: typeof setup.updatedAt === "string" ? setup.updatedAt : null,
  };
}


function isLineupSize(value: unknown): value is LineupSizeOption {
  return value === "9" || value === "10" || value === "11" || value === "Everyone";
}

function isPregameStatus(value: unknown): value is PregameSetupStatus {
  return value === "SETUP" || value === "GENERATED" || value === "ACCEPTED" || value === "STARTED";
}

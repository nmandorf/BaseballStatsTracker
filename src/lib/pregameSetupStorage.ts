"use client";

import { useSyncExternalStore } from "react";
import type { ActiveTeam } from "@/types/player";
import type { Player } from "@/types/player";
import type { GameRules } from "@/types/game";
import type { DefensiveAlignment } from "@/types/defense";
import { normalizeGameRules } from "./gameRules.ts";
import {
  isLineupGenderOptimized,
  recommendBattingOrder,
  validateLineupGenderRules,
  validateLineupPlayerPool,
  type LineupRecommendationOptions,
} from "./lineupRules.ts";
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

type SuggestedLineupOptions = LineupRecommendationOptions & {
  useSavedGeneratedLineup?: boolean;
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

export function buildPregamePlayerPool(setup: PregameSetup, activeTeam: ActiveTeam | null): Player[] {
  const playersById = new Map(
    buildRosterPlayers(activeTeam?.players.filter((player) => player.isActive) ?? []).map((player) => [player.id, player]),
  );

  return setup.selectedPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player))
    .map((player) => ({
      ...player,
      isActive: true,
    }));
}

export function generateLineupIds(
  setup: PregameSetup,
  activeTeam: ActiveTeam | null,
  options: LineupRecommendationOptions = {},
) {
  const pool = buildPregamePlayerPool(setup, activeTeam);
  const targetCount = getLineupTargetCount(setup.lineupSize, pool.length);

  if (!validateLineupPlayerPool(pool).isLeagueCompliant) {
    return [];
  }

  const recommendedPlayers = recommendBattingOrder(pool, options).map((row) => row.player);
  const targetLineupPlayers = selectTargetLineupPlayers(recommendedPlayers, targetCount);

  return recommendBattingOrder(targetLineupPlayers, options).map((row) => row.player.id);
}

export function buildAcceptedPregameSetup(
  setup: PregameSetup,
  acceptedLineupIds: string[],
  startingDefense: DefensiveAlignment,
): PregameSetup {
  return {
    ...setup,
    generatedLineupIds: [...acceptedLineupIds],
    acceptedLineupIds: [...acceptedLineupIds],
    startingDefense,
    status: "ACCEPTED",
  };
}

export function isStartingDefenseSavedForFirstFieldingHalf(
  savedAlignment: DefensiveAlignment | null,
  currentAlignment: DefensiveAlignment | null,
  firstDefensiveHalf: Pick<DefensiveAlignment, "inning" | "half">,
) {
  if (!savedAlignment || !currentAlignment) {
    return false;
  }

  if (
    savedAlignment.inning !== firstDefensiveHalf.inning ||
    savedAlignment.half !== firstDefensiveHalf.half ||
    currentAlignment.inning !== firstDefensiveHalf.inning ||
    currentAlignment.half !== firstDefensiveHalf.half
  ) {
    return false;
  }

  return defensiveSlotsMatch(savedAlignment, currentAlignment)
    && unorderedIdsMatch(savedAlignment.benchPlayerIds, currentAlignment.benchPlayerIds);
}

export function resolveSuggestedLineupIds(
  setup: PregameSetup,
  activeTeam: ActiveTeam | null,
  options: SuggestedLineupOptions = {},
): SuggestedLineupResolution {
  const pool = buildPregamePlayerPool(setup, activeTeam);
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

  const generatedLineupIds = generateLineupIds(setup, activeTeam, options);
  const savedGeneratedLineupIds = options.useSavedGeneratedLineup === false
    ? []
    : resolveSavedGeneratedLineupIds(
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

export function resolveLineupPlayers(lineupIds: string[], activeTeam: ActiveTeam | null) {
  const playersById = new Map(buildRosterPlayers(activeTeam?.players ?? []).map((player) => [player.id, player]));

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

function selectTargetLineupPlayers(recommendedPlayers: Player[], targetCount: number) {
  const targetLineupPlayers = recommendedPlayers.slice(0, targetCount);

  if (!needsMaleIncludedForFemaleLeadoffWraparound(targetLineupPlayers, recommendedPlayers, targetCount)) {
    return targetLineupPlayers;
  }

  const maleWraparoundCandidate = recommendedPlayers
    .slice(targetCount)
    .find((player) => player.gender === "Male");
  const replacementIndex = findFinalNonMaleReplacementIndex(targetLineupPlayers);

  if (!maleWraparoundCandidate || replacementIndex < 0) {
    return targetLineupPlayers;
  }

  return targetLineupPlayers.map((player, index) => (
    index === replacementIndex ? maleWraparoundCandidate : player
  ));
}

function needsMaleIncludedForFemaleLeadoffWraparound(
  targetLineupPlayers: Player[],
  recommendedPlayers: Player[],
  targetCount: number,
) {
  return (
    targetLineupPlayers.length > 1 &&
    targetLineupPlayers[0]?.gender === "Female" &&
    !targetLineupPlayers.some((player, index) => index > 0 && player.gender === "Male") &&
    recommendedPlayers.slice(targetCount).some((player) => player.gender === "Male")
  );
}

function findFinalNonMaleReplacementIndex(players: Player[]) {
  for (let index = players.length - 1; index > 0; index -= 1) {
    if (players[index].gender !== "Male") {
      return index;
    }
  }

  return -1;
}

function buildRosterPlayers(players: Player[]) {
  return players.map((player) => ({
    ...player,
    seasonStats: player.seasonStats,
  }));
}

function defensiveSlotsMatch(left: DefensiveAlignment, right: DefensiveAlignment) {
  const positions = new Set([
    ...Object.keys(left.slots),
    ...Object.keys(right.slots),
  ]);

  for (const position of positions) {
    const leftSlot = left.slots[position as keyof DefensiveAlignment["slots"]];
    const rightSlot = right.slots[position as keyof DefensiveAlignment["slots"]];
    const leftPlayerId = leftSlot?.status === "ASSIGNED" ? leftSlot.playerId : null;
    const rightPlayerId = rightSlot?.status === "ASSIGNED" ? rightSlot.playerId : null;

    if (leftPlayerId !== rightPlayerId) {
      return false;
    }
  }

  return true;
}

function unorderedIdsMatch(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
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

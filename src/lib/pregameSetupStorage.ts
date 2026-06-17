"use client";

import { useSyncExternalStore } from "react";
import type { ActiveTeam } from "@/types/player";
import type { Player } from "@/types/player";
import type { GameRules } from "@/types/game";
import type { GameState } from "./gameEngine.ts";
import { getPlayerSeasonStats } from "./gameEngine.ts";
import { normalizeGameRules } from "./gameRules.ts";
import { recommendBattingOrder, validateLineupPlayerPool } from "./lineupRules.ts";
import { defaultGameRules } from "./seedTeam.ts";
import { loadActiveTeam } from "./teamStorage.ts";

export type LineupSizeOption = "9" | "10" | "11" | "Everyone";
export type PregameSetupStatus = "SETUP" | "GENERATED" | "ACCEPTED" | "STARTED";

export type PregameSetup = {
  opponent: string;
  isHome: boolean;
  lineupSize: LineupSizeOption;
  selectedPlayerIds: string[];
  generatedLineupIds: string[];
  acceptedLineupIds: string[];
  gameRules: GameRules;
  status: PregameSetupStatus;
  updatedAt: string | null;
};

export type SuggestedLineupResolution = {
  lineupIds: string[];
  canGenerate: boolean;
  emptyReason: string | null;
  warnings: string[];
};

const storageKey = "baseball-tracker:pregame-setup:v1";
const storageEventName = "baseball-tracker:pregame-setup-updated";

const defaultSetup: PregameSetup = {
  opponent: "Rebels",
  isHome: true,
  lineupSize: "10",
  selectedPlayerIds: [],
  generatedLineupIds: [],
  acceptedLineupIds: [],
  gameRules: defaultGameRules,
  status: "SETUP",
  updatedAt: null,
};

let cachedRaw: string | null | undefined;
let cachedTeamId: string | null | undefined;
let cachedSetup: PregameSetup | undefined;

export function createDefaultPregameSetup(activeTeam?: ActiveTeam | null): PregameSetup {
  const activePlayers = activeTeam?.players.filter((player) => player.isActive).map((player) => player.id) ?? [];

  return {
    ...defaultSetup,
    selectedPlayerIds: activePlayers,
    generatedLineupIds: [...defaultSetup.generatedLineupIds],
    acceptedLineupIds: [...defaultSetup.acceptedLineupIds],
    gameRules: { ...defaultGameRules },
  };
}

export function loadPregameSetup(): PregameSetup {
  if (typeof window === "undefined") {
    return createDefaultPregameSetup();
  }

  const raw = window.localStorage.getItem(storageKey);
  const activeTeam = loadActiveTeam();
  const activeTeamId = activeTeam?.id ?? null;

  if (raw === cachedRaw && activeTeamId === cachedTeamId && cachedSetup) {
    return cachedSetup;
  }

  if (!raw) {
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedSetup = createDefaultPregameSetup(activeTeam ?? undefined);
    return cachedSetup;
  }

  try {
    const parsed = JSON.parse(raw) as PregameSetup;
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedSetup = normalizePregameSetup(parsed, activeTeam ?? undefined);
    return cachedSetup;
  } catch {
    cachedRaw = raw;
    cachedTeamId = activeTeamId;
    cachedSetup = createDefaultPregameSetup(activeTeam ?? undefined);
    return cachedSetup;
  }
}

export function savePregameSetup(setup: PregameSetup) {
  if (typeof window === "undefined") {
    return;
  }

  const nextSetup = normalizePregameSetup({
    ...setup,
    updatedAt: new Date().toISOString(),
  }, loadActiveTeam() ?? undefined);
  const raw = JSON.stringify(nextSetup);

  cachedRaw = raw;
  cachedTeamId = loadActiveTeam()?.id ?? null;
  cachedSetup = nextSetup;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

export function subscribePregameSetup(onStoreChange: () => void) {
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

  return recommendBattingOrder(pool)
    .slice(0, targetCount)
    .map((row) => row.player.id);
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
  const lineupIds = setup.generatedLineupIds.length ? setup.generatedLineupIds : generatedLineupIds;

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
    opponent: typeof setup.opponent === "string" ? setup.opponent : fallback.opponent,
    isHome: typeof setup.isHome === "boolean" ? setup.isHome : fallback.isHome,
    lineupSize: isLineupSize(setup.lineupSize) ? setup.lineupSize : fallback.lineupSize,
    selectedPlayerIds,
    generatedLineupIds,
    acceptedLineupIds,
    gameRules: normalizeGameRules(setup.gameRules),
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

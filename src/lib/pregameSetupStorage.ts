"use client";

import { useSyncExternalStore } from "react";
import type { ActiveTeam } from "@/types/player";
import type { GameRules } from "@/types/game";
import type { DefensiveAlignment } from "@/types/defense";
import { normalizeGameRules } from "./gameRules.ts";
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

export {
  buildAcceptedPregameSetup,
  buildPregamePlayerPool,
  generateLineupIds,
  getLineupTargetCount,
  isStartingDefenseSavedForFirstFieldingHalf,
  resolveLineupPlayers,
  resolveSuggestedLineupIds,
} from "./pregameLineup.ts";

type ScheduledGame = Extract<ScheduleWeek, { kind: "GAME" }>;
type ScheduledGamePreparationStatus = ScheduledGame["preparationStatus"];

const storageKey = "baseball-tracker:pregame-setup-by-game:v2";
const storageEventName = "baseball-tracker:pregame-setup-updated";
const setupStatusBySchedulePreparationStatus: Record<ScheduledGamePreparationStatus, PregameSetupStatus> = {
  ACCEPTED: "ACCEPTED",
  GENERATED: "GENERATED",
  SETUP: "SETUP",
  STARTED: "SETUP",
};

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

function loadPregameSetup(): PregameSetup {
  if (typeof window === "undefined") {
    return createDefaultPregameSetup();
  }

  const raw = window.localStorage.getItem(storageKey);
  const context = getPregameSetupContext();

  const cachedPregameSetup = getCachedPregameSetup(raw, context.activeTeamId, context.selectedGameId);

  if (cachedPregameSetup) {
    return cachedPregameSetup;
  }

  return cachePregameSetup(raw, context, getPregameSetupFromStorage(raw, context));
}

function getPregameSetupFromStorage(raw: string | null, context: PregameSetupContext) {
  if (!raw) {
    return createDefaultPregameSetup(context.activeTeam ?? undefined);
  }

  return readStoredPregameSetup(raw, context);
}

export function savePregameSetup(setup: PregameSetup, options: { sync?: boolean } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const nextSetup = createSavedPregameSetup(setup);

  writePregameSetupToBrowser(nextSetup);

  if (shouldSyncPregameSetup(nextSetup, options)) {
    queuePregameSetupSync(nextSetup);
  }
}

function createSavedPregameSetup(setup: PregameSetup) {
  return normalizePregameSetup({
    ...setup,
    updatedAt: new Date().toISOString(),
  }, loadActiveTeam() ?? undefined);
}

function writePregameSetupToBrowser(setup: PregameSetup) {
  const raw = serializePregameSetupMap(setup);

  cachedRaw = raw;
  cachedTeamId = loadActiveTeam()?.id ?? null;
  cachedGameId = setup.gameId;
  cachedSetup = setup;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

function serializePregameSetupMap(setup: PregameSetup) {
  const setups = readPregameSetupMap(window.localStorage.getItem(storageKey));
  return JSON.stringify({ ...setups, [getPregameSetupStorageKey(setup)]: setup });
}

function getPregameSetupStorageKey(setup: PregameSetup) {
  return setup.gameId ?? "unscheduled";
}

function subscribePregameSetup(onStoreChange: () => void) {
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

export function selectScheduledGameForPregame(teamId: string, game: ScheduledGame, activeTeam?: ActiveTeam | null) {
  saveSelectedScheduledGameId(teamId, game.gameId);
  const existing = loadPregameSetup();
  const setup = existing.gameId === game.gameId ? existing : createDefaultPregameSetup(activeTeam);
  savePregameSetup({
    ...setup,
    gameId: game.gameId,
    opponent: game.opponent,
    isHome: game.isHome,
    status: getSetupStatusFromScheduledGame(game),
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

function getCachedPregameSetup(raw: string | null, activeTeamId: string | null, selectedGameId: string | null) {
  if (!isPregameSetupCacheKey(raw, activeTeamId, selectedGameId)) {
    return null;
  }

  return cachedSetup ?? null;
}

function isPregameSetupCacheKey(raw: string | null, activeTeamId: string | null, selectedGameId: string | null) {
  return raw === cachedRaw && activeTeamId === cachedTeamId && selectedGameId === cachedGameId;
}

type PregameSetupContext = {
  activeTeam: ActiveTeam | null;
  activeTeamId: string | null;
  selectedGameId: string | null;
};

function getPregameSetupContext(): PregameSetupContext {
  const activeTeam = loadActiveTeam();
  const activeTeamId = activeTeam?.id ?? null;

  return {
    activeTeam,
    activeTeamId,
    selectedGameId: activeTeamId ? loadSelectedScheduledGameId(activeTeamId) : null,
  };
}

function readStoredPregameSetup(raw: string, context: PregameSetupContext) {
  const parsed = parsePregameSetupMap(raw);

  if (!parsed) {
    return createDefaultPregameSetup(context.activeTeam ?? undefined);
  }

  return normalizePregameSetup(
    getStoredSetupForSelectedGame(parsed, context.selectedGameId),
    context.activeTeam ?? undefined,
  );
}

function getStoredSetupForSelectedGame(
  setups: Record<string, Partial<PregameSetup>>,
  selectedGameId: string | null,
) {
  if (!selectedGameId) {
    return setups.unscheduled ?? {};
  }

  return setups[selectedGameId] ?? { gameId: selectedGameId };
}

function readPregameSetupMap(raw: string | null): Record<string, Partial<PregameSetup>> {
  if (!raw) {
    return {};
  }

  return parsePregameSetupMap(raw) ?? {};
}

function parsePregameSetupMap(raw: string): Record<string, Partial<PregameSetup>> | null {
  try {
    return JSON.parse(raw) as Record<string, Partial<PregameSetup>>;
  } catch {
    return null;
  }
}

function cachePregameSetup(raw: string | null, context: PregameSetupContext, setup: PregameSetup) {
  cachedRaw = raw;
  cachedTeamId = context.activeTeamId;
  cachedGameId = context.selectedGameId;
  cachedSetup = setup;
  return setup;
}

function shouldSyncPregameSetup(setup: PregameSetup, options: { sync?: boolean }) {
  return options.sync !== false && Boolean(setup.gameId) && setup.status !== "STARTED";
}

function queuePregameSetupSync(setup: PregameSetup) {
  preparationSyncQueue = preparationSyncQueue
    .catch(() => undefined)
    .then(() => savePregameSetupToBackend(setup))
    .then(() => undefined)
    .catch(() => {
      // Keep the game-scoped local preparation available; start still requires server confirmation.
    });
}

async function savePregameSetupToBackend(setup: PregameSetup) {
  if (!setup.gameId) {
    return;
  }

  await fetch(`/api/games/${encodeURIComponent(setup.gameId)}/preparation`, {
    method: "PUT",
    headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(setup),
  });
}

function getSetupStatusFromScheduledGame(game: ScheduledGame) {
  return setupStatusBySchedulePreparationStatus[game.preparationStatus];
}

function getPregameSetupServerSnapshot() {
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

function normalizePregameSetup(setup: Partial<PregameSetup>, activeTeam?: ActiveTeam): PregameSetup {
  const fallback = createDefaultPregameSetup(activeTeam);
  const validPlayerIds = new Set((activeTeam?.players ?? []).map((player) => player.id));

  return {
    gameId: getOptionalSetupString(setup.gameId, fallback.gameId),
    opponent: getSetupString(setup.opponent, fallback.opponent),
    isHome: getSetupBoolean(setup.isHome, fallback.isHome),
    lineupSize: getSetupLineupSize(setup.lineupSize, fallback.lineupSize),
    selectedPlayerIds: normalizeSetupPlayerIds(setup.selectedPlayerIds, validPlayerIds, fallback.selectedPlayerIds),
    generatedLineupIds: normalizeSetupPlayerIds(setup.generatedLineupIds, validPlayerIds, []),
    acceptedLineupIds: normalizeSetupPlayerIds(setup.acceptedLineupIds, validPlayerIds, []),
    gameRules: normalizeGameRules(setup.gameRules),
    startingDefense: normalizeStartingDefense(setup.startingDefense),
    status: getSetupStatus(setup.status, fallback.status),
    updatedAt: getOptionalSetupString(setup.updatedAt, null),
  };
}

function getSetupLineupSize(lineupSize: unknown, fallback: LineupSizeOption) {
  return isLineupSize(lineupSize) ? lineupSize : fallback;
}

function getSetupStatus(status: unknown, fallback: PregameSetup["status"]) {
  return isPregameStatus(status) ? status : fallback;
}

function normalizeSetupPlayerIds(
  playerIds: unknown,
  validPlayerIds: Set<string>,
  fallback: string[],
) {
  return Array.isArray(playerIds)
    ? playerIds.filter((id) => validPlayerIds.has(id))
    : fallback;
}

function normalizeStartingDefense(startingDefense: unknown) {
  return startingDefense && typeof startingDefense === "object"
    ? startingDefense as DefensiveAlignment
    : null;
}

function getSetupString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function getOptionalSetupString<T extends string | null>(value: unknown, fallback: T) {
  return typeof value === "string" ? value : fallback;
}

function getSetupBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function isLineupSize(value: unknown): value is LineupSizeOption {
  return value === "9" || value === "10" || value === "11" || value === "Everyone";
}

function isPregameStatus(value: unknown): value is PregameSetupStatus {
  return value === "SETUP" || value === "GENERATED" || value === "ACCEPTED" || value === "STARTED";
}

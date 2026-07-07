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
    return setup;
  }

  const nextSetup = createSavedPregameSetup(setup);

  writePregameSetupToBrowser(nextSetup);

  if (shouldSyncPregameSetup(nextSetup, options)) {
    queuePregameSetupSync(nextSetup);
  }

  return nextSetup;
}

export async function savePregameSetupWithBackendConfirmation(setup: PregameSetup) {
  if (typeof window === "undefined") {
    return setup;
  }

  const nextSetup = createSavedPregameSetup(setup);

  await flushPregameSetupSync();

  if (shouldSyncPregameSetup(nextSetup, {})) {
    await savePregameSetupToBackend(nextSetup);
  }

  writePregameSetupToBrowser(nextSetup);

  return nextSetup;
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

  const response = await fetch(`/api/games/${encodeURIComponent(setup.gameId)}/preparation`, {
    method: "PUT",
    headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(setup),
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Unable to save game preparation."));
  }
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    return payload.error?.message ?? `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
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

export function buildDefenseAcceptedPregameSetup(
  setup: PregameSetup,
  displayedLineupIds: string[],
  startingDefense: DefensiveAlignment,
  offenseAccepted: boolean,
): PregameSetup {
  return {
    ...setup,
    generatedLineupIds: [...displayedLineupIds],
    acceptedLineupIds: offenseAccepted ? [...displayedLineupIds] : [],
    startingDefense,
    status: offenseAccepted ? "ACCEPTED" : "GENERATED",
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

  return [
    isAlignmentForFieldingHalf(savedAlignment, firstDefensiveHalf),
    isAlignmentForFieldingHalf(currentAlignment, firstDefensiveHalf),
    defensiveSlotsMatch(savedAlignment, currentAlignment),
    unorderedIdsMatch(savedAlignment.benchPlayerIds, currentAlignment.benchPlayerIds),
  ].every(Boolean);
}

function isAlignmentForFieldingHalf(
  alignment: DefensiveAlignment,
  fieldingHalf: Pick<DefensiveAlignment, "inning" | "half">,
) {
  return alignment.inning === fieldingHalf.inning && alignment.half === fieldingHalf.half;
}

export function resolveSuggestedLineupIds(
  setup: PregameSetup,
  activeTeam: ActiveTeam | null,
  options: SuggestedLineupOptions = {},
): SuggestedLineupResolution {
  const pool = buildPregamePlayerPool(setup, activeTeam);
  const validation = validateLineupPlayerPool(pool);
  const unavailableResolution = getUnavailableLineupResolution(pool, validation);

  if (unavailableResolution) return unavailableResolution;

  const generatedLineupIds = generateLineupIds(setup, activeTeam, options);
  const savedGeneratedLineupIds = resolveOptionalSavedGeneratedLineupIds(setup, pool, options);
  const lineupIds = savedGeneratedLineupIds.length ? savedGeneratedLineupIds : generatedLineupIds;

  return getAvailableLineupResolution(lineupIds);
}

function getUnavailableLineupResolution(
  pool: Player[],
  validation: ReturnType<typeof validateLineupPlayerPool>,
) {
  if (!pool.length) {
    return createLineupResolution(
      [],
      false,
      "Select active players in Game Setup before reviewing the order.",
      validation.warnings,
    );
  }

  if (!validation.isLeagueCompliant) {
    return createLineupResolution(
      [],
      false,
      "Update the selected player pool before generating a lineup.",
      validation.warnings,
    );
  }

  return null;
}

function getAvailableLineupResolution(lineupIds: string[]) {
  return lineupIds.length
    ? createLineupResolution(lineupIds, true, null, [])
    : createLineupResolution([], true, "Generate the lineup from today's selected players.", []);
}

function createLineupResolution(
  lineupIds: string[],
  canGenerate: boolean,
  emptyReason: string | null,
  warnings: string[],
): SuggestedLineupResolution {
  return {
    lineupIds,
    canGenerate,
    emptyReason,
    warnings,
  };
}

function resolveOptionalSavedGeneratedLineupIds(
  setup: PregameSetup,
  pool: Player[],
  options: SuggestedLineupOptions,
) {
  if (options.useSavedGeneratedLineup === false) {
    return [];
  }

  return resolveSavedGeneratedLineupIds(
    setup.generatedLineupIds,
    pool,
    getLineupTargetCount(setup.lineupSize, pool.length),
  );
}

export function resolveLineupPlayers(lineupIds: string[], activeTeam: ActiveTeam | null) {
  return resolveLineupFromPool(lineupIds, buildRosterPlayers(activeTeam?.players ?? []));
}

function resolveSavedGeneratedLineupIds(lineupIds: string[], pool: Player[], targetCount: number) {
  if (lineupIds.length !== targetCount) {
    return [];
  }

  const savedLineup = resolveLineupFromPool(lineupIds, pool);

  if (!isSavedLineupUsable(savedLineup, targetCount)) {
    return [];
  }

  return isLineupGenderOptimized(savedLineup) ? lineupIds : [];
}

function resolveLineupFromPool(lineupIds: string[], pool: Player[]) {
  const playersById = new Map(pool.map((player) => [player.id, player]));

  return lineupIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

function isSavedLineupUsable(savedLineup: Player[], targetCount: number) {
  return [
    savedLineup.length === targetCount,
    validateLineupGenderRules(savedLineup).isLeagueCompliant,
  ].every(Boolean);
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
  return [
    targetLineupPlayers.length > 1,
    targetLineupPlayers[0]?.gender === "Female",
    !hasMaleAfterLeadoff(targetLineupPlayers),
    hasMaleAfterTargetCount(recommendedPlayers, targetCount),
  ].every(Boolean);
}

function hasMaleAfterLeadoff(players: Player[]) {
  return players.some((player, index) => index > 0 && player.gender === "Male");
}

function hasMaleAfterTargetCount(players: Player[], targetCount: number) {
  return players.slice(targetCount).some((player) => player.gender === "Male");
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

  return Array.from(positions).every((position) => {
    const leftSlot = left.slots[position as keyof DefensiveAlignment["slots"]];
    const rightSlot = right.slots[position as keyof DefensiveAlignment["slots"]];
    return getAssignedPlayerId(leftSlot) === getAssignedPlayerId(rightSlot);
  });
}

function getAssignedPlayerId(slot: DefensiveAlignment["slots"][keyof DefensiveAlignment["slots"]] | undefined) {
  return slot?.status === "ASSIGNED" ? slot.playerId : null;
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

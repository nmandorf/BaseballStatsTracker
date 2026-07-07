"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createZeroStats } from "./statCalculations.ts";
import {
  createDefaultDefensiveProfile,
  normalizeDefensivePositionPreference,
  normalizeDefensiveProfile,
} from "./defenseEngine.ts";
import { subscribeBrowserStore } from "./browserStoreSubscription.ts";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase.ts";
import {
  createPlayerFromProfileInput,
  createSlug,
  normalizeBattingSide,
  normalizePlayerGender,
  normalizePlayerStats,
  normalizeSpeedRating,
  normalizeThrowingSide,
} from "./playerProfileInput.ts";
import { getSeasonStatsProgress } from "./seasonStatRules.ts";
import { canUseStoredTeam, normalizeTeamAccount, type TeamAccount } from "./teamAccount.ts";
import type { ActiveTeam, Player, PlayerProfileInput } from "@/types/player";
import type { PlayerStats } from "@/types/stats";

const storageKey = "baseball-tracker:active-team:v1";
const storageEventName = "baseball-tracker:active-team-updated";
const activeTeamBackendSyncTimeoutMs = 10_000;
const defaultRoleHints = [
  { maximumSeedOrder: 1, roleHint: "High OBP table-setter" },
  { maximumSeedOrder: 3, roleHint: "Contact hitter" },
  { maximumSeedOrder: 5, roleHint: "Power hitter" },
] as const;

let cachedRaw: string | null | undefined;
let cachedAccountUid: string | null | undefined;
let cachedTeam: ActiveTeam | null | undefined;
let activeTeamBackendSyncQueue = Promise.resolve();

export function createZeroPlayerStats(): PlayerStats {
  return createZeroStats();
}

export function createEmptyPlayerInput(seedOrder = 1): PlayerProfileInput {
  return {
    name: "",
    gender: "Unknown",
    bats: "Unknown",
    throws: "Unknown",
    primaryPosition: "",
    speedRating: "Average",
    notes: "",
    contactNotes: "",
    defensiveProfile: createDefaultDefensiveProfile(),
    roleHint: defaultRoleHint(seedOrder),
    isActive: true,
    startingStats: createZeroPlayerStats(),
  };
}

export function createPlayerFromInput(input: PlayerProfileInput, seedOrder: number): Player {
  const name = input.name.trim();
  const roleHint = input.roleHint.trim() || defaultRoleHint(seedOrder);
  return createPlayerFromProfileInput({ ...input, roleHint }, seedOrder, createPlayerId(name, seedOrder));
}

export function createActiveTeam(name: string, players: Player[]): ActiveTeam {
  const now = new Date().toISOString();
  const account = getSignedInTeamAccount();

  return {
    id: createSlug(name.trim()) || `team-${Date.now()}`,
    ownerUid: account?.uid,
    ownerEmail: account?.email,
    name: name.trim(),
    timeZone: null,
    scheduleSetupCompleted: false,
    players: players.map((player, index) => ({ ...player, seedOrder: index + 1 })),
    createdAt: now,
    updatedAt: now,
  };
}

export function loadActiveTeam(): ActiveTeam | null {
  if (typeof window === "undefined") {
    return null;
  }

  return loadBrowserActiveTeam();
}

function loadBrowserActiveTeam() {
  const raw = window.localStorage.getItem(storageKey);
  const signedInAccount = getSignedInTeamAccount();
  const accountUid = signedInAccount?.uid ?? null;

  const cachedActiveTeam = getCachedActiveTeam(raw, accountUid);

  return cachedActiveTeam ?? cacheActiveTeam(
    raw,
    accountUid,
    readActiveTeamFromStorage(raw, signedInAccount),
  );
}

function getCachedActiveTeam(raw: string | null, accountUid: string | null) {
  return isActiveTeamCacheKey(raw, accountUid) ? cachedTeam ?? null : null;
}

function readActiveTeamFromStorage(raw: string | null, signedInAccount: TeamAccount | null) {
  if (!raw) {
    return null;
  }

  const normalizedTeam = parseActiveTeam(raw);

  if (!normalizedTeam || !isTeamOwnedByAccount(normalizedTeam, signedInAccount)) {
    return null;
  }

  return normalizedTeam;
}

function parseActiveTeam(raw: string) {
  try {
    const parsed = JSON.parse(raw) as ActiveTeam;
    return normalizeActiveTeam(parsed);
  } catch {
    return null;
  }
}

export function saveActiveTeam(team: ActiveTeam) {
  if (typeof window === "undefined") {
    return;
  }

  writeActiveTeam({
    ...team,
    updatedAt: new Date().toISOString(),
  });
}

export function syncActiveTeamToBackend(team: ActiveTeam) {
  queueActiveTeamBackendSync(team);
}

export function updateActiveTeamPlayers(players: Player[]) {
  const team = loadActiveTeam();

  if (!team) {
    return null;
  }

  const nextTeam = {
    ...team,
    players: players.map((player, index) => ({ ...player, seedOrder: index + 1 })),
    updatedAt: new Date().toISOString(),
  };

  saveActiveTeam(nextTeam);
  queueActiveTeamBackendSync(nextTeam);
  return nextTeam;
}

export function resetActiveTeam() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
  cachedRaw = null;
  cachedAccountUid = null;
  cachedTeam = null;
  window.dispatchEvent(new Event(storageEventName));
}

function subscribeActiveTeam(onStoreChange: () => void) {
  return subscribeBrowserStore(storageEventName, onStoreChange);
}

function getActiveTeamServerSnapshot() {
  return null;
}

export function useActiveTeam() {
  return useSyncExternalStore(
    subscribeActiveTeam,
    loadActiveTeam,
    getActiveTeamServerSnapshot,
  );
}

export function useBackendSyncedActiveTeam() {
  const activeTeam = useActiveTeam();

  useEffect(() => {
    if (!activeTeam?.id) {
      return;
    }

    void hydrateActiveTeamFromBackend();
  }, [activeTeam?.id]);

  return activeTeam;
}

export async function createBackendTeam(
  name: string,
  options: { fallbackToLocal?: boolean } = {},
) {
  const shouldFallbackToLocal = options.fallbackToLocal ?? true;
  const localTeam = createActiveTeam(name, []);

  try {
    return getCreatedBackendTeamFallback(await requestCreatedBackendTeam(name), localTeam);
  } catch (error) {
    return handleCreateBackendTeamError(error, shouldFallbackToLocal, localTeam);
  }
}

function getCreatedBackendTeamFallback(backendTeam: ActiveTeam | null, localTeam: ActiveTeam) {
  return backendTeam ?? localTeam;
}

function handleCreateBackendTeamError(
  error: unknown,
  shouldFallbackToLocal: boolean,
  localTeam: ActiveTeam,
) {
  if (!shouldFallbackToLocal) {
    throw error;
  }

  return localTeam;
}

async function requestCreatedBackendTeam(name: string) {
  const response = await fetch("/api/team", {
    method: "POST",
    headers: await getVerifiedTeamAccountHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error("Team backend unavailable.");
  }

  return normalizeTeamPayload(await response.json());
}

export async function loadAvailableTeamsFromBackend(
  options: { fallbackToActiveTeam?: boolean } = {},
) {
  const shouldFallbackToActiveTeam = options.fallbackToActiveTeam !== false;
  const activeTeamFallback = getAccountOwnedActiveTeamFallback();

  try {
    const response = await fetch("/api/team?list=1", {
      cache: "no-store",
      headers: await getVerifiedTeamAccountHeaders(),
    });

    if (!response.ok) {
      return handleUnavailableTeamList(shouldFallbackToActiveTeam, activeTeamFallback);
    }

    const backendTeams = normalizeBackendTeamList(await response.json());

    if (backendTeams.length > 0) {
      return backendTeams;
    }
  } catch (error) {
    return handleTeamListLoadError(error, shouldFallbackToActiveTeam, activeTeamFallback);
  }

  return getAvailableTeamsFallback(shouldFallbackToActiveTeam, activeTeamFallback);
}

export async function addPlayerToBackendTeam(
  team: ActiveTeam,
  input: PlayerProfileInput,
  seedOrder: number,
) {
  const fallbackTeam = createAddPlayerFallbackTeam(team, input, seedOrder);

  try {
    return await requestAddedPlayerBackendTeam(team, input, seedOrder) ?? fallbackTeam;
  } catch {
    return fallbackTeam;
  }
}

function createAddPlayerFallbackTeam(
  team: ActiveTeam,
  input: PlayerProfileInput,
  seedOrder: number,
) {
  const fallbackPlayer = createPlayerFromInput(input, seedOrder);

  return normalizeActiveTeam({
    ...team,
    players: [...team.players, fallbackPlayer],
    updatedAt: new Date().toISOString(),
  }) ?? team;
}

async function requestAddedPlayerBackendTeam(
  team: ActiveTeam,
  input: PlayerProfileInput,
  seedOrder: number,
) {
  const response = await fetch(`/api/team/${encodeURIComponent(team.id)}/players`, {
    method: "POST",
    headers: await getVerifiedTeamAccountHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ input, seedOrder }),
  });

  if (!response.ok) {
    throw new Error("Player backend unavailable.");
  }

  return normalizeTeamPayload(await response.json());
}

export async function addPlayerToActiveTeamBackend(input: PlayerProfileInput) {
  const team = loadActiveTeam();

  if (!team) {
    return null;
  }

  const nextTeam = await addPlayerToBackendTeam(team, input, team.players.length + 1);

  saveActiveTeam(nextTeam);
  return nextTeam;
}

export async function deleteTeamPermanently(teamId: string) {
  const response = await fetch(`/api/team/${encodeURIComponent(teamId)}`, {
    method: "DELETE",
    headers: await getVerifiedTeamAccountHeaders(),
  });

  if (response.ok) {
    return;
  }

  const message = await readTeamDeletionError(response);
  throw new Error(message);
}

export async function hydrateActiveTeamFromBackend() {
  if (typeof window === "undefined") {
    return null;
  }

  const activeTeam = loadActiveTeam();

  try {
    return saveHydratedBackendTeam(await requestActiveBackendTeam(getActiveTeamQuery(activeTeam)), activeTeam);
  } catch {
    return activeTeam;
  }
}

function getActiveTeamQuery(activeTeam: ActiveTeam | null) {
  return activeTeam?.id ? `?teamId=${encodeURIComponent(activeTeam.id)}` : "";
}

function saveHydratedBackendTeam(backendTeam: ActiveTeam | null, activeTeam: ActiveTeam | null) {
  if (!backendTeam) {
    return activeTeam;
  }

  const nextTeam = mergeBackendTeamWithLocalSeasonStats(backendTeam, activeTeam);

  saveActiveTeam(nextTeam);
  return nextTeam;
}

async function requestActiveBackendTeam(query: string) {
  const response = await fetch(`/api/team${query}`, {
    cache: "no-store",
    headers: await getVerifiedTeamAccountHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  return normalizeTeamPayload(await response.json());
}

function normalizeTeamPayload(payload: unknown) {
  const team = (payload as { team?: ActiveTeam | null }).team;
  return team ? normalizeActiveTeam(team) : null;
}

function mergeBackendTeamWithLocalSeasonStats(backendTeam: ActiveTeam, localTeam: ActiveTeam | null): ActiveTeam {
  if (!localTeam || !isSameTeamWorkspace(localTeam, backendTeam)) {
    return backendTeam;
  }

  const localPlayersById = new Map(localTeam.players.map((player) => [player.id, player]));

  return {
    ...backendTeam,
    players: backendTeam.players.map((backendPlayer) => {
      const localPlayer = localPlayersById.get(backendPlayer.id);

      if (!localPlayer || !isStatsProgressAhead(localPlayer.seasonStats, backendPlayer.seasonStats)) {
        return backendPlayer;
      }

      return {
        ...backendPlayer,
        seasonStats: localPlayer.seasonStats,
      };
    }),
  };
}

function isStatsProgressAhead(localStats: PlayerStats, backendStats: PlayerStats) {
  return getSeasonStatsProgress(localStats) > getSeasonStatsProgress(backendStats);
}

export async function getVerifiedTeamAccountHeaders(baseHeaders: Record<string, string> = {}) {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return baseHeaders;
    const idToken = await user.getIdToken();
    return { ...baseHeaders, Authorization: `Bearer ${idToken}` };
  } catch {
    return baseHeaders;
  }
}

async function readTeamDeletionError(response: Response) {
  try {
    return getTeamDeletionErrorMessage(await response.json());
  } catch {
    // The fallback below is safe to show when the backend returns a non-JSON error.
  }

  return "Unable to delete the team. Please try again.";
}

function getTeamDeletionErrorMessage(payload: unknown) {
  const message = (payload as { error?: { message?: unknown } }).error?.message;

  return typeof message === "string" && message.trim()
    ? message
    : "Unable to delete the team. Please try again.";
}

function getAccountOwnedActiveTeamFallback() {
  const signedInAccount = getSignedInTeamAccount();
  const storedActiveTeam = loadActiveTeam();

  return storedActiveTeam?.ownerUid === signedInAccount?.uid
    ? storedActiveTeam
    : null;
}

function handleUnavailableTeamList(shouldFallbackToActiveTeam: boolean, activeTeam: ActiveTeam | null) {
  if (!shouldFallbackToActiveTeam) {
    throw new Error("Unable to load account teams.");
  }

  return getAvailableTeamsFallback(shouldFallbackToActiveTeam, activeTeam);
}

function handleTeamListLoadError(
  error: unknown,
  shouldFallbackToActiveTeam: boolean,
  activeTeam: ActiveTeam | null,
) {
  if (!shouldFallbackToActiveTeam) {
    throw error;
  }

  return getAvailableTeamsFallback(shouldFallbackToActiveTeam, activeTeam);
}

function getAvailableTeamsFallback(shouldFallbackToActiveTeam: boolean, activeTeam: ActiveTeam | null) {
  if (!shouldFallbackToActiveTeam || !activeTeam) {
    return [];
  }

  return [activeTeam];
}

function isActiveTeamCacheKey(raw: string | null, accountUid: string | null) {
  return raw === cachedRaw && accountUid === cachedAccountUid;
}

function cacheActiveTeam(raw: string | null, accountUid: string | null, team: ActiveTeam | null) {
  cachedRaw = raw;
  cachedAccountUid = accountUid;
  cachedTeam = team;
  return team;
}

function normalizeBackendTeamList(payload: unknown) {
  const teams = (payload as { teams?: Partial<ActiveTeam>[] }).teams;

  return Array.isArray(teams)
    ? teams
        .map((team) => normalizeActiveTeam(team))
        .filter((team): team is ActiveTeam => Boolean(team))
    : [];
}

function writeActiveTeam(team: Partial<ActiveTeam>) {
  if (typeof window === "undefined") {
    return;
  }

  const nextTeam = normalizeActiveTeam(team);

  if (!nextTeam) {
    return;
  }

  writeNormalizedActiveTeam(nextTeam);
}

function writeNormalizedActiveTeam(team: ActiveTeam) {
  const raw = JSON.stringify(team);

  cachedRaw = raw;
  cachedAccountUid = getSignedInTeamAccount()?.uid ?? null;
  cachedTeam = team;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

export function isSameTeamWorkspace(
  firstTeam: Pick<ActiveTeam, "id" | "ownerUid"> | null,
  secondTeam: Pick<ActiveTeam, "id" | "ownerUid"> | null,
) {
  if (!hasTeamOwner(firstTeam) || !hasTeamOwner(secondTeam)) {
    return false;
  }

  return firstTeam.id === secondTeam.id && firstTeam.ownerUid === secondTeam.ownerUid;
}

function hasTeamOwner<T extends Pick<ActiveTeam, "ownerUid"> | null>(
  team: T,
): team is Exclude<T, null> & { ownerUid: string } {
  return Boolean(team?.ownerUid);
}

function isTeamOwnedByAccount(team: ActiveTeam, account: TeamAccount | null) {
  return canUseStoredTeam(
    team.ownerUid,
    account?.uid ?? null,
    isFirebaseConfigured(),
  );
}

function queueActiveTeamBackendSync(team: ActiveTeam) {
  activeTeamBackendSyncQueue = activeTeamBackendSyncQueue
    .catch(() => undefined)
    .then(() => postActiveTeamToBackend(team, activeTeamBackendSyncTimeoutMs))
    .then(() => undefined)
    .catch(() => {
      // The local team mirror remains usable when Prisma is unavailable.
    });
}

function postActiveTeamToBackend(team: ActiveTeam, timeoutMs: number) {
  const controller = new AbortController();

  return withTimeout((async () => {
    const response = await fetch("/api/team", {
      method: "POST",
      headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ team }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Unable to sync active team.");
    }
  })(), timeoutMs, "Active team sync timed out.", () => {
    controller.abort();
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  onTimeout: () => void,
) {
  let timeout: ReturnType<typeof setTimeout>;

  return new Promise<T>((resolve, reject) => {
    timeout = setTimeout(() => {
      onTimeout();
      reject(new Error(message));
    }, timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

function normalizeActiveTeam(team: Partial<ActiveTeam>): ActiveTeam | null {
  if (!isNormalizableTeam(team)) {
    return null;
  }

  const now = new Date().toISOString();
  const signedInAccount = getSignedInTeamAccount();
  const normalizedPlayers = normalizeTeamPlayers(team.players);

  return {
    id: getNonEmptyString(team.id, createSlug(team.name)),
    ownerUid: getNonEmptyString(team.ownerUid, signedInAccount?.uid),
    ownerEmail: getNonEmptyString(team.ownerEmail, signedInAccount?.email),
    name: team.name.trim(),
    timeZone: getNonEmptyString(team.timeZone, null),
    scheduleSetupCompleted: getScheduleSetupCompleted(team.scheduleSetupCompleted),
    players: normalizedPlayers,
    createdAt: getNonEmptyString(team.createdAt, now),
    updatedAt: getNonEmptyString(team.updatedAt, now),
  };
}

function normalizeTeamPlayers(players: Partial<Player>[]) {
  return players
    .map((player, index) => normalizePlayer(player, index + 1))
    .filter((player): player is Player => Boolean(player));
}

function getScheduleSetupCompleted(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

function isNormalizableTeam(team: Partial<ActiveTeam>): team is Partial<ActiveTeam> & Pick<ActiveTeam, "name" | "players"> {
  return Boolean(team)
    && typeof team.name === "string"
    && Boolean(team.name.trim())
    && Array.isArray(team.players);
}

function getNonEmptyString(value: unknown, fallback: string): string;
function getNonEmptyString(value: unknown, fallback: string | undefined): string | undefined;
function getNonEmptyString(value: unknown, fallback: string | null): string | null;
function getNonEmptyString(value: unknown, fallback: string | null | undefined): string | null | undefined;
function getNonEmptyString(value: unknown, fallback: string | null | undefined) {
  return typeof value === "string" && value ? value : fallback;
}

function getSignedInTeamAccount(): TeamAccount | null {
  if (!canReadSignedInTeamAccount()) {
    return null;
  }

  try {
    const user = getFirebaseAuth().currentUser;

    if (!user) {
      return null;
    }

    return normalizeTeamAccount(user.uid, user.email);
  } catch {
    return null;
  }
}

function canReadSignedInTeamAccount() {
  return [
    typeof window !== "undefined",
    typeof document !== "undefined",
    isFirebaseConfigured(),
  ].every(Boolean);
}

function normalizePlayer(player: Partial<Player>, seedOrder: number): Player | null {
  if (!isNormalizablePlayer(player)) {
    return null;
  }

  const fallbackId = createPlayerId(player.name, seedOrder);
  const trimmedName = player.name.trim();

  return {
    id: getNonEmptyString(player.id, fallbackId),
    name: trimmedName,
    gender: normalizePlayerGender(player.gender),
    bats: normalizeBattingSide(player.bats),
    throws: normalizeThrowingSide(player.throws),
    primaryPosition: normalizeDefensivePositionPreference(player.primaryPosition),
    speedRating: normalizeSpeedRating(player.speedRating),
    notes: getPlayerNotes(player.notes),
    contactNotes: normalizeContactNotes(player.contactNotes),
    defensiveProfile: normalizeDefensiveProfile(player.defensiveProfile),
    roleHint: getPlayerRoleHint(player.roleHint, seedOrder),
    isActive: typeof player.isActive === "boolean" ? player.isActive : true,
    seedOrder,
    seasonStats: normalizePlayerStats(player.seasonStats),
  };
}

function isNormalizablePlayer(player: Partial<Player>): player is Partial<Player> & Pick<Player, "name"> {
  return Boolean(player) && typeof player.name === "string" && Boolean(player.name.trim());
}

function getPlayerNotes(notes: unknown) {
  return typeof notes === "string" && notes.trim()
    ? notes.trim()
    : "Player profile ready for game-day tracking.";
}

function normalizeContactNotes(contactNotes: unknown) {
  return Array.isArray(contactNotes) ? contactNotes.filter(Boolean) : [];
}

function getPlayerRoleHint(roleHint: unknown, seedOrder: number) {
  return typeof roleHint === "string" && roleHint.trim()
    ? roleHint.trim()
    : defaultRoleHint(seedOrder);
}

function createPlayerId(name: string, seedOrder: number) {
  const suffix = Date.now().toString(36);
  const slug = createSlug(name) || `player-${seedOrder}`;

  return `${slug}-${suffix}`;
}

function defaultRoleHint(seedOrder: number) {
  return defaultRoleHints.find((hint) => seedOrder <= hint.maximumSeedOrder)?.roleHint ?? "Roster hitter";
}

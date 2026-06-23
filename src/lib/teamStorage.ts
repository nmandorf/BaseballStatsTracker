"use client";

import { useSyncExternalStore } from "react";
import { createZeroStats } from "./statCalculations.ts";
import {
  createDefaultDefensiveProfile,
  normalizeDefensivePositionPreference,
  normalizeDefensiveProfile,
} from "./defenseEngine.ts";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase.ts";
import { canUseStoredTeam, normalizeTeamAccount, type TeamAccount } from "./teamAccount.ts";
import type { ActiveTeam, BattingSide, Player, PlayerGender, PlayerProfileInput, SpeedRating, ThrowingSide } from "@/types/player";
import type { PlayerStats } from "@/types/stats";

const storageKey = "baseball-tracker:active-team:v1";
const storageEventName = "baseball-tracker:active-team-updated";

let cachedRaw: string | null | undefined;
let cachedAccountUid: string | null | undefined;
let cachedTeam: ActiveTeam | null | undefined;

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
  const notes = input.notes.trim();
  const roleHint = input.roleHint.trim() || defaultRoleHint(seedOrder);

  return {
    id: createPlayerId(name, seedOrder),
    name,
    gender: normalizePlayerGender(input.gender),
    bats: normalizeBattingSide(input.bats),
    throws: normalizeThrowingSide(input.throws),
    primaryPosition: normalizeDefensivePositionPreference(input.primaryPosition),
    speedRating: normalizeSpeedRating(input.speedRating),
    notes: notes || "Player profile ready for game-day tracking.",
    contactNotes: splitContactNotes(input.contactNotes),
    defensiveProfile: normalizeDefensiveProfile(input.defensiveProfile),
    roleHint,
    isActive: input.isActive,
    seedOrder,
    seasonStats: normalizeStats(input.startingStats),
  };
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

  const raw = window.localStorage.getItem(storageKey);
  const signedInAccount = getSignedInTeamAccount();
  const accountUid = signedInAccount?.uid ?? null;

  if (raw === cachedRaw && accountUid === cachedAccountUid) {
    return cachedTeam ?? null;
  }

  if (!raw) {
    cachedRaw = raw;
    cachedAccountUid = accountUid;
    cachedTeam = null;
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActiveTeam;
    const normalizedTeam = normalizeActiveTeam(parsed);

    cachedRaw = raw;
    cachedAccountUid = accountUid;
    cachedTeam = normalizedTeam && isTeamOwnedByAccount(normalizedTeam, signedInAccount)
      ? normalizedTeam
      : null;
    return cachedTeam;
  } catch {
    cachedRaw = raw;
    cachedAccountUid = accountUid;
    cachedTeam = null;
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

export function addPlayerToActiveTeam(input: PlayerProfileInput) {
  const team = loadActiveTeam();

  if (!team) {
    return null;
  }

  const nextPlayer = createPlayerFromInput(input, team.players.length + 1);
  const nextTeam = {
    ...team,
    players: [...team.players, nextPlayer],
    updatedAt: new Date().toISOString(),
  };

  saveActiveTeam(nextTeam);
  queueActiveTeamBackendSync(nextTeam);
  return nextTeam;
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

export function subscribeActiveTeam(onStoreChange: () => void) {
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

export function getActiveTeamServerSnapshot() {
  return null;
}

export function useActiveTeam() {
  return useSyncExternalStore(
    subscribeActiveTeam,
    loadActiveTeam,
    getActiveTeamServerSnapshot,
  );
}

export async function createBackendTeam(
  name: string,
  options: { fallbackToLocal?: boolean } = {},
) {
  const shouldFallbackToLocal = options.fallbackToLocal ?? true;
  const localTeam = createActiveTeam(name, []);

  try {
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

    const payload = (await response.json()) as { team?: ActiveTeam | null };
    const backendTeam = payload.team ? normalizeActiveTeam(payload.team) : null;

    return backendTeam ?? localTeam;
  } catch (error) {
    if (!shouldFallbackToLocal) {
      throw error;
    }

    return localTeam;
  }
}

export async function loadAvailableTeamsFromBackend(
  options: { fallbackToActiveTeam?: boolean } = {},
) {
  const shouldFallbackToActiveTeam = options.fallbackToActiveTeam ?? true;
  const signedInAccount = getSignedInTeamAccount();
  const storedActiveTeam = loadActiveTeam();
  const activeTeam = storedActiveTeam?.ownerUid === signedInAccount?.uid
    ? storedActiveTeam
    : null;

  try {
    const response = await fetch("/api/team?list=1", {
      cache: "no-store",
      headers: await getVerifiedTeamAccountHeaders(),
    });

    if (!response.ok) {
      if (!shouldFallbackToActiveTeam) {
        throw new Error("Unable to load account teams.");
      }

      return activeTeam ? [activeTeam] : [];
    }

    const payload = (await response.json()) as { teams?: Partial<ActiveTeam>[] };
    const backendTeams = Array.isArray(payload.teams)
      ? payload.teams
          .map((team) => normalizeActiveTeam(team))
          .filter((team): team is ActiveTeam => Boolean(team))
      : [];

    if (backendTeams.length > 0) {
      return backendTeams;
    }
  } catch (error) {
    if (!shouldFallbackToActiveTeam) {
      throw error;
    }

    return activeTeam ? [activeTeam] : [];
  }

  if (!shouldFallbackToActiveTeam) {
    return [];
  }

  return activeTeam ? [activeTeam] : [];
}

export async function addPlayerToBackendTeam(
  team: ActiveTeam,
  input: PlayerProfileInput,
  seedOrder: number,
) {
  const fallbackPlayer = createPlayerFromInput(input, seedOrder);
  const fallbackTeam = normalizeActiveTeam({
    ...team,
    players: [...team.players, fallbackPlayer],
    updatedAt: new Date().toISOString(),
  }) ?? team;

  try {
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

    const payload = (await response.json()) as { team?: ActiveTeam | null };
    const backendTeam = payload.team ? normalizeActiveTeam(payload.team) : null;

    return backendTeam ?? fallbackTeam;
  } catch {
    return fallbackTeam;
  }
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
  const query = activeTeam?.id ? `?teamId=${encodeURIComponent(activeTeam.id)}` : "";

  try {
    const response = await fetch(`/api/team${query}`, {
      cache: "no-store",
      headers: await getVerifiedTeamAccountHeaders(),
    });

    if (!response.ok) {
      return activeTeam;
    }

    const payload = (await response.json()) as { team?: ActiveTeam | null };
    const backendTeam = payload.team ? normalizeActiveTeam(payload.team) : null;

    if (backendTeam) {
      saveActiveTeam(backendTeam);
      return backendTeam;
    }
  } catch {
    return activeTeam;
  }

  return activeTeam;
}

export async function getVerifiedTeamAccountHeaders(baseHeaders: Record<string, string> = {}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) return baseHeaders;
  const idToken = await user.getIdToken();
  return { ...baseHeaders, Authorization: `Bearer ${idToken}` };
}

async function readTeamDeletionError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: unknown } };

    if (typeof payload.error?.message === "string" && payload.error.message.trim()) {
      return payload.error.message;
    }
  } catch {
    // The fallback below is safe to show when the backend returns a non-JSON error.
  }

  return "Unable to delete the team. Please try again.";
}

function writeActiveTeam(team: Partial<ActiveTeam>) {
  if (typeof window === "undefined") {
    return;
  }

  const nextTeam = normalizeActiveTeam(team);

  if (!nextTeam) {
    return;
  }

  const raw = JSON.stringify(nextTeam);

  cachedRaw = raw;
  cachedAccountUid = getSignedInTeamAccount()?.uid ?? null;
  cachedTeam = nextTeam;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

export function isSameTeamWorkspace(
  firstTeam: Pick<ActiveTeam, "id" | "ownerUid"> | null,
  secondTeam: Pick<ActiveTeam, "id" | "ownerUid"> | null,
) {
  if (!firstTeam?.ownerUid || !secondTeam?.ownerUid) {
    return false;
  }

  return firstTeam.id === secondTeam.id && firstTeam.ownerUid === secondTeam.ownerUid;
}

function isTeamOwnedByAccount(team: ActiveTeam, account: TeamAccount | null) {
  return canUseStoredTeam(
    team.ownerUid,
    account?.uid ?? null,
    isFirebaseConfigured(),
  );
}

function queueActiveTeamBackendSync(team: ActiveTeam) {
  getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }).then((headers) => fetch("/api/team", {
    method: "POST",
    headers,
    body: JSON.stringify({ team }),
  }))
    .then(() => undefined)
    .catch(() => {
      // The local team mirror remains usable when Prisma is unavailable.
    });
}

function normalizeActiveTeam(team: Partial<ActiveTeam>): ActiveTeam | null {
  if (!team || typeof team.name !== "string" || !team.name.trim() || !Array.isArray(team.players)) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: typeof team.id === "string" && team.id ? team.id : createSlug(team.name),
    ownerUid: typeof team.ownerUid === "string" && team.ownerUid ? team.ownerUid : getSignedInTeamAccount()?.uid,
    ownerEmail: typeof team.ownerEmail === "string" && team.ownerEmail ? team.ownerEmail : getSignedInTeamAccount()?.email,
    name: team.name.trim(),
    timeZone: typeof team.timeZone === "string" && team.timeZone ? team.timeZone : null,
    scheduleSetupCompleted: typeof team.scheduleSetupCompleted === "boolean" ? team.scheduleSetupCompleted : true,
    players: team.players
      .map((player, index) => normalizePlayer(player, index + 1))
      .filter((player): player is Player => Boolean(player)),
    createdAt: typeof team.createdAt === "string" ? team.createdAt : now,
    updatedAt: typeof team.updatedAt === "string" ? team.updatedAt : now,
  };
}

function getSignedInTeamAccount(): TeamAccount | null {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !isFirebaseConfigured()
  ) {
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

function normalizePlayer(player: Partial<Player>, seedOrder: number): Player | null {
  if (!player || typeof player.name !== "string" || !player.name.trim()) {
    return null;
  }

  const fallbackId = createPlayerId(player.name, seedOrder);

  return {
    id: typeof player.id === "string" && player.id ? player.id : fallbackId,
    name: player.name.trim(),
    gender: normalizePlayerGender(player.gender),
    bats: normalizeBattingSide(player.bats),
    throws: normalizeThrowingSide(player.throws),
    primaryPosition: normalizeDefensivePositionPreference(player.primaryPosition),
    speedRating: normalizeSpeedRating(player.speedRating),
    notes: typeof player.notes === "string" && player.notes.trim() ? player.notes.trim() : "Player profile ready for game-day tracking.",
    contactNotes: Array.isArray(player.contactNotes) ? player.contactNotes.filter(Boolean) : [],
    defensiveProfile: normalizeDefensiveProfile(player.defensiveProfile),
    roleHint: typeof player.roleHint === "string" && player.roleHint.trim() ? player.roleHint.trim() : defaultRoleHint(seedOrder),
    isActive: typeof player.isActive === "boolean" ? player.isActive : true,
    seedOrder,
    seasonStats: normalizeStats(player.seasonStats),
  };
}

function normalizeStats(stats: Partial<PlayerStats> | undefined): PlayerStats {
  const fallback = createZeroPlayerStats();

  if (!stats) {
    return fallback;
  }

  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => [
      key,
      normalizeStatValue(stats[key as keyof PlayerStats], value),
    ]),
  ) as PlayerStats;
}

function normalizeStatValue(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function splitContactNotes(value: string) {
  return value
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

function createPlayerId(name: string, seedOrder: number) {
  const suffix = Date.now().toString(36);
  const slug = createSlug(name) || `player-${seedOrder}`;

  return `${slug}-${suffix}`;
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultRoleHint(seedOrder: number) {
  if (seedOrder === 1) return "High OBP table-setter";
  if (seedOrder <= 3) return "Contact hitter";
  if (seedOrder <= 5) return "Power hitter";
  return "Roster hitter";
}

function normalizeBattingSide(value: unknown): BattingSide {
  return value === "Right" || value === "Left" || value === "Switch" || value === "Unknown" ? value : "Unknown";
}

function normalizeThrowingSide(value: unknown): ThrowingSide {
  return value === "Right" || value === "Left" || value === "Unknown" ? value : "Unknown";
}

function normalizeSpeedRating(value: unknown): SpeedRating {
  return value === "Fast" || value === "Slow" || value === "Average" ? value : "Average";
}

function normalizePlayerGender(value: unknown): PlayerGender {
  return value === "Female" || value === "Male" ? value : "Unknown";
}

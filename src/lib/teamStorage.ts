"use client";

import { useSyncExternalStore } from "react";
import { createZeroStats } from "./statCalculations.ts";
import type { ActiveTeam, BattingSide, Player, PlayerGender, PlayerProfileInput, SpeedRating, ThrowingSide } from "@/types/player";
import type { PlayerStats } from "@/types/stats";

const storageKey = "baseball-tracker:active-team:v1";
const storageEventName = "baseball-tracker:active-team-updated";

let cachedRaw: string | null | undefined;
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
    primaryPosition: input.primaryPosition.trim(),
    speedRating: normalizeSpeedRating(input.speedRating),
    notes: notes || "Player profile ready for game-day tracking.",
    contactNotes: splitContactNotes(input.contactNotes),
    roleHint,
    isActive: input.isActive,
    seedOrder,
    seasonStats: normalizeStats(input.startingStats),
  };
}

export function createActiveTeam(name: string, players: Player[]): ActiveTeam {
  const now = new Date().toISOString();

  return {
    id: createSlug(name.trim()) || `team-${Date.now()}`,
    name: name.trim(),
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

  if (raw === cachedRaw) {
    return cachedTeam ?? null;
  }

  if (!raw) {
    cachedRaw = raw;
    cachedTeam = null;
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActiveTeam;
    cachedRaw = raw;
    cachedTeam = normalizeActiveTeam(parsed);
    return cachedTeam;
  } catch {
    cachedRaw = raw;
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
      headers: {
        "Content-Type": "application/json",
      },
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

export async function loadAvailableTeamsFromBackend() {
  const activeTeam = loadActiveTeam();

  try {
    const response = await fetch("/api/team?list=1", { cache: "no-store" });

    if (!response.ok) {
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
  } catch {
    return activeTeam ? [activeTeam] : [];
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
      headers: {
        "Content-Type": "application/json",
      },
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

export async function hydrateActiveTeamFromBackend() {
  if (typeof window === "undefined") {
    return null;
  }

  const activeTeam = loadActiveTeam();
  const query = activeTeam?.id ? `?teamId=${encodeURIComponent(activeTeam.id)}` : "";

  try {
    const response = await fetch(`/api/team${query}`, { cache: "no-store" });

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
  cachedTeam = nextTeam;
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new Event(storageEventName));
}

function queueActiveTeamBackendSync(team: ActiveTeam) {
  fetch("/api/team", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ team }),
  })
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
    name: team.name.trim(),
    players: team.players
      .map((player, index) => normalizePlayer(player, index + 1))
      .filter((player): player is Player => Boolean(player)),
    createdAt: typeof team.createdAt === "string" ? team.createdAt : now,
    updatedAt: typeof team.updatedAt === "string" ? team.updatedAt : now,
  };
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
    primaryPosition: typeof player.primaryPosition === "string" ? player.primaryPosition : "",
    speedRating: normalizeSpeedRating(player.speedRating),
    notes: typeof player.notes === "string" && player.notes.trim() ? player.notes.trim() : "Player profile ready for game-day tracking.",
    contactNotes: Array.isArray(player.contactNotes) ? player.contactNotes.filter(Boolean) : [],
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

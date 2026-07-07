import { normalizeDefensivePositionPreference, normalizeDefensiveProfile } from "./defenseEngine.ts";
import { fromPersistedStatsData } from "./playerStatsPersistence.ts";
import type { BattingSide, Player, PlayerGender, PlayerProfileInput, SpeedRating, ThrowingSide } from "@/types/player";
import type { PlayerStats } from "@/types/stats";

export function createPlayerFromProfileInput(input: PlayerProfileInput, seedOrder: number, playerId: string): Player {
  const name = input.name.trim();
  const notes = input.notes.trim();

  return {
    id: playerId,
    name,
    gender: normalizePlayerGender(input.gender),
    bats: normalizeBattingSide(input.bats),
    throws: normalizeThrowingSide(input.throws),
    primaryPosition: normalizeDefensivePositionPreference(input.primaryPosition),
    speedRating: normalizeSpeedRating(input.speedRating),
    notes: notes || "Player profile ready for game-day tracking.",
    contactNotes: splitContactNotes(input.contactNotes),
    defensiveProfile: normalizeDefensiveProfile(input.defensiveProfile),
    roleHint: input.roleHint,
    isActive: input.isActive,
    seedOrder,
    seasonStats: normalizePlayerStats(input.startingStats),
  };
}

export function normalizePlayerStats(stats: Partial<PlayerStats> | undefined): PlayerStats {
  return fromPersistedStatsData(stats);
}

function splitContactNotes(value: string) {
  return value
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeBattingSide(value: unknown): BattingSide {
  return isBattingSide(value) ? value : "Unknown";
}

export function normalizeThrowingSide(value: unknown): ThrowingSide {
  return isThrowingSide(value) ? value : "Unknown";
}

export function normalizeSpeedRating(value: unknown): SpeedRating {
  return isSpeedRating(value) ? value : "Average";
}

export function normalizePlayerGender(value: unknown): PlayerGender {
  return isPlayerGender(value) ? value : "Unknown";
}

const battingSides = new Set<BattingSide>(["Right", "Left", "Switch", "Unknown"]);
const throwingSides = new Set<ThrowingSide>(["Right", "Left", "Unknown"]);
const speedRatings = new Set<SpeedRating>(["Fast", "Slow", "Average"]);
const playerGenders = new Set<PlayerGender>(["Female", "Male", "Unknown"]);

function isBattingSide(value: unknown): value is BattingSide {
  return typeof value === "string" && battingSides.has(value as BattingSide);
}

function isThrowingSide(value: unknown): value is ThrowingSide {
  return typeof value === "string" && throwingSides.has(value as ThrowingSide);
}

function isSpeedRating(value: unknown): value is SpeedRating {
  return typeof value === "string" && speedRatings.has(value as SpeedRating);
}

function isPlayerGender(value: unknown): value is PlayerGender {
  return typeof value === "string" && playerGenders.has(value as PlayerGender);
}

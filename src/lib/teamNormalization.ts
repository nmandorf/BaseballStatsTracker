import type { ActiveTeam, Player } from "@/types/player";
import type { TeamAccount } from "./teamAccount.ts";
import {
  normalizeDefensivePositionPreference,
  normalizeDefensiveProfile,
} from "./defenseEngine.ts";
import {
  normalizeBattingSide,
  normalizePlayerGender,
  normalizePlayerStats,
  normalizeSpeedRating,
  normalizeThrowingSide,
} from "./playerProfileInput.ts";
import {
  createPlayerId,
  getDefaultRoleHint,
} from "./playerFactory.ts";
import { createSlug } from "./playerProfileInput.ts";

export function normalizeActiveTeam(
  team: Partial<ActiveTeam>,
  signedInAccount: TeamAccount | null,
): ActiveTeam | null {
  if (!isNormalizableTeam(team)) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: getNonEmptyString(team.id, createSlug(team.name)),
    ownerUid: getNonEmptyString(
      team.ownerUid,
      signedInAccount?.uid,
    ),
    ownerEmail: getNonEmptyString(
      team.ownerEmail,
      signedInAccount?.email,
    ),
    name: team.name.trim(),
    timeZone: getNonEmptyString(team.timeZone, null),
    scheduleSetupCompleted:
      typeof team.scheduleSetupCompleted === "boolean"
        ? team.scheduleSetupCompleted
        : true,
    players: normalizeTeamPlayers(team.players),
    createdAt: getNonEmptyString(team.createdAt, now),
    updatedAt: getNonEmptyString(team.updatedAt, now),
  };
}

function normalizeTeamPlayers(players: Partial<Player>[]) {
  return players
    .map((player, index) => normalizePlayer(player, index + 1))
    .filter((player): player is Player => Boolean(player));
}

function normalizePlayer(
  player: Partial<Player>,
  seedOrder: number,
): Player | null {
  if (!isNormalizablePlayer(player)) {
    return null;
  }

  return {
    id: getNonEmptyString(
      player.id,
      createPlayerId(player.name, seedOrder),
    ),
    name: player.name.trim(),
    gender: normalizePlayerGender(player.gender),
    bats: normalizeBattingSide(player.bats),
    throws: normalizeThrowingSide(player.throws),
    primaryPosition: normalizeDefensivePositionPreference(
      player.primaryPosition,
    ),
    speedRating: normalizeSpeedRating(player.speedRating),
    notes: getPlayerNotes(player.notes),
    contactNotes: normalizeContactNotes(player.contactNotes),
    defensiveProfile: normalizeDefensiveProfile(
      player.defensiveProfile,
    ),
    roleHint: getPlayerRoleHint(player.roleHint, seedOrder),
    isActive:
      typeof player.isActive === "boolean" ? player.isActive : true,
    seedOrder,
    seasonStats: normalizePlayerStats(player.seasonStats),
  };
}

function isNormalizableTeam(
  team: Partial<ActiveTeam>,
): team is Partial<ActiveTeam> &
  Pick<ActiveTeam, "name" | "players"> {
  return (
    Boolean(team) &&
    typeof team.name === "string" &&
    Boolean(team.name.trim()) &&
    Array.isArray(team.players)
  );
}

function isNormalizablePlayer(
  player: Partial<Player>,
): player is Partial<Player> & Pick<Player, "name"> {
  return (
    Boolean(player) &&
    typeof player.name === "string" &&
    Boolean(player.name.trim())
  );
}

function getPlayerNotes(notes: unknown) {
  return typeof notes === "string" && notes.trim()
    ? notes.trim()
    : "Player profile ready for game-day tracking.";
}

function normalizeContactNotes(contactNotes: unknown) {
  return Array.isArray(contactNotes)
    ? contactNotes.filter(Boolean)
    : [];
}

function getPlayerRoleHint(roleHint: unknown, seedOrder: number) {
  return typeof roleHint === "string" && roleHint.trim()
    ? roleHint.trim()
    : getDefaultRoleHint(seedOrder);
}

function getNonEmptyString(
  value: unknown,
  fallback: string,
): string;
function getNonEmptyString(
  value: unknown,
  fallback: string | undefined,
): string | undefined;
function getNonEmptyString(
  value: unknown,
  fallback: string | null,
): string | null;
function getNonEmptyString(
  value: unknown,
  fallback: string | null | undefined,
): string | null | undefined;
function getNonEmptyString(
  value: unknown,
  fallback: string | null | undefined,
) {
  return typeof value === "string" && value ? value : fallback;
}

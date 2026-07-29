import { Prisma } from "@/generated/prisma/client";
import {
  BattingSide as PrismaBattingSide,
  DefensiveRating as PrismaDefensiveRating,
  PlayerGender as PrismaPlayerGender,
  SpeedRating as PrismaSpeedRating,
  ThrowingSide as PrismaThrowingSide,
} from "@/generated/prisma/enums";
import type { DefensiveRatingValue } from "@/types/defense";
import type {
  ActiveTeam,
  BattingSide,
  Player,
  PlayerGender,
  SpeedRating,
  ThrowingSide,
} from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import {
  normalizeDefensivePositionPreference,
  normalizeDefensiveProfile,
} from "./defenseEngine.ts";
import { toPlayerPersistenceData } from "./playerPersistenceData.ts";
import {
  fromPersistedStatsData,
} from "./playerStatsPersistence.ts";

const currentSeasonYear = new Date().getFullYear();

export const teamInclude = {
  players: {
    orderBy: [
      { seedOrder: "asc" as const },
      { createdAt: "asc" as const },
    ],
    include: {
      seasonStats: {
        where: { season: currentSeasonYear },
        take: 1,
      },
    },
  },
} satisfies Prisma.TeamInclude;

type TeamWithPlayers = Prisma.TeamGetPayload<{
  include: typeof teamInclude;
}>;
type TeamPlayerRecord = TeamWithPlayers["players"][number];

export function serializeTeam(team: TeamWithPlayers): ActiveTeam {
  return {
    id: team.id,
    ownerUid: team.ownerUid,
    ownerEmail: team.ownerEmail,
    name: team.name,
    timeZone: team.timeZone,
    scheduleSetupCompleted: team.scheduleSetupCompleted,
    players: team.players.map(serializeTeamPlayer),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

export function toPlayerCreate(teamId: string, player: Player) {
  return {
    id: player.id,
    teamId,
    ...toPlayerUpdate(player),
  };
}

export function toPlayerUpdate(player: Player) {
  return toPlayerPersistenceData(player, {
    gender: toPrismaPlayerGender,
    bats: toPrismaBattingSide,
    throws: toPrismaThrowingSide,
    speedRating: toPrismaSpeedRating,
    defensiveRating: toPrismaDefensiveRating,
  });
}

export function fromStatsData(
  stats: Partial<PlayerStats> | null | undefined,
): PlayerStats {
  return fromPersistedStatsData(stats);
}

export function getDefaultBackendRoleHint(seedOrder: number) {
  if (seedOrder === 1) return "Table-setter";
  if (seedOrder <= 5) return "Run producer";
  return "Contact depth";
}

function serializeTeamPlayer(
  player: TeamPlayerRecord,
  index: number,
): Player {
  const seedOrder = player.seedOrder ?? index + 1;

  return {
    id: player.id,
    name: player.name,
    gender: fromPrismaPlayerGender(player.gender),
    bats: fromPrismaBattingSide(player.bats),
    throws: fromPrismaThrowingSide(player.throws),
    primaryPosition: normalizeDefensivePositionPreference(
      player.primaryPosition,
    ),
    speedRating: fromPrismaSpeedRating(player.speedRating),
    notes: player.notes ?? defaultPlayerNotes,
    contactNotes: player.contactNotes,
    defensiveProfile: serializeDefensiveProfile(player),
    roleHint: player.roleHint ?? getDefaultBackendRoleHint(seedOrder),
    isActive: player.isActive,
    seedOrder,
    seasonStats: fromStatsData(player.seasonStats[0]),
  };
}

const defaultPlayerNotes = "Player profile ready for game-day tracking.";

function serializeDefensiveProfile(player: TeamPlayerRecord) {
  return normalizeDefensiveProfile({
      ratings: {
        armStrength: fromPrismaDefensiveRating(player.armStrength),
        throwAccuracy: fromPrismaDefensiveRating(player.throwAccuracy),
        gloveSkill: fromPrismaDefensiveRating(player.gloveSkill),
        range: fromPrismaDefensiveRating(player.rangeRating),
        positionConfidence: fromPrismaDefensiveRating(player.positionConfidence),
      },
      notes: {
        strengths: optionalText(player.defenseStrengths),
        weaknesses: optionalText(player.defenseWeaknesses),
        bestPosition: optionalText(player.bestDefensePosition),
        avoidPosition: optionalText(player.avoidDefensePosition),
        backupPosition: optionalText(player.backupDefensePosition),
        communication: optionalText(player.defenseCommunicationNotes),
        health: optionalText(player.defenseHealthNotes),
      },
    });
}

function optionalText(value: string | null) {
  return value ?? "";
}

function toPrismaBattingSide(value: BattingSide) {
  if (value === "Right") return PrismaBattingSide.RIGHT;
  if (value === "Left") return PrismaBattingSide.LEFT;
  if (value === "Switch") return PrismaBattingSide.SWITCH;
  return PrismaBattingSide.UNKNOWN;
}

function toPrismaThrowingSide(value: ThrowingSide) {
  if (value === "Right") return PrismaThrowingSide.RIGHT;
  if (value === "Left") return PrismaThrowingSide.LEFT;
  return PrismaThrowingSide.UNKNOWN;
}

function toPrismaSpeedRating(value: SpeedRating) {
  if (value === "Fast") return PrismaSpeedRating.FAST;
  if (value === "Slow") return PrismaSpeedRating.SLOW;
  return PrismaSpeedRating.AVERAGE;
}

function toPrismaPlayerGender(value: PlayerGender) {
  if (value === "Female") return PrismaPlayerGender.FEMALE;
  if (value === "Male") return PrismaPlayerGender.MALE;
  return PrismaPlayerGender.UNKNOWN;
}

function fromPrismaBattingSide(
  value: PrismaBattingSide,
): BattingSide {
  if (value === PrismaBattingSide.RIGHT) return "Right";
  if (value === PrismaBattingSide.LEFT) return "Left";
  if (value === PrismaBattingSide.SWITCH) return "Switch";
  return "Unknown";
}

function fromPrismaThrowingSide(
  value: PrismaThrowingSide,
): ThrowingSide {
  if (value === PrismaThrowingSide.RIGHT) return "Right";
  if (value === PrismaThrowingSide.LEFT) return "Left";
  return "Unknown";
}

function fromPrismaSpeedRating(
  value: PrismaSpeedRating,
): SpeedRating {
  if (value === PrismaSpeedRating.FAST) return "Fast";
  if (value === PrismaSpeedRating.SLOW) return "Slow";
  return "Average";
}

function fromPrismaPlayerGender(
  value: PrismaPlayerGender,
): PlayerGender {
  if (value === PrismaPlayerGender.FEMALE) return "Female";
  if (value === PrismaPlayerGender.MALE) return "Male";
  return "Unknown";
}

function toPrismaDefensiveRating(value: DefensiveRatingValue) {
  if (value === "Low") return PrismaDefensiveRating.LOW;
  if (value === "Medium") return PrismaDefensiveRating.MEDIUM;
  if (value === "High") return PrismaDefensiveRating.HIGH;
  return null;
}

function fromPrismaDefensiveRating(
  value: PrismaDefensiveRating | null,
): DefensiveRatingValue {
  if (value === PrismaDefensiveRating.LOW) return "Low";
  if (value === PrismaDefensiveRating.MEDIUM) return "Medium";
  if (value === PrismaDefensiveRating.HIGH) return "High";
  return "Unknown";
}

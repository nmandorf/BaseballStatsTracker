import { Prisma } from "@/generated/prisma/client";
import {
  BattingSide as PrismaBattingSide,
  DefensiveRating as PrismaDefensiveRating,
  PlayerGender as PrismaPlayerGender,
  SpeedRating as PrismaSpeedRating,
  ThrowingSide as PrismaThrowingSide,
} from "@/generated/prisma/enums";
import { notFoundError, validationError } from "@/lib/appErrors";
import { normalizeDefensivePositionPreference, normalizeDefensiveProfile } from "@/lib/defenseEngine";
import { toPlayerPersistenceData } from "@/lib/playerPersistenceData";
import { createPlayerFromProfileInput, createSlug } from "@/lib/playerProfileInput";
import { fromPersistedStatsData, toPersistedStatsData } from "@/lib/playerStatsPersistence";
import { getPrisma } from "@/lib/prisma";
import { getSeasonStatsProgress } from "@/lib/seasonStatRules";
import { legacyTeamAccount, type TeamAccount } from "@/lib/teamAccount";
import type { ActiveTeam, BattingSide, Player, PlayerGender, PlayerProfileInput, SpeedRating, ThrowingSide } from "@/types/player";
import type { DefensiveRatingValue } from "@/types/defense";
import type { PlayerStats } from "@/types/stats";

const defaultSeasonYear = new Date().getFullYear();

type TeamWithPlayers = Awaited<ReturnType<typeof fetchTeamById>>;
type TeamPlayerRecord = NonNullable<TeamWithPlayers>["players"][number];

export async function listTeamsFromBackend(account: TeamAccount = legacyTeamAccount) {
  const prisma = getPrisma();
  const teams = await prisma.team.findMany({
    where: { ownerUid: account.uid },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: teamInclude(),
  });

  return teams.map((team) => serializeTeam(team));
}

export async function loadTeamFromBackend(
  teamId?: string,
  account: TeamAccount = legacyTeamAccount,
) {
  const prisma = getPrisma();
  const team = teamId
    ? await fetchTeamById(teamId, account)
    : await prisma.team.findFirst({
        where: { ownerUid: account.uid },
        orderBy: { updatedAt: "desc" },
        include: teamInclude(),
      });

  return team ? serializeTeam(team) : null;
}

export async function createTeamInBackend(
  name: string,
  account: TeamAccount = legacyTeamAccount,
  seasonYear = defaultSeasonYear,
) {
  const teamName = name.trim();

  if (!teamName) {
    throw validationError("TEAM_NAME_REQUIRED", "Team name is required.", { field: "name" });
  }

  const prisma = getPrisma();
  const team = await prisma.$transaction(async (tx) => {
    const savedTeam = await tx.team.upsert({
      where: {
        ownerUid_name: {
          ownerUid: account.uid,
          name: teamName,
        },
      },
      create: {
        name: teamName,
        ownerUid: account.uid,
        ownerEmail: account.email,
        scheduleSetupCompleted: false,
      },
      update: {
        name: teamName,
        ownerEmail: account.email,
      },
    });

    await tx.season.upsert({
      where: {
        teamId_year: {
          teamId: savedTeam.id,
          year: seasonYear,
        },
      },
      create: {
        teamId: savedTeam.id,
        year: seasonYear,
        label: `${seasonYear} Season`,
      },
      update: {
        label: `${seasonYear} Season`,
      },
    });

    return savedTeam;
  });

  return loadTeamFromBackend(team.id, account);
}

export async function deleteTeamFromBackend(
  teamId: string,
  account: TeamAccount = legacyTeamAccount,
) {
  const prisma = getPrisma();
  const deletion = await prisma.team.deleteMany({
    where: {
      id: teamId,
      ownerUid: account.uid,
    },
  });

  if (deletion.count === 0) {
    throw notFoundError("TEAM_NOT_FOUND", "Team not found.", { teamId });
  }

  return { teamId };
}

export async function upsertActiveTeamInBackend(
  team: ActiveTeam,
  account: TeamAccount = legacyTeamAccount,
  seasonYear = defaultSeasonYear,
) {
  const prisma = getPrisma();
  const savedTeamId = await prisma.$transaction((tx) =>
    upsertActiveTeamInTransaction(tx, team, account, seasonYear),
  );

  return loadTeamFromBackend(savedTeamId, account);
}

async function upsertActiveTeamInTransaction(
  tx: Prisma.TransactionClient,
  team: ActiveTeam,
  account: TeamAccount,
  seasonYear: number,
) {
  const savedTeam = await upsertTeamRecord(tx, team, account);
  const season = await upsertTeamSeason(tx, savedTeam.id, seasonYear);

  for (const player of team.players) {
    await upsertActiveTeamPlayer(tx, savedTeam.id, season.id, player, seasonYear);
  }

  return savedTeam.id;
}

async function upsertTeamRecord(
  tx: Prisma.TransactionClient,
  team: ActiveTeam,
  account: TeamAccount,
) {
  const existingTeam = await tx.team.findFirst({
    where: {
      ownerUid: account.uid,
      OR: [{ id: team.id }, { name: team.name }],
    },
  });

  return existingTeam
    ? tx.team.update({
        where: { id: existingTeam.id },
        data: {
          name: team.name,
          ownerEmail: account.email,
        },
      })
    : tx.team.create({
        data: {
          id: team.id,
          name: team.name,
          ownerUid: account.uid,
          ownerEmail: account.email,
        },
      });
}

async function upsertTeamSeason(
  tx: Prisma.TransactionClient,
  teamId: string,
  seasonYear: number,
) {
  return tx.season.upsert({
    where: {
      teamId_year: {
        teamId,
        year: seasonYear,
      },
    },
    create: {
      teamId,
      year: seasonYear,
      label: `${seasonYear} Season`,
    },
    update: {
      label: `${seasonYear} Season`,
    },
  });
}

async function upsertActiveTeamPlayer(
  tx: Prisma.TransactionClient,
  teamId: string,
  seasonId: string,
  player: Player,
  seasonYear: number,
) {
  const savedPlayer = await tx.player.upsert({
    where: {
      teamId_name: {
        teamId,
        name: player.name,
      },
    },
    create: toPlayerCreate(teamId, player),
    update: toPlayerUpdate(player),
  });
  const existingPlayerSeasonStats = await findPlayerSeasonStats(tx, savedPlayer.id, seasonYear);

  if (!shouldPersistIncomingSeasonStats(toExistingPlayerSeasonStats(existingPlayerSeasonStats), player.seasonStats)) {
    return;
  }

  await upsertPlayerSeasonStats(tx, savedPlayer.id, seasonId, seasonYear, player.seasonStats);
}

function findPlayerSeasonStats(
  tx: Prisma.TransactionClient,
  playerId: string,
  seasonYear: number,
) {
  return tx.playerSeasonStats.findUnique({
    where: {
      playerId_season: {
        playerId,
        season: seasonYear,
      },
    },
  });
}

function toExistingPlayerSeasonStats(existingPlayerSeasonStats: Partial<PlayerStats> | null) {
  return existingPlayerSeasonStats ? fromStatsData(existingPlayerSeasonStats) : null;
}

async function upsertPlayerSeasonStats(
  tx: Prisma.TransactionClient,
  playerId: string,
  seasonId: string,
  seasonYear: number,
  seasonStats: PlayerStats,
) {
  await tx.playerSeasonStats.upsert({
    where: {
      playerId_season: {
        playerId,
        season: seasonYear,
      },
    },
    create: {
      playerId,
      seasonId,
      season: seasonYear,
      gamesPlayed: seasonStats.gamesPlayed,
      ...toPersistedStatsData(seasonStats),
    },
    update: {
      seasonId,
      gamesPlayed: seasonStats.gamesPlayed,
      ...toPersistedStatsData(seasonStats),
    },
  });
}

function shouldPersistIncomingSeasonStats(
  existingSeasonStats: PlayerStats | null,
  incomingSeasonStats: PlayerStats,
) {
  if (!existingSeasonStats) {
    return true;
  }

  return getSeasonStatsProgress(incomingSeasonStats) >= getSeasonStatsProgress(existingSeasonStats);
}

export async function addPlayerToTeamInBackend(
  teamId: string,
  input: PlayerProfileInput,
  seedOrder?: number,
  account: TeamAccount = legacyTeamAccount,
  seasonYear = defaultSeasonYear,
) {
  const playerName = input.name.trim();

  if (!playerName) {
    throw validationError("PLAYER_NAME_REQUIRED", "Player name is required.", { field: "name" });
  }

  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const team = await tx.team.findFirst({
      where: {
        id: teamId,
        ownerUid: account.uid,
      },
      include: { _count: { select: { players: true } } },
    });

    if (!team) {
      throw notFoundError("TEAM_NOT_FOUND", "Team not found.", { teamId });
    }

    const season = await tx.season.upsert({
      where: {
        teamId_year: {
          teamId: team.id,
          year: seasonYear,
        },
      },
      create: {
        teamId: team.id,
        year: seasonYear,
        label: `${seasonYear} Season`,
      },
      update: {
        label: `${seasonYear} Season`,
      },
    });
    const player = createBackendPlayerFromInput(input, seedOrder ?? team._count.players + 1);

    const savedPlayer = await tx.player.upsert({
      where: {
        teamId_name: {
          teamId: team.id,
          name: player.name,
        },
      },
      create: toPlayerCreate(team.id, player),
      update: toPlayerUpdate(player),
    });
    await tx.playerSeasonStats.upsert({
      where: {
        playerId_season: {
          playerId: savedPlayer.id,
          season: seasonYear,
        },
      },
      create: {
        playerId: savedPlayer.id,
        seasonId: season.id,
        season: seasonYear,
        gamesPlayed: player.seasonStats.gamesPlayed,
        ...toPersistedStatsData(player.seasonStats),
      },
      update: {
        seasonId: season.id,
        gamesPlayed: player.seasonStats.gamesPlayed,
        ...toPersistedStatsData(player.seasonStats),
      },
    });
  });

  return loadTeamFromBackend(teamId, account);
}

function createBackendPlayerFromInput(input: PlayerProfileInput, seedOrder: number): Player {
  const name = input.name.trim();
  const roleHint = input.roleHint.trim() || defaultRoleHint(seedOrder);
  return createPlayerFromProfileInput({ ...input, roleHint }, seedOrder, createPlayerId(name, seedOrder));
}

async function fetchTeamById(
  teamId: string,
  account: TeamAccount = legacyTeamAccount,
) {
  const prisma = getPrisma();

  return prisma.team.findFirst({
    where: {
      id: teamId,
      ownerUid: account.uid,
    },
    include: teamInclude(),
  });
}

function teamInclude() {
  return {
    players: {
      orderBy: [{ seedOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        seasonStats: {
          where: { season: defaultSeasonYear },
          take: 1,
        },
      },
    },
  };
}

function serializeTeam(team: NonNullable<TeamWithPlayers>): ActiveTeam {
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

function serializeTeamPlayer(player: TeamPlayerRecord, index: number): Player {
  const seedOrder = getSerializedPlayerSeedOrder(player, index);

  return {
    id: player.id,
    name: player.name,
    gender: fromPrismaPlayerGender(player.gender),
    bats: fromPrismaBattingSide(player.bats),
    throws: fromPrismaThrowingSide(player.throws),
    primaryPosition: normalizeDefensivePositionPreference(player.primaryPosition),
    speedRating: fromPrismaSpeedRating(player.speedRating),
    notes: player.notes ?? "Player profile ready for game-day tracking.",
    contactNotes: player.contactNotes,
    defensiveProfile: normalizeDefensiveProfile({
      ratings: getSerializedDefensiveRatings(player),
      notes: getSerializedDefensiveNotes(player),
    }),
    roleHint: player.roleHint ?? defaultRoleHint(seedOrder),
    isActive: player.isActive,
    seedOrder,
    seasonStats: fromStatsData(player.seasonStats[0]),
  };
}

function getSerializedPlayerSeedOrder(player: TeamPlayerRecord, index: number) {
  return player.seedOrder ?? index + 1;
}

function getSerializedDefensiveRatings(player: TeamPlayerRecord) {
  return {
    armStrength: fromPrismaDefensiveRating(player.armStrength),
    throwAccuracy: fromPrismaDefensiveRating(player.throwAccuracy),
    gloveSkill: fromPrismaDefensiveRating(player.gloveSkill),
    range: fromPrismaDefensiveRating(player.rangeRating),
    positionConfidence: fromPrismaDefensiveRating(player.positionConfidence),
  };
}

function getSerializedDefensiveNotes(player: TeamPlayerRecord) {
  return {
    strengths: emptyString(player.defenseStrengths),
    weaknesses: emptyString(player.defenseWeaknesses),
    bestPosition: emptyString(player.bestDefensePosition),
    avoidPosition: emptyString(player.avoidDefensePosition),
    backupPosition: emptyString(player.backupDefensePosition),
    communication: emptyString(player.defenseCommunicationNotes),
    health: emptyString(player.defenseHealthNotes),
  };
}

function emptyString(value: string | null) {
  return value ?? "";
}

function toPlayerCreate(teamId: string, player: Player) {
  return {
    id: player.id,
    teamId,
    ...toPlayerUpdate(player),
  };
}

function toPlayerUpdate(player: Player) {
  return toPlayerPersistenceData(player, {
    gender: toPrismaPlayerGender,
    bats: toPrismaBattingSide,
    throws: toPrismaThrowingSide,
    speedRating: toPrismaSpeedRating,
    defensiveRating: toPrismaDefensiveRating,
  });
}

function fromStatsData(stats: Partial<PlayerStats> | null | undefined): PlayerStats {
  return fromPersistedStatsData(stats);
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

function fromPrismaBattingSide(value: PrismaBattingSide): BattingSide {
  if (value === PrismaBattingSide.RIGHT) return "Right";
  if (value === PrismaBattingSide.LEFT) return "Left";
  if (value === PrismaBattingSide.SWITCH) return "Switch";
  return "Unknown";
}

function fromPrismaThrowingSide(value: PrismaThrowingSide): ThrowingSide {
  if (value === PrismaThrowingSide.RIGHT) return "Right";
  if (value === PrismaThrowingSide.LEFT) return "Left";
  return "Unknown";
}

function fromPrismaSpeedRating(value: PrismaSpeedRating): SpeedRating {
  if (value === PrismaSpeedRating.FAST) return "Fast";
  if (value === PrismaSpeedRating.SLOW) return "Slow";
  return "Average";
}

function fromPrismaPlayerGender(value: PrismaPlayerGender): PlayerGender {
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

function fromPrismaDefensiveRating(value: PrismaDefensiveRating | null): DefensiveRatingValue {
  if (value === PrismaDefensiveRating.LOW) return "Low";
  if (value === PrismaDefensiveRating.MEDIUM) return "Medium";
  if (value === PrismaDefensiveRating.HIGH) return "High";
  return "Unknown";
}

function createPlayerId(name: string, seedOrder: number) {
  const slug = createSlug(name);

  return slug ? `${slug}-${seedOrder}` : `player-${seedOrder}`;
}

function defaultRoleHint(seedOrder: number) {
  if (seedOrder === 1) return "Table-setter";
  if (seedOrder <= 5) return "Run producer";
  return "Contact depth";
}

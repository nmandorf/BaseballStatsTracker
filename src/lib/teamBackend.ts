import {
  BattingSide as PrismaBattingSide,
  DefensiveRating as PrismaDefensiveRating,
  PlayerGender as PrismaPlayerGender,
  SpeedRating as PrismaSpeedRating,
  ThrowingSide as PrismaThrowingSide,
} from "@/generated/prisma/enums";
import { notFoundError, validationError } from "@/lib/appErrors";
import { normalizeDefensivePositionPreference, normalizeDefensiveProfile } from "@/lib/defenseEngine";
import { getPrisma } from "@/lib/prisma";
import { legacyTeamAccount, type TeamAccount } from "@/lib/teamAccount";
import type { ActiveTeam, BattingSide, Player, PlayerGender, PlayerProfileInput, SpeedRating, ThrowingSide } from "@/types/player";
import type { DefensiveRatingValue } from "@/types/defense";
import type { PlayerStats } from "@/types/stats";

const defaultSeasonYear = new Date().getFullYear();

type TeamWithPlayers = Awaited<ReturnType<typeof fetchTeamById>>;

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

export async function upsertActiveTeamInBackend(
  team: ActiveTeam,
  account: TeamAccount = legacyTeamAccount,
  seasonYear = defaultSeasonYear,
) {
  const prisma = getPrisma();
  let savedTeamId = team.id;

  await prisma.$transaction(async (tx) => {
    const existingTeam = await tx.team.findFirst({
      where: {
        ownerUid: account.uid,
        OR: [{ id: team.id }, { name: team.name }],
      },
    });
    const savedTeam = existingTeam
      ? await tx.team.update({
          where: { id: existingTeam.id },
          data: {
            name: team.name,
            ownerEmail: account.email,
          },
        })
      : await tx.team.create({
          data: {
            id: team.id,
            name: team.name,
            ownerUid: account.uid,
            ownerEmail: account.email,
          },
        });

    savedTeamId = savedTeam.id;
    const season = await tx.season.upsert({
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

    for (const player of team.players) {
      const savedPlayer = await tx.player.upsert({
        where: {
          teamId_name: {
            teamId: savedTeam.id,
            name: player.name,
          },
        },
        create: toPlayerCreate(savedTeam.id, player),
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
          ...toStatsData(player.seasonStats),
        },
        update: {
          seasonId: season.id,
          gamesPlayed: player.seasonStats.gamesPlayed,
          ...toStatsData(player.seasonStats),
        },
      });
    }
  });

  return loadTeamFromBackend(savedTeamId, account);
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
        ...toStatsData(player.seasonStats),
      },
      update: {
        seasonId: season.id,
        gamesPlayed: player.seasonStats.gamesPlayed,
        ...toStatsData(player.seasonStats),
      },
    });
  });

  return loadTeamFromBackend(teamId, account);
}

export function createBackendPlayerFromInput(input: PlayerProfileInput, seedOrder: number): Player {
  const name = input.name.trim();

  return {
    id: createPlayerId(name, seedOrder),
    name,
    gender: normalizePlayerGender(input.gender),
    bats: normalizeBattingSide(input.bats),
    throws: normalizeThrowingSide(input.throws),
    primaryPosition: normalizeDefensivePositionPreference(input.primaryPosition),
    speedRating: normalizeSpeedRating(input.speedRating),
    notes: input.notes.trim() || "Player profile ready for game-day tracking.",
    contactNotes: splitContactNotes(input.contactNotes),
    defensiveProfile: normalizeDefensiveProfile(input.defensiveProfile),
    roleHint: input.roleHint.trim() || defaultRoleHint(seedOrder),
    isActive: input.isActive,
    seedOrder,
    seasonStats: normalizeStats(input.startingStats),
  };
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
    players: team.players.map((player, index) => ({
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
        ratings: {
          armStrength: fromPrismaDefensiveRating(player.armStrength),
          throwAccuracy: fromPrismaDefensiveRating(player.throwAccuracy),
          gloveSkill: fromPrismaDefensiveRating(player.gloveSkill),
          range: fromPrismaDefensiveRating(player.rangeRating),
          positionConfidence: fromPrismaDefensiveRating(player.positionConfidence),
        },
        notes: {
          strengths: player.defenseStrengths ?? "",
          weaknesses: player.defenseWeaknesses ?? "",
          bestPosition: player.bestDefensePosition ?? "",
          avoidPosition: player.avoidDefensePosition ?? "",
          backupPosition: player.backupDefensePosition ?? "",
          communication: player.defenseCommunicationNotes ?? "",
          health: player.defenseHealthNotes ?? "",
        },
      }),
      roleHint: player.roleHint ?? defaultRoleHint(index + 1),
      isActive: player.isActive,
      seedOrder: player.seedOrder ?? index + 1,
      seasonStats: fromStatsData(player.seasonStats[0]),
    })),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

function toPlayerCreate(teamId: string, player: Player) {
  return {
    id: player.id,
    teamId,
    ...toPlayerUpdate(player),
  };
}

function toPlayerUpdate(player: Player) {
  return {
    name: player.name,
    gender: toPrismaPlayerGender(player.gender),
    bats: toPrismaBattingSide(player.bats),
    throws: toPrismaThrowingSide(player.throws),
    primaryPosition: player.primaryPosition || null,
    speedRating: toPrismaSpeedRating(player.speedRating),
    notes: player.notes || null,
    contactNotes: player.contactNotes,
    armStrength: toPrismaDefensiveRating(player.defensiveProfile.ratings.armStrength),
    throwAccuracy: toPrismaDefensiveRating(player.defensiveProfile.ratings.throwAccuracy),
    gloveSkill: toPrismaDefensiveRating(player.defensiveProfile.ratings.gloveSkill),
    rangeRating: toPrismaDefensiveRating(player.defensiveProfile.ratings.range),
    positionConfidence: toPrismaDefensiveRating(player.defensiveProfile.ratings.positionConfidence),
    defenseStrengths: player.defensiveProfile.notes.strengths || null,
    defenseWeaknesses: player.defensiveProfile.notes.weaknesses || null,
    bestDefensePosition: player.defensiveProfile.notes.bestPosition || null,
    avoidDefensePosition: player.defensiveProfile.notes.avoidPosition || null,
    backupDefensePosition: player.defensiveProfile.notes.backupPosition || null,
    defenseCommunicationNotes: player.defensiveProfile.notes.communication || null,
    defenseHealthNotes: player.defensiveProfile.notes.health || null,
    roleHint: player.roleHint,
    seedOrder: player.seedOrder,
    isActive: player.isActive,
  };
}

function toStatsData(stats: PlayerStats) {
  return {
    plateAppearances: stats.plateAppearances,
    atBats: stats.atBats,
    hits: stats.hits,
    singles: stats.singles,
    doubles: stats.doubles,
    triples: stats.triples,
    homeRuns: stats.homeRuns,
    walks: stats.walks,
    reachedOnError: stats.reachedOnError,
    fieldersChoice: stats.fieldersChoice,
    sacFlies: stats.sacFlies,
    outs: stats.outs,
    groundouts: stats.groundouts,
    flyouts: stats.flyouts,
    lineouts: stats.lineouts,
    strikeoutsLooking: stats.strikeoutsLooking,
    strikeoutsSwinging: stats.strikeoutsSwinging,
    otherOuts: stats.otherOuts,
    doublePlays: stats.doublePlays,
    productiveOuts: stats.productiveOuts,
    runs: stats.runs,
    rbis: stats.rbis,
  };
}

function fromStatsData(stats: Partial<PlayerStats> | null | undefined): PlayerStats {
  const fallback = createZeroStats();

  if (!stats) {
    return fallback;
  }

  return {
    gamesPlayed: normalizeNumber(stats.gamesPlayed, 0),
    plateAppearances: normalizeNumber(stats.plateAppearances, 0),
    atBats: normalizeNumber(stats.atBats, 0),
    hits: normalizeNumber(stats.hits, 0),
    singles: normalizeNumber(stats.singles, 0),
    doubles: normalizeNumber(stats.doubles, 0),
    triples: normalizeNumber(stats.triples, 0),
    homeRuns: normalizeNumber(stats.homeRuns, 0),
    walks: normalizeNumber(stats.walks, 0),
    reachedOnError: normalizeNumber(stats.reachedOnError, 0),
    fieldersChoice: normalizeNumber(stats.fieldersChoice, 0),
    sacFlies: normalizeNumber(stats.sacFlies, 0),
    outs: normalizeNumber(stats.outs, 0),
    groundouts: normalizeNumber(stats.groundouts, 0),
    flyouts: normalizeNumber(stats.flyouts, 0),
    lineouts: normalizeNumber(stats.lineouts, 0),
    strikeoutsLooking: normalizeNumber(stats.strikeoutsLooking, 0),
    strikeoutsSwinging: normalizeNumber(stats.strikeoutsSwinging, 0),
    otherOuts: normalizeNumber(stats.otherOuts, 0),
    doublePlays: normalizeNumber(stats.doublePlays, 0),
    productiveOuts: normalizeNumber(stats.productiveOuts, 0),
    runs: normalizeNumber(stats.runs, 0),
    rbis: normalizeNumber(stats.rbis, 0),
  };
}

function normalizeStats(stats: Partial<PlayerStats> | undefined): PlayerStats {
  return fromStatsData(stats);
}

function createZeroStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    reachedOnError: 0,
    fieldersChoice: 0,
    sacFlies: 0,
    outs: 0,
    groundouts: 0,
    flyouts: 0,
    lineouts: 0,
    strikeoutsLooking: 0,
    strikeoutsSwinging: 0,
    otherOuts: 0,
    doublePlays: 0,
    productiveOuts: 0,
    runs: 0,
    rbis: 0,
  };
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
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

function normalizeBattingSide(value: unknown): BattingSide {
  return value === "Right" || value === "Left" || value === "Switch" ? value : "Unknown";
}

function normalizeThrowingSide(value: unknown): ThrowingSide {
  return value === "Right" || value === "Left" ? value : "Unknown";
}

function normalizeSpeedRating(value: unknown): SpeedRating {
  return value === "Fast" || value === "Slow" ? value : "Average";
}

function normalizePlayerGender(value: unknown): PlayerGender {
  return value === "Female" || value === "Male" ? value : "Unknown";
}

function splitContactNotes(value: string) {
  return value
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

function createPlayerId(name: string, seedOrder: number) {
  const slug = createSlug(name);

  return slug ? `${slug}-${seedOrder}` : `player-${seedOrder}`;
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultRoleHint(seedOrder: number) {
  if (seedOrder === 1) return "Table-setter";
  if (seedOrder <= 5) return "Run producer";
  return "Contact depth";
}

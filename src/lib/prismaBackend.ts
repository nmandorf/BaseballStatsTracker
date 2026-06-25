import { Prisma } from "@/generated/prisma/client";
import {
  AdvanceReason as PrismaAdvanceReason,
  BatterResult as PrismaBatterResult,
  BattingSide as PrismaBattingSide,
  DefensiveRating as PrismaDefensiveRating,
  GameResult as PrismaGameResult,
  GameStatus as PrismaGameStatus,
  HomeRunLimitOutcome as PrismaHomeRunLimitOutcome,
  InningHalf as PrismaInningHalf,
  OutType as PrismaOutType,
  PlayerGender as PrismaPlayerGender,
  RunnerEnd as PrismaRunnerEnd,
  RunnerStart as PrismaRunnerStart,
  SpeedRating as PrismaSpeedRating,
  ThrowingSide as PrismaThrowingSide,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { AppError, notFoundError } from "@/lib/appErrors";
import { defaultGameRules, seedPlayers, testTeamName } from "@/lib/seedTeam";
import { legacyTeamAccount, type TeamAccount } from "@/lib/teamAccount";
import { canSaveScheduledGameSnapshot } from "@/lib/gameSnapshotRules";
import { getPlayerGameStats, getTeamGameTotals, occupiedBaseEntries, type GameState } from "@/lib/gameEngine";
import { addStats, createZeroStats } from "@/lib/statCalculations";
import { replaceGameStatsInSeason, subtractStat, subtractStats } from "@/lib/seasonStatRules";
import type { BatterResult, LocalGameStatus, OutType } from "@/types/game";
import type { ActiveTeam, Player } from "@/types/player";
import type { RunnerMovement } from "@/types/runner";
import type { PlayerStats } from "@/types/stats";

type SaveFirstGameSnapshotOptions = {
  gameId?: string;
  seasonYear?: number;
  gameDate?: Date;
  team?: ActiveTeam;
  account?: TeamAccount;
};

type SavedFirstGameSnapshot = {
  teamId: string;
  seasonId: string;
  gameId: string;
  playerCount: number;
  playCount: number;
};

const defaultSeasonYear = new Date().getFullYear();

export function getFirstGameId(seasonYear = defaultSeasonYear, teamId = testTeamName) {
  return `first-game-${teamId}-${seasonYear}`;
}

export async function ensureStarterTeam(
  seasonYear = defaultSeasonYear,
  account: TeamAccount = legacyTeamAccount,
) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.upsert({
      where: {
        ownerUid_name: {
          ownerUid: account.uid,
          name: testTeamName,
        },
      },
      create: {
        name: testTeamName,
        ownerUid: account.uid,
        ownerEmail: account.email,
      },
      update: {},
    });
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

    for (const player of seedPlayers) {
      await tx.player.upsert({
        where: {
          teamId_name: {
            teamId: team.id,
            name: player.name,
          },
        },
        create: toPlayerCreate(team.id, player),
        update: toPlayerUpdate(player),
      });
    }

    await tx.teamRecord.upsert({
      where: {
        teamId_seasonId_label: {
          teamId: team.id,
          seasonId: season.id,
          label: "Overall",
        },
      },
      create: {
        teamId: team.id,
        seasonId: season.id,
        label: "Overall",
      },
      update: {},
    });

    return { team, season };
  });
}

export async function saveFirstGameSnapshotToPrisma(
  state: GameState,
  options: SaveFirstGameSnapshotOptions = {},
): Promise<SavedFirstGameSnapshot> {
  const prisma = getPrisma();
  const seasonYear = options.seasonYear ?? defaultSeasonYear;
  const account = options.account ?? legacyTeamAccount;

  return prisma.$transaction(async (tx) => {
    const team = await upsertSnapshotTeam(tx, options.team, account);
    const scheduledGameId = options.gameId ?? state.gameId;
    const gameId = scheduledGameId ?? getFirstGameId(seasonYear, team.id);
    const existingGame = await tx.game.findFirst({
      where: { id: gameId, teamId: team.id },
      select: {
        opponentScore: true,
        snapshot: true,
        status: true,
        teamScore: true,
      },
    });

    if (scheduledGameId) {
      if (!existingGame) {
        throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found for this team.", { gameId: scheduledGameId });
      }
      if (!canSaveScheduledGameSnapshot(existingGame.status, state, existingGame.snapshot)) {
        throw new AppError(
          "GAME_NOT_STARTABLE",
          existingGame.status === PrismaGameStatus.FINAL
            ? "Completed games can only save final stat snapshots that are at least as complete as the saved game."
            : "Start this game from its scheduled game screen before saving stats.",
          409,
          { gameId: scheduledGameId, status: existingGame.status },
        );
      }
      if (state.status !== "IN_PROGRESS" && state.status !== "FINAL") {
        throw new AppError("GAME_NOT_STARTABLE", "Only a started scheduled game can save live stats.", 409);
      }
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
    const players = uniquePlayers([...(options.team?.players ?? seedPlayers), ...state.lineup]);

    for (const player of players) {
      await tx.player.upsert({
        where: {
          teamId_name: {
            teamId: team.id,
            name: player.name,
          },
        },
        create: toPlayerCreate(team.id, player),
        update: toPlayerUpdate(player),
      });
    }

    const lineupPlayerIds = state.lineup.map((player) => player.id);
    const existingPlayerGameStats = await tx.playerGameStats.findMany({
      where: { gameId, playerId: { in: lineupPlayerIds } },
    });
    const existingPlayerGameStatsByPlayerId = new Map(
      existingPlayerGameStats.map((stats) => [stats.playerId, fromPlayerStatsRecord(stats)]),
    );
    const existingPlayerSeasonStats = await tx.playerSeasonStats.findMany({
      where: { playerId: { in: lineupPlayerIds }, season: seasonYear },
    });
    const existingPlayerSeasonStatsByPlayerId = new Map(
      existingPlayerSeasonStats.map((stats) => [stats.playerId, fromPlayerStatsRecord(stats)]),
    );
    const existingTeamGameStats = await tx.teamGameStats.findUnique({ where: { gameId } });
    const existingTeamSeasonStats = await tx.teamSeasonStats.findUnique({ where: { seasonId: season.id } });
    const result = state.status === "FINAL" ? getGameResult(state.teamScore, state.opponentScore) : null;
    const game = await tx.game.upsert({
      where: { id: gameId },
      create: {
        id: gameId,
        teamId: team.id,
        seasonId: season.id,
        opponent: state.opponent,
        date: options.gameDate ?? new Date(),
        isHome: state.isHome,
        teamScore: state.teamScore,
        opponentScore: state.opponentScore,
        inning: state.inning,
        half: mapInningHalf(state.half),
        outs: state.outs,
        currentBatterIndex: state.currentBatterIndex,
        bases: toJson(state.bases),
        snapshot: toJson(state),
        status: mapGameStatus(state.status),
        result,
      },
      update: {
        seasonId: season.id,
        ...(!scheduledGameId ? { opponent: state.opponent, isHome: state.isHome } : {}),
        teamScore: state.teamScore,
        opponentScore: state.opponentScore,
        inning: state.inning,
        half: mapInningHalf(state.half),
        outs: state.outs,
        currentBatterIndex: state.currentBatterIndex,
        bases: toJson(state.bases),
        snapshot: toJson(state),
        status: mapGameStatus(state.status),
        result,
      },
    });

    await tx.gameRuleSettings.upsert({
      where: { gameId: game.id },
      create: toRuleSettingsCreate(game.id, state.gameRules),
      update: toRuleSettingsUpdate(state.gameRules),
    });

    await tx.gameLineup.deleteMany({ where: { gameId: game.id } });
    await tx.gameLineup.createMany({
      data: state.lineup.map((player, index) => ({
        gameId: game.id,
        playerId: player.id,
        battingOrderPosition: index + 1,
        isActive: true,
      })),
    });

    await tx.atBat.deleteMany({ where: { gameId: game.id } });
    for (const play of state.plays) {
      const atBatId = `${game.id}-${play.id}`;

      await tx.atBat.create({
        data: {
          id: atBatId,
          gameId: game.id,
          inning: play.inning,
          batterId: play.batterId,
          outsBefore: play.outsBefore,
          result: mapBatterResult(play.result),
          outType: play.outType ? mapOutType(play.outType) : null,
          basesBefore: toJson(play.basesBefore),
          runsScored: play.runsScored,
          rbis: play.rbis,
          outsOnPlay: play.outsOnPlay,
          basesAfter: toJson(play.basesAfter),
          runnerAdvancements: {
            create: play.runnerAdvancements.map((movement) =>
              toRunnerAdvancementCreate(movement),
            ),
          },
        },
      });
    }

    await tx.playerGameStats.deleteMany({ where: { gameId: game.id } });
    await tx.playerGameStats.createMany({
      data: state.lineup.map((player) => ({
        gameId: game.id,
        playerId: player.id,
        gamesPlayed: state.status === "PREGAME" ? 0 : 1,
        ...toStatsData(getPlayerGameStats(state, player.id)),
      })),
    });

    for (const player of state.lineup) {
      const playerGameStats = {
        ...getPlayerGameStats(state, player.id),
        gamesPlayed: state.status === "PREGAME" ? 0 : 1,
      };
      const existingSeasonStats = existingPlayerSeasonStatsByPlayerId.get(player.id) ?? player.seasonStats;
      const existingGameStats = existingPlayerGameStatsByPlayerId.get(player.id) ?? createZeroStats();
      const playerSeasonStats = replaceGameStatsInSeason(
        existingSeasonStats,
        existingGameStats,
        playerGameStats,
      );

      await tx.playerSeasonStats.upsert({
        where: {
          playerId_season: {
            playerId: player.id,
            season: seasonYear,
          },
        },
        create: {
          playerId: player.id,
          seasonId: season.id,
          season: seasonYear,
          gamesPlayed: playerSeasonStats.gamesPlayed,
          ...toStatsData(playerSeasonStats),
        },
        update: {
          seasonId: season.id,
          gamesPlayed: playerSeasonStats.gamesPlayed,
          ...toStatsData(playerSeasonStats),
        },
      });
    }

    const teamTotals = getTeamGameTotals(state);
    const record = getRecordCounts(state.status, state.teamScore, state.opponentScore);
    const existingTeamRecord = existingGame
      ? getRecordCounts(mapLocalGameStatus(existingGame.status), existingGame.teamScore, existingGame.opponentScore)
      : getRecordCounts("PREGAME", 0, 0);
    const nextTeamSeasonStats = addTeamGameToSeasonStats(
      subtractTeamGameFromSeasonStats(
        existingTeamSeasonStats ? fromTeamSeasonStatsRecord(existingTeamSeasonStats) : createZeroTeamSeasonStats(),
        existingTeamGameStats
          ? fromTeamGameStatsRecord(
              existingTeamGameStats,
              mapLocalGameStatus(existingGame?.status ?? PrismaGameStatus.SCHEDULED) === "PREGAME" ? 0 : 1,
            )
          : createZeroTeamGameStats(),
        existingTeamRecord,
      ),
      teamTotals,
      record,
      state.teamScore,
      state.opponentScore,
      state.status === "PREGAME" ? 0 : 1,
    );

    await tx.teamGameStats.upsert({
      where: { gameId: game.id },
      create: {
        teamId: team.id,
        gameId: game.id,
        ...toTeamStatsData(teamTotals),
        runs: teamTotals.runs,
        opponentRuns: state.opponentScore,
        leftOnBase: occupiedBaseEntries(state.bases).length,
      },
      update: {
        ...toTeamStatsData(teamTotals),
        runs: teamTotals.runs,
        opponentRuns: state.opponentScore,
        leftOnBase: occupiedBaseEntries(state.bases).length,
      },
    });

    await tx.teamSeasonStats.upsert({
      where: { seasonId: season.id },
      create: {
        teamId: team.id,
        seasonId: season.id,
        gamesPlayed: nextTeamSeasonStats.gamesPlayed,
        wins: nextTeamSeasonStats.wins,
        losses: nextTeamSeasonStats.losses,
        ties: nextTeamSeasonStats.ties,
        runsFor: nextTeamSeasonStats.runsFor,
        runsAgainst: nextTeamSeasonStats.runsAgainst,
        ...toTeamStatsData(nextTeamSeasonStats),
        runs: nextTeamSeasonStats.runs,
      },
      update: {
        gamesPlayed: nextTeamSeasonStats.gamesPlayed,
        wins: nextTeamSeasonStats.wins,
        losses: nextTeamSeasonStats.losses,
        ties: nextTeamSeasonStats.ties,
        runsFor: nextTeamSeasonStats.runsFor,
        runsAgainst: nextTeamSeasonStats.runsAgainst,
        ...toTeamStatsData(nextTeamSeasonStats),
        runs: nextTeamSeasonStats.runs,
      },
    });

    await tx.teamRecord.upsert({
      where: {
        teamId_seasonId_label: {
          teamId: team.id,
          seasonId: season.id,
          label: "Overall",
        },
      },
      create: {
        teamId: team.id,
        seasonId: season.id,
        label: "Overall",
        wins: nextTeamSeasonStats.wins,
        losses: nextTeamSeasonStats.losses,
        ties: nextTeamSeasonStats.ties,
        runsFor: nextTeamSeasonStats.runsFor,
        runsAgainst: nextTeamSeasonStats.runsAgainst,
      },
      update: {
        wins: nextTeamSeasonStats.wins,
        losses: nextTeamSeasonStats.losses,
        ties: nextTeamSeasonStats.ties,
        runsFor: nextTeamSeasonStats.runsFor,
        runsAgainst: nextTeamSeasonStats.runsAgainst,
      },
    });

    return {
      teamId: team.id,
      seasonId: season.id,
      gameId: game.id,
      playerCount: state.lineup.length,
      playCount: state.plays.length,
    };
  });
}

export async function loadFirstGameSnapshotFromPrisma(
  _seasonYear = defaultSeasonYear,
  teamId = testTeamName,
  account: TeamAccount = legacyTeamAccount,
) {
  void _seasonYear;
  const prisma = getPrisma();
  const team = await findAccountTeam(prisma, teamId, account);

  if (!team) {
    return null;
  }

  const game = await prisma.game.findFirst({
    where: {
      teamId: team.id,
      status: PrismaGameStatus.IN_PROGRESS,
      snapshot: { not: Prisma.DbNull },
    },
    orderBy: { updatedAt: "desc" },
    select: { snapshot: true },
  }) ?? await prisma.game.findFirst({
    where: { teamId: team.id, status: PrismaGameStatus.FINAL, snapshot: { not: Prisma.DbNull } },
    orderBy: { updatedAt: "desc" },
    select: { snapshot: true },
  });

  return (game?.snapshot ?? null) as GameState | null;
}

export async function resetFirstGameSnapshotInPrisma(
  seasonYear = defaultSeasonYear,
  teamId = testTeamName,
  account: TeamAccount = legacyTeamAccount,
) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findFirst({
      where: teamLookupWhere(teamId, account),
      select: { id: true },
    });

    if (!team) {
      return { reset: false };
    }

    await tx.game.deleteMany({ where: { id: getFirstGameId(seasonYear, team.id) } });

    return { reset: true };
  });
}

async function upsertSnapshotTeam(
  tx: Prisma.TransactionClient,
  activeTeam: ActiveTeam | undefined,
  account: TeamAccount,
) {
  if (activeTeam) {
    const existingTeam = await tx.team.findFirst({
      where: {
        ownerUid: account.uid,
        OR: [{ id: activeTeam.id }, { name: activeTeam.name }],
      },
    });

    if (existingTeam) {
      return tx.team.update({
        where: { id: existingTeam.id },
        data: {
          name: activeTeam.name,
          ownerEmail: account.email,
        },
      });
    }

    return tx.team.create({
      data: {
        id: activeTeam.id,
        name: activeTeam.name,
        ownerUid: account.uid,
        ownerEmail: account.email,
      },
    });
  }

  return tx.team.upsert({
    where: {
      ownerUid_name: {
        ownerUid: account.uid,
        name: testTeamName,
      },
    },
    create: {
      name: testTeamName,
      ownerUid: account.uid,
      ownerEmail: account.email,
    },
    update: {},
  });
}

async function findAccountTeam(
  prisma: ReturnType<typeof getPrisma>,
  teamId: string,
  account: TeamAccount,
) {
  return prisma.team.findFirst({
    where: teamLookupWhere(teamId, account),
    select: { id: true },
  });
}

function teamLookupWhere(teamId: string, account: TeamAccount) {
  return teamId === testTeamName
    ? { name: testTeamName, ownerUid: account.uid }
    : { id: teamId, ownerUid: account.uid };
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
    gender: mapPlayerGender(player.gender),
    bats: mapBattingSide(player.bats),
    throws: mapThrowingSide(player.throws),
    primaryPosition: player.primaryPosition || null,
    speedRating: mapSpeedRating(player.speedRating),
    notes: player.notes || null,
    contactNotes: player.contactNotes,
    armStrength: mapDefensiveRating(player.defensiveProfile.ratings.armStrength),
    throwAccuracy: mapDefensiveRating(player.defensiveProfile.ratings.throwAccuracy),
    gloveSkill: mapDefensiveRating(player.defensiveProfile.ratings.gloveSkill),
    rangeRating: mapDefensiveRating(player.defensiveProfile.ratings.range),
    positionConfidence: mapDefensiveRating(player.defensiveProfile.ratings.positionConfidence),
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

function toRuleSettingsCreate(gameId: string, rules = defaultGameRules) {
  return {
    gameId,
    ...toRuleSettingsUpdate(rules),
  };
}

function toRuleSettingsUpdate(rules = defaultGameRules) {
  return {
    homeRunLimitEnabled: rules.homeRunLimitEnabled,
    homeRunLimit: rules.homeRunLimit,
    afterHomeRunLimit: mapHomeRunLimitOutcome(rules.afterHomeRunLimit),
    runLimitPerInning: rules.runLimitPerInning,
    mercyRule: rules.mercyRule,
    courtesyRunnersAllowed: rules.courtesyRunnersAllowed,
    walksAllowed: rules.walksAllowed,
    sacFliesTracked: rules.sacFliesTracked,
    errorsTracked: rules.errorsTracked,
    fieldersChoicesTracked: rules.fieldersChoicesTracked,
  };
}

function toStatsData(stats: Partial<PlayerStats> | undefined) {
  return {
    plateAppearances: stats?.plateAppearances ?? 0,
    atBats: stats?.atBats ?? 0,
    hits: stats?.hits ?? 0,
    singles: stats?.singles ?? 0,
    doubles: stats?.doubles ?? 0,
    triples: stats?.triples ?? 0,
    homeRuns: stats?.homeRuns ?? 0,
    walks: stats?.walks ?? 0,
    reachedOnError: stats?.reachedOnError ?? 0,
    fieldersChoice: stats?.fieldersChoice ?? 0,
    sacFlies: stats?.sacFlies ?? 0,
    outs: stats?.outs ?? 0,
    groundouts: stats?.groundouts ?? 0,
    flyouts: stats?.flyouts ?? 0,
    lineouts: stats?.lineouts ?? 0,
    strikeoutsLooking: stats?.strikeoutsLooking ?? 0,
    strikeoutsSwinging: stats?.strikeoutsSwinging ?? 0,
    otherOuts: stats?.otherOuts ?? 0,
    doublePlays: stats?.doublePlays ?? 0,
    productiveOuts: stats?.productiveOuts ?? 0,
    runs: stats?.runs ?? 0,
    rbis: stats?.rbis ?? 0,
  };
}

function fromPlayerStatsRecord(stats: PlayerStats): PlayerStats {
  return {
    gamesPlayed: stats.gamesPlayed,
    ...toStatsData(stats),
  };
}

function toTeamStatsData(stats: Omit<PlayerStats, "gamesPlayed">) {
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

type PersistedTeamSeasonStats = ReturnType<typeof createZeroTeamSeasonStats>;
type PersistedTeamGameStats = ReturnType<typeof createZeroTeamGameStats>;

function createZeroTeamGameStats() {
  return {
    ...createZeroStats(),
    opponentRuns: 0,
    leftOnBase: 0,
  };
}

function createZeroTeamSeasonStats() {
  return {
    ...createZeroStats(),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    runsFor: 0,
    runsAgainst: 0,
  };
}

function fromTeamGameStatsRecord(
  stats: Omit<PersistedTeamGameStats, "gamesPlayed">,
  gamesPlayed: number,
): PersistedTeamGameStats {
  return {
    ...createZeroTeamGameStats(),
    gamesPlayed,
    ...toStatsData(stats),
    opponentRuns: stats.opponentRuns,
    leftOnBase: stats.leftOnBase,
  };
}

function fromTeamSeasonStatsRecord(stats: PersistedTeamSeasonStats): PersistedTeamSeasonStats {
  return {
    ...createZeroTeamSeasonStats(),
    gamesPlayed: stats.gamesPlayed,
    wins: stats.wins,
    losses: stats.losses,
    ties: stats.ties,
    runsFor: stats.runsFor,
    runsAgainst: stats.runsAgainst,
    ...toStatsData(stats),
  };
}

function subtractTeamGameFromSeasonStats(
  seasonStats: PersistedTeamSeasonStats,
  gameStats: PersistedTeamGameStats,
  record: ReturnType<typeof getRecordCounts>,
): PersistedTeamSeasonStats {
  return {
    ...subtractStats(seasonStats, gameStats),
    gamesPlayed: subtractStat(seasonStats.gamesPlayed, gameStats.gamesPlayed),
    wins: subtractStat(seasonStats.wins, record.wins),
    losses: subtractStat(seasonStats.losses, record.losses),
    ties: subtractStat(seasonStats.ties, record.ties),
    runsFor: subtractStat(seasonStats.runsFor, gameStats.runs),
    runsAgainst: subtractStat(seasonStats.runsAgainst, gameStats.opponentRuns),
  };
}

function addTeamGameToSeasonStats(
  seasonStats: PersistedTeamSeasonStats,
  gameStats: ReturnType<typeof getTeamGameTotals>,
  record: ReturnType<typeof getRecordCounts>,
  runsFor: number,
  runsAgainst: number,
  gamesPlayed: number,
): PersistedTeamSeasonStats {
  const gameStatsWithGamesPlayed = {
    gamesPlayed,
    ...toStatsData(gameStats),
  };

  return {
    ...addStats(seasonStats, gameStatsWithGamesPlayed),
    gamesPlayed: seasonStats.gamesPlayed + gamesPlayed,
    wins: seasonStats.wins + record.wins,
    losses: seasonStats.losses + record.losses,
    ties: seasonStats.ties + record.ties,
    runsFor: seasonStats.runsFor + runsFor,
    runsAgainst: seasonStats.runsAgainst + runsAgainst,
  };
}

function toRunnerAdvancementCreate(movement: RunnerMovement) {
  return {
    player: {
      connect: {
        id: movement.playerId,
      },
    },
    originalPlayerId: movement.originalPlayerId ?? null,
    fromBase: mapRunnerStart(movement.fromBase),
    toBase: mapRunnerEnd(movement.toBase),
    advancedBases: movement.advancedBases,
    scored: movement.scored,
    out: movement.out,
    rbiCredited: movement.rbiCredited,
    reason: mapAdvanceReason(movement.reason),
  };
}

function uniquePlayers(players: Player[]) {
  return Array.from(new Map(players.map((player) => [player.id, player])).values());
}

function getGameResult(teamScore: number, opponentScore: number) {
  if (teamScore > opponentScore) return PrismaGameResult.WIN;
  if (teamScore < opponentScore) return PrismaGameResult.LOSS;
  return PrismaGameResult.TIE;
}

function getRecordCounts(status: LocalGameStatus, teamScore: number, opponentScore: number) {
  if (status !== "FINAL") {
    return { wins: 0, losses: 0, ties: 0 };
  }

  return {
    wins: teamScore > opponentScore ? 1 : 0,
    losses: teamScore < opponentScore ? 1 : 0,
    ties: teamScore === opponentScore ? 1 : 0,
  };
}

function mapBattingSide(value: Player["bats"]) {
  if (value === "Right") return PrismaBattingSide.RIGHT;
  if (value === "Left") return PrismaBattingSide.LEFT;
  if (value === "Switch") return PrismaBattingSide.SWITCH;
  return PrismaBattingSide.UNKNOWN;
}

function mapThrowingSide(value: Player["throws"]) {
  if (value === "Right") return PrismaThrowingSide.RIGHT;
  if (value === "Left") return PrismaThrowingSide.LEFT;
  return PrismaThrowingSide.UNKNOWN;
}

function mapSpeedRating(value: Player["speedRating"]) {
  if (value === "Fast") return PrismaSpeedRating.FAST;
  if (value === "Slow") return PrismaSpeedRating.SLOW;
  return PrismaSpeedRating.AVERAGE;
}

function mapPlayerGender(value: Player["gender"]) {
  if (value === "Female") return PrismaPlayerGender.FEMALE;
  if (value === "Male") return PrismaPlayerGender.MALE;
  return PrismaPlayerGender.UNKNOWN;
}

function mapDefensiveRating(value: Player["defensiveProfile"]["ratings"]["armStrength"]) {
  if (value === "Low") return PrismaDefensiveRating.LOW;
  if (value === "Medium") return PrismaDefensiveRating.MEDIUM;
  if (value === "High") return PrismaDefensiveRating.HIGH;
  return null;
}

function mapInningHalf(value: GameState["half"]) {
  return value === "Top" ? PrismaInningHalf.TOP : PrismaInningHalf.BOTTOM;
}

function mapGameStatus(value: LocalGameStatus) {
  if (value === "IN_PROGRESS") return PrismaGameStatus.IN_PROGRESS;
  if (value === "FINAL") return PrismaGameStatus.FINAL;
  return PrismaGameStatus.SCHEDULED;
}

function mapLocalGameStatus(value: PrismaGameStatus): LocalGameStatus {
  if (value === PrismaGameStatus.IN_PROGRESS) return "IN_PROGRESS";
  if (value === PrismaGameStatus.FINAL) return "FINAL";
  return "PREGAME";
}

function mapBatterResult(value: BatterResult) {
  const map: Record<BatterResult, PrismaBatterResult> = {
    "1B": PrismaBatterResult.SINGLE,
    "2B": PrismaBatterResult.DOUBLE,
    "3B": PrismaBatterResult.TRIPLE,
    HR: PrismaBatterResult.HOME_RUN,
    BB: PrismaBatterResult.WALK,
    ROE: PrismaBatterResult.REACHED_ON_ERROR,
    FC: PrismaBatterResult.FIELDERS_CHOICE,
    SF: PrismaBatterResult.SAC_FLY,
    Out: PrismaBatterResult.OUT,
    DP: PrismaBatterResult.DOUBLE_PLAY,
  };

  return map[value];
}

function mapOutType(value: OutType) {
  const map: Record<OutType, PrismaOutType> = {
    GROUNDOUT: PrismaOutType.GROUNDOUT,
    FLYOUT: PrismaOutType.FLYOUT,
    LINEOUT: PrismaOutType.LINEOUT,
    STRIKEOUT_LOOKING: PrismaOutType.STRIKEOUT_LOOKING,
    STRIKEOUT_SWINGING: PrismaOutType.STRIKEOUT_SWINGING,
    OTHER_OUT: PrismaOutType.OTHER_OUT,
  };

  return map[value];
}

function mapRunnerStart(value: RunnerMovement["fromBase"]) {
  if (value === "BATTER") return PrismaRunnerStart.BATTER;
  if (value === "1B") return PrismaRunnerStart.FIRST;
  if (value === "2B") return PrismaRunnerStart.SECOND;
  return PrismaRunnerStart.THIRD;
}

function mapRunnerEnd(value: RunnerMovement["toBase"]) {
  if (value === "HOME") return PrismaRunnerEnd.HOME;
  if (value === "OUT") return PrismaRunnerEnd.OUT;
  if (value === "1B") return PrismaRunnerEnd.FIRST;
  if (value === "2B") return PrismaRunnerEnd.SECOND;
  return PrismaRunnerEnd.THIRD;
}

function mapAdvanceReason(value: RunnerMovement["reason"]) {
  if (value === "Hit") return PrismaAdvanceReason.HIT;
  if (value === "Walk") return PrismaAdvanceReason.WALK;
  if (value === "Error") return PrismaAdvanceReason.ERROR;
  if (value === "Fielder's Choice") return PrismaAdvanceReason.FIELDERS_CHOICE;
  if (value === "Sac Fly") return PrismaAdvanceReason.SAC_FLY;
  if (value === "Out") return PrismaAdvanceReason.OUT;
  return PrismaAdvanceReason.RUNNER_DECISION;
}

function mapHomeRunLimitOutcome(value: string) {
  if (value === "Single") return PrismaHomeRunLimitOutcome.SINGLE;
  if (value === "Other") return PrismaHomeRunLimitOutcome.OTHER;
  return PrismaHomeRunLimitOutcome.OUT;
}

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

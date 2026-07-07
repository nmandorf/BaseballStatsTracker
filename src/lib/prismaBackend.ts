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
import { toPlayerPersistenceData } from "@/lib/playerPersistenceData";
import { fromPersistedStatsData, toPersistedStatsData, toPersistedTeamStatsData } from "@/lib/playerStatsPersistence";
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

function getFirstGameId(seasonYear = defaultSeasonYear, teamId = testTeamName) {
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

  return prisma.$transaction((tx) =>
    saveFirstGameSnapshotInTransaction(tx, state, options, seasonYear, account),
  );
}

async function saveFirstGameSnapshotInTransaction(
  tx: Prisma.TransactionClient,
  state: GameState,
  options: SaveFirstGameSnapshotOptions,
  seasonYear: number,
  account: TeamAccount,
): Promise<SavedFirstGameSnapshot> {
  const context = await prepareSnapshotSaveContext(tx, state, options, seasonYear, account);
  const priorStats = await loadPriorSnapshotStats(tx, state, context);
  const game = await upsertSnapshotGame(tx, state, options, context);

  await persistSnapshotGameDetails(tx, state, game.id);
  await persistSnapshotPlayerStats(tx, state, context, priorStats);
  await persistSnapshotTeamStats(tx, state, context, priorStats, game.id);

  return getSavedSnapshotSummary(context, state, game.id);
}

type SnapshotSaveContext = {
  existingGame: ExistingSnapshotGame | null;
  gameId: string;
  scheduledGameId: string | null;
  season: { id: string };
  seasonYear: number;
  team: { id: string };
};

type ExistingSnapshotGame = {
  opponentScore: number;
  snapshot: Prisma.JsonValue | null;
  status: PrismaGameStatus;
  teamScore: number;
};

async function prepareSnapshotSaveContext(
  tx: Prisma.TransactionClient,
  state: GameState,
  options: SaveFirstGameSnapshotOptions,
  seasonYear: number,
  account: TeamAccount,
): Promise<SnapshotSaveContext> {
  const team = await upsertSnapshotTeam(tx, options.team, account);
  const scheduledGameId = options.gameId ?? state.gameId;
  const gameId = scheduledGameId ?? getFirstGameId(seasonYear, team.id);
  const existingGame = await findExistingSnapshotGame(tx, gameId, team.id);

  validateScheduledSnapshotSave(scheduledGameId, existingGame, state);

  const season = await upsertSnapshotSeason(tx, team.id, seasonYear);
  await upsertSnapshotPlayers(tx, team.id, getSnapshotPlayers(options.team, state));

  return { existingGame, gameId, scheduledGameId, season, seasonYear, team };
}

function getSnapshotPlayers(activeTeam: ActiveTeam | undefined, state: GameState) {
  return uniquePlayers([...(activeTeam?.players ?? seedPlayers), ...state.lineup]);
}

async function findExistingSnapshotGame(tx: Prisma.TransactionClient, gameId: string, teamId: string) {
  return tx.game.findFirst({
    where: { id: gameId, teamId },
    select: {
      opponentScore: true,
      snapshot: true,
      status: true,
      teamScore: true,
    },
  });
}

function validateScheduledSnapshotSave(
  scheduledGameId: string | null,
  existingGame: ExistingSnapshotGame | null,
  state: GameState,
) {
  if (!scheduledGameId) {
    return;
  }

  if (!existingGame) {
    throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found for this team.", { gameId: scheduledGameId });
  }

  validateScheduledSnapshotProgress(scheduledGameId, existingGame, state);
  validateLiveScheduledSnapshotStatus(state);
}

function validateScheduledSnapshotProgress(
  scheduledGameId: string,
  existingGame: ExistingSnapshotGame,
  state: GameState,
) {
  if (canSaveScheduledGameSnapshot(existingGame.status, state, existingGame.snapshot)) {
    return;
  }

  throw new AppError(
    "GAME_NOT_STARTABLE",
    getScheduledSnapshotSaveErrorMessage(existingGame.status),
    409,
    { gameId: scheduledGameId, status: existingGame.status },
  );
}

function getScheduledSnapshotSaveErrorMessage(status: PrismaGameStatus) {
  return status === PrismaGameStatus.FINAL
    ? "Completed games can only save final stat snapshots that are at least as complete as the saved game."
    : "Start this game from its scheduled game screen before saving stats.";
}

function validateLiveScheduledSnapshotStatus(state: GameState) {
  if (state.status === "IN_PROGRESS" || state.status === "FINAL") {
    return;
  }

  throw new AppError("GAME_NOT_STARTABLE", "Only a started scheduled game can save live stats.", 409);
}

async function upsertSnapshotSeason(tx: Prisma.TransactionClient, teamId: string, seasonYear: number) {
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

async function upsertSnapshotPlayers(tx: Prisma.TransactionClient, teamId: string, players: Player[]) {
  for (const player of players) {
    await tx.player.upsert({
      where: {
        teamId_name: {
          teamId,
          name: player.name,
        },
      },
      create: toPlayerCreate(teamId, player),
      update: toPlayerUpdate(player),
    });
  }
}

type PriorSnapshotStats = {
  existingPlayerGameStatsByPlayerId: Map<string, PlayerStats>;
  existingPlayerSeasonStatsByPlayerId: Map<string, PlayerStats>;
  existingTeamGameStats: Awaited<ReturnType<Prisma.TransactionClient["teamGameStats"]["findUnique"]>>;
  existingTeamSeasonStats: Awaited<ReturnType<Prisma.TransactionClient["teamSeasonStats"]["findUnique"]>>;
};

async function loadPriorSnapshotStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  context: SnapshotSaveContext,
): Promise<PriorSnapshotStats> {
  const lineupPlayerIds = state.lineup.map((player) => player.id);
  const existingPlayerGameStats = await tx.playerGameStats.findMany({
    where: { gameId: context.gameId, playerId: { in: lineupPlayerIds } },
  });
  const existingPlayerSeasonStats = await tx.playerSeasonStats.findMany({
    where: { playerId: { in: lineupPlayerIds }, season: context.seasonYear },
  });

  return {
    existingPlayerGameStatsByPlayerId: toPlayerStatsMap(existingPlayerGameStats),
    existingPlayerSeasonStatsByPlayerId: toPlayerStatsMap(existingPlayerSeasonStats),
    existingTeamGameStats: await tx.teamGameStats.findUnique({ where: { gameId: context.gameId } }),
    existingTeamSeasonStats: await tx.teamSeasonStats.findUnique({ where: { seasonId: context.season.id } }),
  };
}

function toPlayerStatsMap(statsRecords: Array<{ playerId: string } & PlayerStats>) {
  return new Map(statsRecords.map((stats) => [stats.playerId, fromPlayerStatsRecord(stats)]));
}

async function upsertSnapshotGame(
  tx: Prisma.TransactionClient,
  state: GameState,
  options: SaveFirstGameSnapshotOptions,
  context: SnapshotSaveContext,
) {
  const result = getSnapshotGameResult(state);

  return tx.game.upsert({
    where: { id: context.gameId },
    create: getSnapshotGameCreateData(state, options, context, result),
    update: getSnapshotGameUpdateData(state, context, result),
  });
}

function getSnapshotGameResult(state: GameState) {
  return state.status === "FINAL" ? getGameResult(state.teamScore, state.opponentScore) : null;
}

function getSnapshotGameCreateData(
  state: GameState,
  options: SaveFirstGameSnapshotOptions,
  context: SnapshotSaveContext,
  result: PrismaGameResult | null,
) {
  return {
    id: context.gameId,
    teamId: context.team.id,
    seasonId: context.season.id,
    opponent: state.opponent,
    date: options.gameDate ?? new Date(),
    isHome: state.isHome,
    ...getSnapshotGameStateData(state, result),
  };
}

function getSnapshotGameUpdateData(
  state: GameState,
  context: SnapshotSaveContext,
  result: PrismaGameResult | null,
) {
  return {
    seasonId: context.season.id,
    ...getUnscheduledGameUpdateData(state, context.scheduledGameId),
    ...getSnapshotGameStateData(state, result),
  };
}

function getUnscheduledGameUpdateData(state: GameState, scheduledGameId: string | null) {
  return scheduledGameId ? {} : { opponent: state.opponent, isHome: state.isHome };
}

function getSnapshotGameStateData(state: GameState, result: PrismaGameResult | null) {
  return {
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
  };
}

async function persistSnapshotGameDetails(
  tx: Prisma.TransactionClient,
  state: GameState,
  gameId: string,
) {
  await persistSnapshotGameRules(tx, state, gameId);
  await replaceSnapshotLineup(tx, state, gameId);
  await replaceSnapshotAtBats(tx, state, gameId);
}

async function persistSnapshotGameRules(
  tx: Prisma.TransactionClient,
  state: GameState,
  gameId: string,
) {
  await tx.gameRuleSettings.upsert({
    where: { gameId },
    create: toRuleSettingsCreate(gameId, state.gameRules),
    update: toRuleSettingsUpdate(state.gameRules),
  });
}

async function replaceSnapshotLineup(
  tx: Prisma.TransactionClient,
  state: GameState,
  gameId: string,
) {
  await tx.gameLineup.deleteMany({ where: { gameId } });
  await tx.gameLineup.createMany({
    data: state.lineup.map((player, index) => ({
      gameId,
      playerId: player.id,
      battingOrderPosition: index + 1,
      isActive: true,
    })),
  });
}

async function replaceSnapshotAtBats(
  tx: Prisma.TransactionClient,
  state: GameState,
  gameId: string,
) {
  await tx.atBat.deleteMany({ where: { gameId } });

  for (const play of state.plays) {
    await tx.atBat.create({
      data: toAtBatCreateData(gameId, play),
    });
  }
}

function toAtBatCreateData(gameId: string, play: GameState["plays"][number]) {
  return {
    id: `${gameId}-${play.id}`,
    gameId,
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
  };
}

async function persistSnapshotPlayerStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  context: SnapshotSaveContext,
  priorStats: PriorSnapshotStats,
) {
  await replaceSnapshotPlayerGameStats(tx, state, context.gameId);

  for (const player of state.lineup) {
    await upsertSnapshotPlayerSeasonStats(tx, state, context, priorStats, player);
  }
}

async function replaceSnapshotPlayerGameStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  gameId: string,
) {
  await tx.playerGameStats.deleteMany({ where: { gameId } });
  await tx.playerGameStats.createMany({
    data: state.lineup.map((player) => ({
      gameId,
      playerId: player.id,
      gamesPlayed: getSnapshotGamesPlayed(state),
      ...toPersistedStatsData(getPlayerGameStats(state, player.id)),
    })),
  });
}

async function upsertSnapshotPlayerSeasonStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  context: SnapshotSaveContext,
  priorStats: PriorSnapshotStats,
  player: Player,
) {
  const playerSeasonStats = getNextPlayerSeasonStats(state, priorStats, player);

  await tx.playerSeasonStats.upsert({
    where: {
      playerId_season: {
        playerId: player.id,
        season: context.seasonYear,
      },
    },
    create: {
      playerId: player.id,
      seasonId: context.season.id,
      season: context.seasonYear,
      gamesPlayed: playerSeasonStats.gamesPlayed,
      ...toPersistedStatsData(playerSeasonStats),
    },
    update: {
      seasonId: context.season.id,
      gamesPlayed: playerSeasonStats.gamesPlayed,
      ...toPersistedStatsData(playerSeasonStats),
    },
  });
}

function getNextPlayerSeasonStats(
  state: GameState,
  priorStats: PriorSnapshotStats,
  player: Player,
) {
  const playerGameStats = {
    ...getPlayerGameStats(state, player.id),
    gamesPlayed: getSnapshotGamesPlayed(state),
  };
  const existingSeasonStats = priorStats.existingPlayerSeasonStatsByPlayerId.get(player.id) ?? player.seasonStats;
  const existingGameStats = priorStats.existingPlayerGameStatsByPlayerId.get(player.id) ?? createZeroStats();

  return replaceGameStatsInSeason(
    existingSeasonStats,
    existingGameStats,
    playerGameStats,
  );
}

async function persistSnapshotTeamStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  context: SnapshotSaveContext,
  priorStats: PriorSnapshotStats,
  gameId: string,
) {
  const teamTotals = getTeamGameTotals(state);
  const nextTeamSeasonStats = getNextTeamSeasonStats(state, context, priorStats, teamTotals);

  await upsertSnapshotTeamGameStats(tx, state, context, gameId, teamTotals);
  await upsertSnapshotTeamSeasonStats(tx, context, nextTeamSeasonStats);
  await upsertSnapshotTeamRecord(tx, context, nextTeamSeasonStats);
}

function getNextTeamSeasonStats(
  state: GameState,
  context: SnapshotSaveContext,
  priorStats: PriorSnapshotStats,
  teamTotals: ReturnType<typeof getTeamGameTotals>,
) {
  return addTeamGameToSeasonStats(
    getPriorTeamSeasonStats(context, priorStats),
    teamTotals,
    getRecordCounts(state.status, state.teamScore, state.opponentScore),
    state.teamScore,
    state.opponentScore,
    getSnapshotGamesPlayed(state),
  );
}

function getPriorTeamSeasonStats(
  context: SnapshotSaveContext,
  priorStats: PriorSnapshotStats,
) {
  return subtractTeamGameFromSeasonStats(
    priorStats.existingTeamSeasonStats
      ? fromTeamSeasonStatsRecord(priorStats.existingTeamSeasonStats)
      : createZeroTeamSeasonStats(),
    getPriorTeamGameStats(context, priorStats),
    getPriorTeamRecord(context),
  );
}

function getPriorTeamGameStats(
  context: SnapshotSaveContext,
  priorStats: PriorSnapshotStats,
) {
  if (!priorStats.existingTeamGameStats) {
    return createZeroTeamGameStats();
  }

  return fromTeamGameStatsRecord(
    priorStats.existingTeamGameStats,
    getPriorTeamGameCount(context),
  );
}

function getPriorTeamGameCount(context: SnapshotSaveContext) {
  return mapLocalGameStatus(context.existingGame?.status ?? PrismaGameStatus.SCHEDULED) === "PREGAME" ? 0 : 1;
}

function getPriorTeamRecord(context: SnapshotSaveContext) {
  return context.existingGame
    ? getRecordCounts(
        mapLocalGameStatus(context.existingGame.status),
        context.existingGame.teamScore,
        context.existingGame.opponentScore,
      )
    : getRecordCounts("PREGAME", 0, 0);
}

async function upsertSnapshotTeamGameStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  context: SnapshotSaveContext,
  gameId: string,
  teamTotals: ReturnType<typeof getTeamGameTotals>,
) {
  const statsData = getSnapshotTeamGameStatsData(state, teamTotals);

  await tx.teamGameStats.upsert({
    where: { gameId },
    create: {
      teamId: context.team.id,
      gameId,
      ...statsData,
    },
    update: statsData,
  });
}

function getSnapshotTeamGameStatsData(
  state: GameState,
  teamTotals: ReturnType<typeof getTeamGameTotals>,
) {
  return {
    ...toPersistedTeamStatsData(teamTotals),
    runs: teamTotals.runs,
    opponentRuns: state.opponentScore,
    leftOnBase: occupiedBaseEntries(state.bases).length,
  };
}

async function upsertSnapshotTeamSeasonStats(
  tx: Prisma.TransactionClient,
  context: SnapshotSaveContext,
  nextTeamSeasonStats: PersistedTeamSeasonStats,
) {
  const statsData = getSnapshotTeamSeasonStatsData(nextTeamSeasonStats);

  await tx.teamSeasonStats.upsert({
    where: { seasonId: context.season.id },
    create: {
      teamId: context.team.id,
      seasonId: context.season.id,
      ...statsData,
    },
    update: statsData,
  });
}

function getSnapshotTeamSeasonStatsData(nextTeamSeasonStats: PersistedTeamSeasonStats) {
  return {
    gamesPlayed: nextTeamSeasonStats.gamesPlayed,
    wins: nextTeamSeasonStats.wins,
    losses: nextTeamSeasonStats.losses,
    ties: nextTeamSeasonStats.ties,
    runsFor: nextTeamSeasonStats.runsFor,
    runsAgainst: nextTeamSeasonStats.runsAgainst,
    ...toPersistedTeamStatsData(nextTeamSeasonStats),
    runs: nextTeamSeasonStats.runs,
  };
}

async function upsertSnapshotTeamRecord(
  tx: Prisma.TransactionClient,
  context: SnapshotSaveContext,
  nextTeamSeasonStats: PersistedTeamSeasonStats,
) {
  const recordData = getSnapshotTeamRecordData(nextTeamSeasonStats);

  await tx.teamRecord.upsert({
    where: {
      teamId_seasonId_label: {
        teamId: context.team.id,
        seasonId: context.season.id,
        label: "Overall",
      },
    },
    create: {
      teamId: context.team.id,
      seasonId: context.season.id,
      label: "Overall",
      ...recordData,
    },
    update: recordData,
  });
}

function getSnapshotTeamRecordData(nextTeamSeasonStats: PersistedTeamSeasonStats) {
  return {
    wins: nextTeamSeasonStats.wins,
    losses: nextTeamSeasonStats.losses,
    ties: nextTeamSeasonStats.ties,
    runsFor: nextTeamSeasonStats.runsFor,
    runsAgainst: nextTeamSeasonStats.runsAgainst,
  };
}

function getSnapshotGamesPlayed(state: GameState) {
  return state.status === "PREGAME" ? 0 : 1;
}

function getSavedSnapshotSummary(
  context: SnapshotSaveContext,
  state: GameState,
  gameId: string,
): SavedFirstGameSnapshot {
  return {
    teamId: context.team.id,
    seasonId: context.season.id,
    gameId,
    playerCount: state.lineup.length,
    playCount: state.plays.length,
  };
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

  const game = await findLatestSavedSnapshotGame(prisma, team.id);

  return (game?.snapshot ?? null) as GameState | null;
}

const latestSnapshotStatuses = [PrismaGameStatus.IN_PROGRESS, PrismaGameStatus.FINAL] as const;

async function findLatestSavedSnapshotGame(
  prisma: ReturnType<typeof getPrisma>,
  teamId: string,
) {
  for (const status of latestSnapshotStatuses) {
    const game = await findLatestSnapshotGame(prisma, teamId, status);
    if (game) return game;
  }

  return null;
}

function findLatestSnapshotGame(
  prisma: ReturnType<typeof getPrisma>,
  teamId: string,
  status: PrismaGameStatus,
) {
  return prisma.game.findFirst({
    where: {
      teamId,
      status,
      snapshot: { not: Prisma.DbNull },
    },
    orderBy: { updatedAt: "desc" },
    select: { snapshot: true },
  });
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
  return toPlayerPersistenceData(player, {
    gender: mapPlayerGender,
    bats: mapBattingSide,
    throws: mapThrowingSide,
    speedRating: mapSpeedRating,
    defensiveRating: mapDefensiveRating,
  });
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

function fromPlayerStatsRecord(stats: PlayerStats): PlayerStats {
  return fromPersistedStatsData(stats);
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
    ...toPersistedStatsData(stats),
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
    ...toPersistedStatsData(stats),
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
    ...toPersistedStatsData(gameStats),
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

  return getFinalRecordCounts(teamScore, opponentScore);
}

function getFinalRecordCounts(teamScore: number, opponentScore: number) {
  return {
    wins: Number(teamScore > opponentScore),
    losses: Number(teamScore < opponentScore),
    ties: Number(teamScore === opponentScore),
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
  return runnerStartMap[value];
}

const runnerStartMap: Record<RunnerMovement["fromBase"], PrismaRunnerStart> = {
  BATTER: PrismaRunnerStart.BATTER,
  "1B": PrismaRunnerStart.FIRST,
  "2B": PrismaRunnerStart.SECOND,
  "3B": PrismaRunnerStart.THIRD,
};

function mapRunnerEnd(value: RunnerMovement["toBase"]) {
  return runnerEndMap[value];
}

const runnerEndMap: Record<RunnerMovement["toBase"], PrismaRunnerEnd> = {
  HOME: PrismaRunnerEnd.HOME,
  OUT: PrismaRunnerEnd.OUT,
  "1B": PrismaRunnerEnd.FIRST,
  "2B": PrismaRunnerEnd.SECOND,
  "3B": PrismaRunnerEnd.THIRD,
};

function mapAdvanceReason(value: RunnerMovement["reason"]) {
  return advanceReasonMap[value];
}

const advanceReasonMap: Record<RunnerMovement["reason"], PrismaAdvanceReason> = {
  Hit: PrismaAdvanceReason.HIT,
  Walk: PrismaAdvanceReason.WALK,
  Error: PrismaAdvanceReason.ERROR,
  "Fielder's Choice": PrismaAdvanceReason.FIELDERS_CHOICE,
  "Sac Fly": PrismaAdvanceReason.SAC_FLY,
  Out: PrismaAdvanceReason.OUT,
  "Runner Decision": PrismaAdvanceReason.RUNNER_DECISION,
};

function mapHomeRunLimitOutcome(value: string) {
  if (value === "Single") return PrismaHomeRunLimitOutcome.SINGLE;
  if (value === "Other") return PrismaHomeRunLimitOutcome.OTHER;
  return PrismaHomeRunLimitOutcome.OUT;
}

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

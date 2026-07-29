import { Prisma } from "@/generated/prisma/client";
import {
  GameResult as PrismaGameResult,
  GameStatus as PrismaGameStatus,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { AppError, notFoundError } from "@/lib/appErrors";
import { seedPlayers, testTeamName } from "@/lib/seedTeam";
import { legacyTeamAccount, type TeamAccount } from "@/lib/teamAccount";
import { canSaveScheduledGameSnapshot } from "@/lib/gameSnapshotRules";
import type { GameState } from "@/lib/gameEngine";
import {
  fromPlayerStatsRecord,
  getGameResult,
  mapBatterResult,
  mapGameStatus,
  mapInningHalf,
  mapOutType,
  toJson,
  toPlayerCreate,
  toPlayerUpdate,
  toRuleSettingsCreate,
  toRuleSettingsUpdate,
  toRunnerAdvancementCreate,
  uniquePlayers,
} from "./prismaSnapshotMappers.ts";
import type { ActiveTeam, Player } from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import {
  persistSnapshotPlayerStats,
  persistSnapshotTeamStats,
  type PriorSnapshotStats,
} from "./prismaSnapshotStats.ts";

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

import { Prisma } from "@/generated/prisma/client";
import { GameStatus as PrismaGameStatus } from "@/generated/prisma/enums";
import {
  getPlayerGameStats,
  getTeamGameTotals,
  occupiedBaseEntries,
  type GameState,
} from "@/lib/gameEngine";
import {
  toPersistedStatsData,
  toPersistedTeamStatsData,
} from "@/lib/playerStatsPersistence";
import { createZeroStats } from "@/lib/statCalculations";
import { replaceGameStatsInSeason } from "@/lib/seasonStatRules";
import type { Player } from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import {
  addTeamGameToSeasonStats,
  createZeroTeamGameStats,
  createZeroTeamSeasonStats,
  fromTeamGameStatsRecord,
  fromTeamSeasonStatsRecord,
  getRecordCounts,
  mapLocalGameStatus,
  subtractTeamGameFromSeasonStats,
  type PersistedTeamSeasonStats,
} from "./prismaSnapshotMappers.ts";

export type SnapshotStatsContext = {
  existingGame: {
    opponentScore: number;
    status: PrismaGameStatus;
    teamScore: number;
  } | null;
  gameId: string;
  season: { id: string };
  seasonYear: number;
  team: { id: string };
};

export type PriorSnapshotStats = {
  existingPlayerGameStatsByPlayerId: Map<string, PlayerStats>;
  existingPlayerSeasonStatsByPlayerId: Map<string, PlayerStats>;
  existingTeamGameStats: Awaited<
    ReturnType<Prisma.TransactionClient["teamGameStats"]["findUnique"]>
  >;
  existingTeamSeasonStats: Awaited<
    ReturnType<Prisma.TransactionClient["teamSeasonStats"]["findUnique"]>
  >;
};

export async function persistSnapshotPlayerStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  context: SnapshotStatsContext,
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
  context: SnapshotStatsContext,
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

export async function persistSnapshotTeamStats(
  tx: Prisma.TransactionClient,
  state: GameState,
  context: SnapshotStatsContext,
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
  context: SnapshotStatsContext,
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
  context: SnapshotStatsContext,
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
  context: SnapshotStatsContext,
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

function getPriorTeamGameCount(context: SnapshotStatsContext) {
  return mapLocalGameStatus(context.existingGame?.status ?? PrismaGameStatus.SCHEDULED) === "PREGAME" ? 0 : 1;
}

function getPriorTeamRecord(context: SnapshotStatsContext) {
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
  context: SnapshotStatsContext,
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
  context: SnapshotStatsContext,
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
  context: SnapshotStatsContext,
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

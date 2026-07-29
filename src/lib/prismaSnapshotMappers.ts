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
import type { getTeamGameTotals, GameState } from "./gameEngine.ts";
import { toPlayerPersistenceData } from "./playerPersistenceData.ts";
import {
  fromPersistedStatsData,
  toPersistedStatsData,
} from "./playerStatsPersistence.ts";
import { defaultGameRules } from "./seedTeam.ts";
import { addStats, createZeroStats } from "./statCalculations.ts";
import {
  subtractStat,
  subtractStats,
} from "./seasonStatRules.ts";
import type {
  BatterResult,
  LocalGameStatus,
  OutType,
} from "@/types/game";
import type { Player } from "@/types/player";
import type { RunnerMovement } from "@/types/runner";
import type { PlayerStats } from "@/types/stats";

export function toPlayerCreate(teamId: string, player: Player) {
  return {
    id: player.id,
    teamId,
    ...toPlayerUpdate(player),
  };
}

export function toPlayerUpdate(player: Player) {
  return toPlayerPersistenceData(player, {
    gender: mapPlayerGender,
    bats: mapBattingSide,
    throws: mapThrowingSide,
    speedRating: mapSpeedRating,
    defensiveRating: mapDefensiveRating,
  });
}

export function toRuleSettingsCreate(gameId: string, rules = defaultGameRules) {
  return {
    gameId,
    ...toRuleSettingsUpdate(rules),
  };
}

export function toRuleSettingsUpdate(rules = defaultGameRules) {
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

export function fromPlayerStatsRecord(stats: PlayerStats): PlayerStats {
  return fromPersistedStatsData(stats);
}

export type PersistedTeamSeasonStats = ReturnType<typeof createZeroTeamSeasonStats>;
export type PersistedTeamGameStats = ReturnType<typeof createZeroTeamGameStats>;

export function createZeroTeamGameStats() {
  return {
    ...createZeroStats(),
    opponentRuns: 0,
    leftOnBase: 0,
  };
}

export function createZeroTeamSeasonStats() {
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

export function fromTeamGameStatsRecord(
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

export function fromTeamSeasonStatsRecord(stats: PersistedTeamSeasonStats): PersistedTeamSeasonStats {
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

export function subtractTeamGameFromSeasonStats(
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

export function addTeamGameToSeasonStats(
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

export function toRunnerAdvancementCreate(movement: RunnerMovement) {
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

export function uniquePlayers(players: Player[]) {
  return Array.from(new Map(players.map((player) => [player.id, player])).values());
}

export function getGameResult(teamScore: number, opponentScore: number) {
  if (teamScore > opponentScore) return PrismaGameResult.WIN;
  if (teamScore < opponentScore) return PrismaGameResult.LOSS;
  return PrismaGameResult.TIE;
}

export function getRecordCounts(status: LocalGameStatus, teamScore: number, opponentScore: number) {
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

export function mapInningHalf(value: GameState["half"]) {
  return value === "Top" ? PrismaInningHalf.TOP : PrismaInningHalf.BOTTOM;
}

export function mapGameStatus(value: LocalGameStatus) {
  if (value === "IN_PROGRESS") return PrismaGameStatus.IN_PROGRESS;
  if (value === "FINAL") return PrismaGameStatus.FINAL;
  return PrismaGameStatus.SCHEDULED;
}

export function mapLocalGameStatus(value: PrismaGameStatus): LocalGameStatus {
  if (value === PrismaGameStatus.IN_PROGRESS) return "IN_PROGRESS";
  if (value === PrismaGameStatus.FINAL) return "FINAL";
  return "PREGAME";
}

export function mapBatterResult(value: BatterResult) {
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

export function mapOutType(value: OutType) {
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

export function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

import {
  BattingSide as PrismaBattingSide,
  BatterResult as PrismaBatterResult,
  DefensiveRating as PrismaDefensiveRating,
  GameStatus as PrismaGameStatus,
  OutType as PrismaOutType,
  PlayerGender as PrismaPlayerGender,
  SpeedRating as PrismaSpeedRating,
  ThrowingSide as PrismaThrowingSide,
} from "../generated/prisma/enums.ts";
import { normalizeDefensivePositionPreference, normalizeDefensiveProfile } from "./defenseEngine.ts";
import { normalizeGameRules } from "./gameRules.ts";
import { fromPersistedStatsData } from "./playerStatsPersistence.ts";
import type { GameState } from "./gameEngine.ts";
import type { BatterResult, GameRules, OutType, ScoredPlay } from "../types/game";
import type { Player } from "../types/player";
import type { BasesState, RunnerDestination, RunnerMovement } from "../types/runner";
import type { PlayerStats } from "../types/stats";

type PersistedRuleData = {
  homeRunLimitEnabled: boolean;
  homeRunLimit: number | null;
  afterHomeRunLimit: "OUT" | "SINGLE" | "OTHER";
  runLimitPerInning: number | null;
  mercyRule: string | null;
  courtesyRunnersAllowed: boolean;
  walksAllowed: boolean;
  sacFliesTracked: boolean;
  errorsTracked: boolean;
  fieldersChoicesTracked: boolean;
};

type PersistedPlayer = {
  id: string;
  name: string;
  gender: PrismaPlayerGender;
  bats: PrismaBattingSide;
  throws: PrismaThrowingSide;
  primaryPosition: string | null;
  speedRating: PrismaSpeedRating;
  notes: string | null;
  contactNotes: string[];
  armStrength: PrismaDefensiveRating | null;
  throwAccuracy: PrismaDefensiveRating | null;
  gloveSkill: PrismaDefensiveRating | null;
  rangeRating: PrismaDefensiveRating | null;
  positionConfidence: PrismaDefensiveRating | null;
  defenseStrengths: string | null;
  defenseWeaknesses: string | null;
  bestDefensePosition: string | null;
  avoidDefensePosition: string | null;
  backupDefensePosition: string | null;
  defenseCommunicationNotes: string | null;
  defenseHealthNotes: string | null;
  roleHint: string | null;
  isActive: boolean;
  seedOrder: number | null;
  seasonStats: Partial<PlayerStats>[];
};

type PersistedAtBat = {
  id: string;
  inning: number;
  batterId: string;
  batter: { name: string };
  outsBefore: number;
  basesBefore: unknown;
  result: PrismaBatterResult;
  outType: PrismaOutType | null;
  runnerAdvancements: PersistedRunnerMovement[];
  runsScored: number;
  rbis: number;
  outsOnPlay: number;
  basesAfter: unknown;
};

type PersistedRunnerMovement = {
  playerId: string;
  player: { name: string };
  originalPlayerId: string | null;
  fromBase: "BATTER" | "FIRST" | "SECOND" | "THIRD";
  toBase: "FIRST" | "SECOND" | "THIRD" | "HOME" | "OUT";
  advancedBases: number;
  scored: boolean;
  out: boolean;
  rbiCredited: boolean;
  reason: "HIT" | "WALK" | "ERROR" | "FIELDERS_CHOICE" | "SAC_FLY" | "OUT" | "RUNNER_DECISION";
};

export type PersistedGameStatsFallbackInput = {
  id: string;
  status: PrismaGameStatus;
  updatedAt: Date;
  opponent: string;
  isHome: boolean;
  rules: PersistedRuleData | null;
  lineup: Array<{ playerId: string; player: PersistedPlayer }>;
  currentBatterIndex: number;
  inning: number;
  half: "TOP" | "BOTTOM";
  outs: number;
  teamScore: number;
  opponentScore: number;
  bases: unknown;
  stats: Array<Partial<PlayerStats> & { playerId: string }>;
  atBats: PersistedAtBat[];
};

export function buildFinalGameStateFromPersistedStats(
  game: PersistedGameStatsFallbackInput,
): GameState | null {
  if (
    game.status !== PrismaGameStatus.FINAL
    || !game.lineup.length
    || !hasGameStatsForEveryLineupPlayer(game)
  ) {
    return null;
  }

  const gameStatsByPlayerId = getPersistedStatsByPlayerIdMap(game.stats);
  const lineup = game.lineup.map((entry, index) =>
    toHistoryDetailPlayer(entry.player, index, gameStatsByPlayerId.get(entry.playerId)),
  );

  return {
    gameId: game.id,
    status: "FINAL",
    endedAt: game.updatedAt.toISOString(),
    opponent: game.opponent,
    isHome: game.isHome,
    gameRules: getLoadedGameRules(game.rules),
    lineup,
    currentBatterIndex: game.currentBatterIndex,
    inning: game.inning,
    half: game.half === "TOP" ? "Top" : "Bottom",
    outs: game.outs,
    teamScore: game.teamScore,
    opponentScore: game.opponentScore,
    bases: getPersistedBasesState(game.bases),
    defensiveAlignments: [],
    defensiveEvents: [],
    lockedPitcherPlayerId: null,
    statsByPlayerId: getPersistedStatsByPlayerId(lineup, gameStatsByPlayerId),
    plays: game.atBats.map(toHistoryDetailPlay),
    history: [],
    lastSummary: `Final against ${game.opponent}: Us ${game.teamScore} - Them ${game.opponentScore}.`,
  };
}

function hasGameStatsForEveryLineupPlayer(game: PersistedGameStatsFallbackInput) {
  const statPlayerIds = new Set(game.stats.map((stats) => stats.playerId));

  return game.lineup.every((entry) => statPlayerIds.has(entry.playerId));
}

function toHistoryDetailPlayer(
  player: PersistedPlayer,
  index: number,
  gameStats: PlayerStats | undefined,
): Player {
  const seedOrder = player.seedOrder ?? index + 1;

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
    roleHint: player.roleHint ?? defaultHistoryRoleHint(seedOrder),
    isActive: player.isActive,
    seedOrder,
    seasonStats: subtractPlayerStats(fromPersistedStatsData(player.seasonStats[0]), gameStats),
  };
}

function defaultHistoryRoleHint(seedOrder: number) {
  if (seedOrder <= 2) return "Table-setter";
  if (seedOrder <= 5) return "Run producer";
  return "Contact hitter";
}

function getPersistedStatsByPlayerIdMap(statsRecords: PersistedGameStatsFallbackInput["stats"]) {
  return new Map(statsRecords.map((stats) => [
    stats.playerId,
    fromPersistedStatsData(stats),
  ]));
}

function getPersistedStatsByPlayerId(
  lineup: Player[],
  statsByPlayerId: Map<string, PlayerStats>,
) {
  return Object.fromEntries(lineup.map((player) => [
    player.id,
    statsByPlayerId.get(player.id) ?? fromPersistedStatsData(null),
  ]));
}

function subtractPlayerStats(currentStats: PlayerStats, gameStats: PlayerStats | undefined): PlayerStats {
  if (!gameStats) {
    return currentStats;
  }

  return Object.fromEntries(
    playerStatFields.map((field) => [field, Math.max(0, currentStats[field] - gameStats[field])]),
  ) as PlayerStats;
}

const playerStatFields = [
  "gamesPlayed",
  "plateAppearances",
  "atBats",
  "hits",
  "singles",
  "doubles",
  "triples",
  "homeRuns",
  "walks",
  "reachedOnError",
  "fieldersChoice",
  "sacFlies",
  "outs",
  "groundouts",
  "flyouts",
  "lineouts",
  "strikeoutsLooking",
  "strikeoutsSwinging",
  "otherOuts",
  "doublePlays",
  "productiveOuts",
  "runs",
  "rbis",
] as const satisfies readonly (keyof PlayerStats)[];

function toHistoryDetailPlay(atBat: PersistedAtBat): ScoredPlay {
  const result = fromPrismaBatterResult(atBat.result);

  return {
    id: atBat.id,
    inning: atBat.inning,
    batterId: atBat.batterId,
    batterName: atBat.batter.name,
    outsBefore: atBat.outsBefore,
    basesBefore: getPersistedBasesState(atBat.basesBefore),
    result,
    outType: atBat.outType ? fromPrismaOutType(atBat.outType) : undefined,
    runnerAdvancements: atBat.runnerAdvancements.map(toHistoryDetailRunnerMovement),
    runsScored: atBat.runsScored,
    rbis: atBat.rbis,
    outsOnPlay: atBat.outsOnPlay,
    basesAfter: getPersistedBasesState(atBat.basesAfter),
    summary: `${atBat.batter.name}: ${result}`,
  };
}

function toHistoryDetailRunnerMovement(movement: PersistedRunnerMovement): RunnerMovement {
  return {
    playerId: movement.playerId,
    playerName: movement.player.name,
    originalPlayerId: movement.originalPlayerId ?? undefined,
    fromBase: fromPrismaRunnerStart(movement.fromBase),
    toBase: fromPrismaRunnerEnd(movement.toBase),
    advancedBases: movement.advancedBases,
    scored: movement.scored,
    out: movement.out,
    rbiCredited: movement.rbiCredited,
    reason: fromPrismaAdvanceReason(movement.reason),
  };
}

function getPersistedBasesState(value: unknown): BasesState {
  if (!isRecord(value)) {
    return createEmptyBasesState();
  }

  return {
    first: getPersistedRunnerSlot(value.first),
    second: getPersistedRunnerSlot(value.second),
    third: getPersistedRunnerSlot(value.third),
  };
}

function getPersistedRunnerSlot(value: unknown) {
  if (!isRecord(value) || typeof value.playerId !== "string" || typeof value.name !== "string") {
    return null;
  }

  return {
    playerId: value.playerId,
    name: value.name,
    originalPlayerId: typeof value.originalPlayerId === "string" ? value.originalPlayerId : undefined,
    originalName: typeof value.originalName === "string" ? value.originalName : undefined,
  };
}

function createEmptyBasesState(): BasesState {
  return {
    first: null,
    second: null,
    third: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getLoadedGameRules(rules: PersistedRuleData | null) {
  return rules ? fromRuleData(rules) : normalizeGameRules(undefined);
}

function fromRuleData(rules: PersistedRuleData): GameRules {
  return normalizeGameRules({
    ...rules,
    homeRunLimit: rules.homeRunLimit ?? undefined,
    afterHomeRunLimit: homeRunLimitOutcomeFromPrisma[rules.afterHomeRunLimit],
    mercyRule: rules.mercyRule ?? undefined,
  });
}

const homeRunLimitOutcomeFromPrisma: Record<"OUT" | "SINGLE" | "OTHER", GameRules["afterHomeRunLimit"]> = {
  OUT: "Out",
  SINGLE: "Single",
  OTHER: "Other",
};

function fromPrismaBatterResult(result: PrismaBatterResult): BatterResult {
  const results: Record<PrismaBatterResult, BatterResult> = {
    SINGLE: "1B",
    DOUBLE: "2B",
    TRIPLE: "3B",
    HOME_RUN: "HR",
    WALK: "BB",
    REACHED_ON_ERROR: "ROE",
    FIELDERS_CHOICE: "FC",
    SAC_FLY: "SF",
    OUT: "Out",
    DOUBLE_PLAY: "DP",
  };

  return results[result];
}

function fromPrismaOutType(outType: PrismaOutType): OutType {
  return outType;
}

function fromPrismaRunnerStart(start: PersistedRunnerMovement["fromBase"]): RunnerMovement["fromBase"] {
  const starts: Record<PersistedRunnerMovement["fromBase"], RunnerMovement["fromBase"]> = {
    BATTER: "BATTER",
    FIRST: "1B",
    SECOND: "2B",
    THIRD: "3B",
  };

  return starts[start];
}

function fromPrismaRunnerEnd(end: PersistedRunnerMovement["toBase"]): RunnerDestination {
  const ends: Record<PersistedRunnerMovement["toBase"], RunnerDestination> = {
    FIRST: "1B",
    SECOND: "2B",
    THIRD: "3B",
    HOME: "HOME",
    OUT: "OUT",
  };

  return ends[end];
}

function fromPrismaAdvanceReason(reason: PersistedRunnerMovement["reason"]): RunnerMovement["reason"] {
  const reasons: Record<PersistedRunnerMovement["reason"], RunnerMovement["reason"]> = {
    HIT: "Hit",
    WALK: "Walk",
    ERROR: "Error",
    FIELDERS_CHOICE: "Fielder's Choice",
    SAC_FLY: "Sac Fly",
    OUT: "Out",
    RUNNER_DECISION: "Runner Decision",
  };

  return reasons[reason];
}

function fromPrismaBattingSide(value: PrismaBattingSide) {
  if (value === PrismaBattingSide.RIGHT) return "Right";
  if (value === PrismaBattingSide.LEFT) return "Left";
  if (value === PrismaBattingSide.SWITCH) return "Switch";
  return "Unknown";
}

function fromPrismaThrowingSide(value: PrismaThrowingSide) {
  if (value === PrismaThrowingSide.RIGHT) return "Right";
  if (value === PrismaThrowingSide.LEFT) return "Left";
  return "Unknown";
}

function fromPrismaSpeedRating(value: PrismaSpeedRating) {
  if (value === PrismaSpeedRating.FAST) return "Fast";
  if (value === PrismaSpeedRating.SLOW) return "Slow";
  return "Average";
}

function fromPrismaPlayerGender(value: PrismaPlayerGender) {
  if (value === PrismaPlayerGender.FEMALE) return "Female";
  if (value === PrismaPlayerGender.MALE) return "Male";
  return "Unknown";
}

function fromPrismaDefensiveRating(value: PrismaDefensiveRating | null) {
  if (value === PrismaDefensiveRating.LOW) return "Low";
  if (value === PrismaDefensiveRating.MEDIUM) return "Medium";
  if (value === PrismaDefensiveRating.HIGH) return "High";
  return "Unknown";
}

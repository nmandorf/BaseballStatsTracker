import type { BatterResult, DefensiveEventInput, GameRules, LocalGameStatus, OutType, ScoredPlay } from "@/types/game";
import type { Player } from "@/types/player";
import type {
  BaseLabel,
  BasesState,
  RunnerDestination,
  RunnerMovement,
  RunnerSlot,
  UiRunnerDestination,
} from "@/types/runner";
import type { PlayerStats } from "@/types/stats";
import type { DefensiveAlignment, DefensiveEvent } from "@/types/defense";
import {
  createDefensiveEvent,
  createDefaultDefensiveAlignment,
  generateDefensiveAlignment,
  getAlignmentForCurrentHalf,
  getAssignedPlayerIdForPosition,
  getDefensiveAlignmentIssues,
  getNextHalfInning,
  getTeamPhase,
  upsertDefensiveAlignment,
  type TeamPhase,
} from "./defenseEngine.ts";
import { defaultGameRules } from "./seedTeam.ts";
import { addBatterResult, addRun, addRunnerOut, addStats, createZeroStats, divide } from "./statCalculations.ts";

export const batterResults: BatterResult[] = ["1B", "2B", "3B", "HR", "BB", "ROE", "FC", "SF", "Out", "DP"];

export const destinationOptions: Record<BaseLabel, UiRunnerDestination[]> = {
  "1B": ["1B", "2B", "3B", "Scores", "Out"],
  "2B": ["2B", "3B", "Scores", "Out"],
  "3B": ["3B", "Scores", "Out"],
};

export const destinationLabel: Record<UiRunnerDestination, string> = {
  "1B": "Stays at 1B",
  "2B": "To 2B",
  "3B": "To 3B",
  Scores: "Scores",
  Out: "Out",
};

export type MovementSelections = Partial<Record<BaseLabel, UiRunnerDestination>>;
export type PinchRunnerSelections = Partial<Record<BaseLabel, RunnerSlot>>;

type OccupiedBaseFlags = {
  hasFirst: boolean;
  hasSecond: boolean;
  hasThird: boolean;
};

export type GameState = {
  gameId: string | null;
  status: LocalGameStatus;
  endedAt: string | null;
  opponent: string;
  isHome: boolean;
  gameRules: GameRules;
  lineup: Player[];
  currentBatterIndex: number;
  inning: number;
  half: "Top" | "Bottom";
  outs: number;
  teamScore: number;
  opponentScore: number;
  bases: BasesState;
  defensiveAlignments: DefensiveAlignment[];
  defensiveEvents: DefensiveEvent[];
  lockedPitcherPlayerId: string | null;
  statsByPlayerId: Record<string, PlayerStats>;
  plays: ScoredPlay[];
  history: GameStateSnapshot[];
  lastSummary: string;
};

export type GameStateSnapshot = Omit<GameState, "history">;

export type PlayPreview = {
  batter: Player;
  result: BatterResult;
  outType?: OutType;
  movements: RunnerMovement[];
  nextBases: BasesState;
  runs: number;
  runnerOuts: number;
  batterOuts: number;
  outsOnPlay: number;
  projectedOuts: number;
  inningEnded: boolean;
  productiveOut: boolean;
  rbis: number;
  summary: string;
};

export type DefensiveEventPreview = {
  event: DefensiveEvent;
  projectedOuts: number;
  inningEnded: boolean;
  nextInning: number;
  nextHalf: GameState["half"];
  summary: string;
};

export type TeamGameTotals = {
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;
  reachedOnError: number;
  fieldersChoice: number;
  sacFlies: number;
  runs: number;
  rbis: number;
  outs: number;
  groundouts: number;
  flyouts: number;
  lineouts: number;
  strikeoutsLooking: number;
  strikeoutsSwinging: number;
  otherOuts: number;
  doublePlays: number;
  productiveOuts: number;
  strikeouts: number;
  ballsInPlay: number;
  strikeoutRate: number;
  ballInPlayRate: number;
  productiveOutRate: number;
  totalBases: number;
  battingAverage: number;
  onBasePercentage: number;
  sluggingPercentage: number;
  ops: number;
};

class InvalidPlayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlayError";
  }
}

export type CompletedGameSummary = {
  id: string;
  opponent: string;
  endedAt: string | null;
  teamScore: number;
  opponentScore: number;
  result: "Win" | "Loss" | "Tie";
  playCount: number;
  hasBoxScore?: boolean;
  href: string;
};

export const firstGameHistoryId = "first-game";

type CreateInitialGameStateOptions = {
  gameId?: string;
  opponent?: string;
  isHome?: boolean;
  status?: LocalGameStatus;
  gameRules?: GameRules;
};

export function createInitialGameState(
  lineup: Player[],
  {
    gameId,
    opponent = "Opponent",
    isHome = false,
    status = "PREGAME",
    gameRules = defaultGameRules,
  }: CreateInitialGameStateOptions = {},
): GameState {
  return {
    gameId: normalizeInitialGameId(gameId),
    status,
    endedAt: null,
    opponent,
    isHome,
    gameRules,
    lineup,
    currentBatterIndex: 0,
    inning: 1,
    half: "Top",
    outs: 0,
    teamScore: 0,
    opponentScore: 0,
    bases: createEmptyBases(),
    defensiveAlignments: [],
    defensiveEvents: [],
    lockedPitcherPlayerId: null,
    statsByPlayerId: createGameStatsByPlayerId(lineup),
    plays: [],
    history: [],
    lastSummary: "First game of the season. All player stats start at zero.",
  };
}

function normalizeInitialGameId(gameId: string | undefined) {
  return gameId ?? null;
}

function createEmptyBases(): BasesState {
  return {
    first: null,
    second: null,
    third: null,
  };
}

export function getCurrentBatter(state: GameState) {
  return state.lineup[state.currentBatterIndex];
}

export function getCurrentTeamPhase(state: GameState): TeamPhase {
  return getTeamPhase(state.isHome, state.half);
}

export function getLiveGameHref(state: Pick<GameState, "isHome" | "half">) {
  return getTeamPhase(state.isHome, state.half) === "BATTING" ? "/stats-entry" : "/defense";
}

export function getDefensiveAlignmentForHalf(
  state: GameState,
  inning: number,
  half: GameState["half"],
) {
  return getAlignmentForCurrentHalf(state.defensiveAlignments, inning, half);
}

export function getOrCreateDefensiveAlignmentForHalf(
  state: GameState,
  inning: number,
  half: GameState["half"],
): DefensiveAlignment {
  const currentAlignment = getDefensiveAlignmentForHalf(state, inning, half);

  if (currentAlignment) {
    return currentAlignment;
  }

  return generateDefensiveAlignment({
    players: state.lineup,
    priorAlignments: state.defensiveAlignments,
    inning,
    half,
    lockedPitcherPlayerId: state.lockedPitcherPlayerId,
  });
}

export function initializeStartingDefense(state: GameState, alignment?: DefensiveAlignment): GameState {
  const startingAlignment = alignment ?? createDefaultDefensiveAlignment(state.lineup, state.inning, state.half);
  const lockedPitcherPlayerId = getAssignedPlayerIdForPosition(startingAlignment, "P");
  const issues = getDefensiveAlignmentIssues(startingAlignment, state.lineup, lockedPitcherPlayerId);

  if (issues.length > 0) {
    return {
      ...state,
      status: "PREGAME",
      lockedPitcherPlayerId: null,
    };
  }

  return {
    ...state,
    lockedPitcherPlayerId,
    defensiveAlignments: upsertDefensiveAlignment(state.defensiveAlignments, startingAlignment),
  };
}

export function saveDefensiveAlignment(state: GameState, alignment: DefensiveAlignment): GameState {
  if (state.status === "FINAL") {
    return state;
  }

  const issues = getDefensiveAlignmentIssues(alignment, state.lineup, state.lockedPitcherPlayerId);

  if (issues.length > 0) {
    return state;
  }

  return {
    ...state,
    defensiveAlignments: upsertDefensiveAlignment(state.defensiveAlignments, alignment),
  };
}

export function getGameStats(state: GameState) {
  return state.statsByPlayerId;
}

export function getSeasonStats(lineup: Player[]) {
  return Object.fromEntries(lineup.map((player) => [player.id, player.seasonStats]));
}

export function getSeasonStatsByPlayerId(players: Player[], state?: GameState) {
  return Object.fromEntries(players.map((player) => [player.id, getPlayerSeasonStats(player, state)]));
}

export function getPlayerGameStats(state: GameState, playerId: string) {
  return state.statsByPlayerId[playerId] ?? createZeroStats();
}

export function getPlayerSeasonStats(player: Player, state?: GameState) {
  if (!state) {
    return player.seasonStats;
  }

  const lineupPlayer = state.lineup.find((item) => item.id === player.id);

  if (!lineupPlayer) {
    return player.seasonStats;
  }

  const playerGameStats = {
    ...getPlayerGameStats(state, player.id),
    gamesPlayed: state.status === "PREGAME" ? 0 : 1,
  };

  return addStats(lineupPlayer.seasonStats, playerGameStats);
}

export function updatePlayerSeasonStatsBaseline(
  state: GameState,
  playerId: string,
  seasonStats: PlayerStats,
): GameState {
  if (!state.lineup.some((player) => player.id === playerId)) {
    return state;
  }

  return {
    ...state,
    lineup: updateLineupPlayerSeasonStats(state.lineup, playerId, seasonStats),
    history: state.history.map((snapshot) => ({
      ...snapshot,
      lineup: updateLineupPlayerSeasonStats(snapshot.lineup, playerId, seasonStats),
    })),
  };
}

export function getCompletedGameHistory(source: GameState | GameState[]): CompletedGameSummary[] {
  return getCompletedGames(source).map((game) => getCompletedGameSummary(game));
}

export function getCompletedGameById(source: GameState | GameState[], gameId: string) {
  return getCompletedGames(source).find((game) => getCompletedGameId(game) === gameId) ?? null;
}

function getCompletedGames(source: GameState | GameState[]) {
  if (Array.isArray(source)) {
    return source.filter((game) => game.status === "FINAL");
  }

  return source.status === "FINAL" ? [source] : [];
}

export function upsertCompletedGame(games: GameState[], game: GameState): GameState[] {
  if (game.status !== "FINAL") {
    return games;
  }

  return [game, ...games.filter((item) => getCompletedGameId(item) !== getCompletedGameId(game))];
}

function getCompletedGameSummary(state: GameState): CompletedGameSummary {
  return {
    id: getCompletedGameId(state),
    opponent: state.opponent,
    endedAt: state.endedAt,
    teamScore: state.teamScore,
    opponentScore: state.opponentScore,
    result: getGameOutcomeLabel(state.teamScore, state.opponentScore),
    playCount: state.plays.length,
    hasBoxScore: getTeamGameTotals(state).plateAppearances > 0,
    href: `/stats/games/${getCompletedGameId(state)}`,
  };
}

function getCompletedGameId(state: GameState) {
  return state.gameId ?? firstGameHistoryId;
}


export function occupiedBaseEntries(bases: BasesState): Array<readonly [BaseLabel, RunnerSlot]> {
  return [
    ["1B", bases.first] as const,
    ["2B", bases.second] as const,
    ["3B", bases.third] as const,
  ].filter((entry): entry is readonly [BaseLabel, RunnerSlot] => Boolean(entry[1]));
}

export function getResultLockReason(result: BatterResult, bases: BasesState, outs: number): string | null {
  return resultLockChecks[result]?.(bases, outs) ?? null;
}

type ResultLockCheck = (bases: BasesState, outs: number) => string | null;

const resultLockChecks: Partial<Record<BatterResult, ResultLockCheck>> = {
  SF: getSacFlyLockReason,
  DP: getDoublePlayLockReason,
  FC: getFieldersChoiceLockReason,
};

function getSacFlyLockReason(bases: BasesState, outs: number) {
  if (!bases.third) return "Sac fly needs a runner on 3B";
  if (outs >= 2) return "Sac fly needs fewer than 2 outs";
  return null;
}

function getDoublePlayLockReason(bases: BasesState, outs: number) {
  if (!hasAnyRunner(bases)) return "Double play needs a runner on base";
  if (outs >= 2) return "Double play needs fewer than 2 outs";
  return null;
}

function getFieldersChoiceLockReason(bases: BasesState) {
  return hasAnyRunner(bases) ? null : "Fielder's choice needs a runner on base";
}

function hasAnyRunner(bases: BasesState) {
  return Boolean(bases.first || bases.second || bases.third);
}

export function createDefaultMovements(result: BatterResult, bases: BasesState): MovementSelections {
  const occupiedBases = getOccupiedBaseFlags(bases);
  const movements = createStationaryMovements(occupiedBases);

  applyDefaultMovementForResult(result, occupiedBases, movements);

  return movements;
}

function getOccupiedBaseFlags(bases: BasesState): OccupiedBaseFlags {
  return {
    hasFirst: Boolean(bases.first),
    hasSecond: Boolean(bases.second),
    hasThird: Boolean(bases.third),
  };
}

function createStationaryMovements(occupiedBases: OccupiedBaseFlags): MovementSelections {
  const movements: MovementSelections = {};

  if (occupiedBases.hasFirst) movements["1B"] = "1B";
  if (occupiedBases.hasSecond) movements["2B"] = "2B";
  if (occupiedBases.hasThird) movements["3B"] = "3B";

  return movements;
}

function applyDefaultMovementForResult(
  result: BatterResult,
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  defaultMovementAppliers[result]?.(occupiedBases, movements);
}

const defaultMovementAppliers: Partial<Record<
  BatterResult,
  (occupiedBases: OccupiedBaseFlags, movements: MovementSelections) => void
>> = {
  "1B": applySingleMovement,
  "2B": applyDoubleMovement,
  "3B": scoreAllOccupiedRunners,
  HR: scoreAllOccupiedRunners,
  BB: applyWalkMovement,
  ROE: applyReachedOnErrorMovement,
  FC: applyFieldersChoiceMovement,
  SF: applySacFlyMovement,
  DP: applyDoublePlayMovement,
};

function applySingleMovement(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (occupiedBases.hasFirst) movements["1B"] = "2B";
  if (occupiedBases.hasSecond) movements["2B"] = "Scores";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyDoubleMovement(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (occupiedBases.hasFirst) movements["1B"] = "3B";
  if (occupiedBases.hasSecond) movements["2B"] = "Scores";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function scoreAllOccupiedRunners(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (occupiedBases.hasFirst) movements["1B"] = "Scores";
  if (occupiedBases.hasSecond) movements["2B"] = "Scores";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyWalkMovement(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (!occupiedBases.hasFirst) {
    return;
  }

  movements["1B"] = "2B";
  applyForcedWalkFromSecond(occupiedBases, movements);
}

function applyForcedWalkFromSecond(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (!occupiedBases.hasSecond) {
    return;
  }

  movements["2B"] = "3B";
  applyForcedWalkFromThird(occupiedBases, movements);
}

function applyForcedWalkFromThird(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyReachedOnErrorMovement(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (occupiedBases.hasFirst) movements["1B"] = "2B";
  if (occupiedBases.hasSecond) movements["2B"] = "3B";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyFieldersChoiceMovement(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (areBasesLoaded(occupiedBases)) {
    applyBasesLoadedFieldersChoice(movements);
    return;
  }

  if (occupiedBases.hasFirst) applyRunnerOnFirstFieldersChoice(occupiedBases, movements);
}

function areBasesLoaded(occupiedBases: OccupiedBaseFlags) {
  return occupiedBases.hasFirst && occupiedBases.hasSecond && occupiedBases.hasThird;
}

function applyBasesLoadedFieldersChoice(movements: MovementSelections) {
  movements["3B"] = "Out";
  movements["2B"] = "3B";
  movements["1B"] = "2B";
}

function applyRunnerOnFirstFieldersChoice(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  movements["1B"] = "Out";
  if (occupiedBases.hasSecond) movements["2B"] = "3B";
  if (occupiedBases.hasThird) movements["3B"] = "3B";
}

function applySacFlyMovement(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyDoublePlayMovement(occupiedBases: OccupiedBaseFlags, movements: MovementSelections) {
  if (occupiedBases.hasFirst) {
    movements["1B"] = "Out";
    return;
  }

  if (occupiedBases.hasSecond) {
    movements["2B"] = "Out";
    return;
  }

  if (occupiedBases.hasThird) movements["3B"] = "Out";
}

export function defaultRbiCredit(result: BatterResult, bases: BasesState, runsScored: number) {
  if (runsScored <= 0) {
    return false;
  }

  return result === "BB" ? areBasesOccupied(bases) : defaultRbiCreditByResult[result];
}

function areBasesOccupied(bases: BasesState) {
  return Boolean(bases.first && bases.second && bases.third);
}

const defaultRbiCreditByResult: Record<BatterResult, boolean> = {
  "1B": true,
  "2B": true,
  "3B": true,
  HR: true,
  BB: false,
  ROE: false,
  FC: false,
  SF: true,
  Out: false,
  DP: false,
};

export function previewPlay(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  rbiCredit: boolean,
  outType?: OutType,
): PlayPreview {
  assertValidOutType(result, outType);

  const batter = getCurrentBatter(state);
  const nextBases = createEmptyBases();
  const runnerPreview = previewBaseRunnerMovements({
    bases: state.bases,
    nextBases,
    pinchRunners,
    result,
    rbiCredit,
    selections,
  });
  const batterMovement = previewBatterMovement(batter, result, nextBases);
  const movements = [...runnerPreview.movements, batterMovement];
  const counts = getPlayPreviewCounts(state, result, runnerPreview, batterMovement, movements, rbiCredit);

  return {
    batter,
    result,
    outType: getPreviewOutType(result, outType),
    movements,
    nextBases: getPreviewNextBases(nextBases, counts.inningEnded),
    runs: counts.runs,
    runnerOuts: runnerPreview.runnerOuts,
    batterOuts: counts.batterOuts,
    outsOnPlay: counts.outsOnPlay,
    projectedOuts: counts.projectedOuts,
    inningEnded: counts.inningEnded,
    productiveOut: counts.productiveOut,
    rbis: counts.creditedRbis,
    summary: buildSummary(batter.name, result, outType, movements, counts.runs, state.outs, counts.projectedOuts, counts.creditedRbis),
  };
}

type PlayPreviewCounts = {
  runs: number;
  batterOuts: number;
  outsOnPlay: number;
  projectedOuts: number;
  inningEnded: boolean;
  creditedRbis: number;
  productiveOut: boolean;
};

function getPlayPreviewCounts(
  state: GameState,
  result: BatterResult,
  runnerPreview: BaseRunnerPreview,
  batterMovement: RunnerMovement,
  movements: RunnerMovement[],
  rbiCredit: boolean,
): PlayPreviewCounts {
  const runs = runnerPreview.runs + getBatterRunCount(batterMovement);
  const batterOuts = getBatterOuts(result);
  const outsOnPlay = batterOuts + runnerPreview.runnerOuts;
  const projectedOuts = Math.min(3, state.outs + outsOnPlay);
  const creditedRbis = rbiCredit ? runs : 0;

  return {
    runs,
    batterOuts,
    outsOnPlay,
    projectedOuts,
    inningEnded: hasInningEnded(state, outsOnPlay),
    creditedRbis,
    productiveOut: isProductiveOut(result, movements, creditedRbis),
  };
}

function getBatterRunCount(batterMovement: RunnerMovement) {
  return batterMovement.scored ? 1 : 0;
}

function hasInningEnded(state: GameState, outsOnPlay: number) {
  return state.outs + outsOnPlay >= 3;
}

function getPreviewOutType(result: BatterResult, outType: OutType | undefined) {
  return result === "Out" ? outType : undefined;
}

function getPreviewNextBases(nextBases: BasesState, inningEnded: boolean) {
  return inningEnded ? createEmptyBases() : nextBases;
}

type BaseRunnerPreviewInput = {
  bases: BasesState;
  nextBases: BasesState;
  pinchRunners: PinchRunnerSelections;
  result: BatterResult;
  rbiCredit: boolean;
  selections: MovementSelections;
};

function previewBaseRunnerMovements(input: BaseRunnerPreviewInput) {
  const preview = createEmptyBaseRunnerPreview();

  for (const [base, runner] of occupiedBaseEntries(input.bases)) {
    const selectedRunner = input.pinchRunners[base] ?? runner;
    const destination = toRunnerDestination(input.selections[base] ?? base);
    const movement = buildBaseRunnerMovement(input, base, runner, selectedRunner, destination);

    placeRunner(input.nextBases, destination, selectedRunner);
    addBaseRunnerMovement(preview, movement);
  }

  return preview;
}

type BaseRunnerPreview = {
  movements: RunnerMovement[];
  runs: number;
  runnerOuts: number;
};

function createEmptyBaseRunnerPreview(): BaseRunnerPreview {
  return {
    movements: [],
    runs: 0,
    runnerOuts: 0,
  };
}

function addBaseRunnerMovement(preview: BaseRunnerPreview, movement: RunnerMovement) {
  preview.runs += movement.scored ? 1 : 0;
  preview.runnerOuts += movement.out ? 1 : 0;
  preview.movements.push(movement);
}

function buildBaseRunnerMovement(
  input: BaseRunnerPreviewInput,
  base: BaseLabel,
  runner: RunnerSlot,
  selectedRunner: RunnerSlot,
  destination: RunnerDestination,
) {
  const movement = buildRunnerMovement({
    runner: selectedRunner,
    fromBase: base,
    destination,
    result: input.result,
    rbiCredit: input.rbiCredit,
  });

  return withOriginalRunnerMetadata(movement, runner, selectedRunner);
}

function withOriginalRunnerMetadata(
  movement: RunnerMovement,
  runner: RunnerSlot,
  selectedRunner: RunnerSlot,
) {
  const originalPlayerId = selectedRunner.originalPlayerId ?? runner.originalPlayerId;

  if (!originalPlayerId) {
    return movement;
  }

  return {
    ...movement,
    originalPlayerId,
    originalPlayerName: selectedRunner.originalName ?? runner.originalName,
  };
}

function previewBatterMovement(
  batter: Player,
  result: BatterResult,
  nextBases: BasesState,
) {
  const batterDestination = getBatterDestination(result);
  const batterMovement = buildRunnerMovement({
    runner: { playerId: batter.id, name: batter.name },
    fromBase: "BATTER",
    destination: batterDestination,
    result,
    rbiCredit: false,
  });

  placeRunner(nextBases, batterDestination, { playerId: batter.id, name: batter.name });
  return batterMovement;
}

export function savePlay(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  rbiCredit: boolean,
  outType?: OutType,
): GameState {
  if (state.status === "FINAL") {
    return state;
  }

  assertValidPlay(state, result, selections, pinchRunners, outType);

  const preview = previewPlay(state, result, selections, pinchRunners, rbiCredit, outType);
  const savedPlay = createSavedPlayUpdate(state, preview, result, outType);

  return applySavedPlayUpdate(state, savedPlay);
}

type SavedPlayUpdate = {
  play: ScoredPlay;
  preview: PlayPreview;
  nextStats: Record<string, PlayerStats>;
  nextBatterIndex: number;
  nextHalfInning: Pick<GameState, "inning" | "half">;
  defensiveAlignments: DefensiveAlignment[];
};

function createSavedPlayUpdate(
  state: GameState,
  preview: PlayPreview,
  result: BatterResult,
  outType?: OutType,
): SavedPlayUpdate {
  const nextHalfInning = getNextHalfInningAfterPlay(state, preview);

  return {
    play: buildScoredPlay(state, preview, result, outType),
    preview,
    nextStats: applyPlayStats(state.statsByPlayerId, preview, result, outType),
    nextBatterIndex: (state.currentBatterIndex + 1) % state.lineup.length,
    nextHalfInning,
    defensiveAlignments: getDefensiveAlignmentsAfterPlay(state, nextHalfInning, preview),
  };
}

function buildScoredPlay(
  state: GameState,
  preview: PlayPreview,
  result: BatterResult,
  outType?: OutType,
): ScoredPlay {
  const play: ScoredPlay = {
    id: `play-${state.plays.length + 1}`,
    inning: state.inning,
    half: state.half,
    batterId: preview.batter.id,
    batterName: preview.batter.name,
    outsBefore: state.outs,
    basesBefore: cloneBases(state.bases),
    result,
    outType: result === "Out" ? outType : undefined,
    runnerAdvancements: preview.movements,
    runsScored: preview.runs,
    rbis: preview.rbis,
    outsOnPlay: preview.outsOnPlay,
    basesAfter: cloneBases(preview.nextBases),
    summary: preview.summary,
  };

  return play;
}

function getNextHalfInningAfterPlay(
  state: GameState,
  preview: PlayPreview,
): Pick<GameState, "inning" | "half"> {
  return preview.inningEnded ? getNextHalfInning(state.inning, state.half) : state;
}

function getDefensiveAlignmentsAfterPlay(
  state: GameState,
  nextHalfInning: Pick<GameState, "inning" | "half">,
  preview: PlayPreview,
) {
  const nextDefenseAlignment = getGeneratedNextDefenseAlignment(state, nextHalfInning, preview);

  if (!nextDefenseAlignment || !canSaveGeneratedDefense(state, nextDefenseAlignment)) {
    return state.defensiveAlignments;
  }

  return upsertDefensiveAlignment(state.defensiveAlignments, nextDefenseAlignment);
}

function getGeneratedNextDefenseAlignment(
  state: GameState,
  nextHalfInning: Pick<GameState, "inning" | "half">,
  preview: PlayPreview,
) {
  if (!shouldGenerateNextDefense(state, nextHalfInning, preview)) {
    return null;
  }

  return generateDefensiveAlignment({
    players: state.lineup,
    priorAlignments: state.defensiveAlignments,
    inning: nextHalfInning.inning,
    half: nextHalfInning.half,
    lockedPitcherPlayerId: state.lockedPitcherPlayerId,
  });
}

function shouldGenerateNextDefense(
  state: GameState,
  nextHalfInning: Pick<GameState, "inning" | "half">,
  preview: PlayPreview,
) {
  return [
    preview.inningEnded,
    getTeamPhase(state.isHome, nextHalfInning.half) === "FIELDING",
    !getAlignmentForCurrentHalf(state.defensiveAlignments, nextHalfInning.inning, nextHalfInning.half),
  ].every(Boolean);
}

function canSaveGeneratedDefense(state: GameState, alignment: DefensiveAlignment) {
  return getDefensiveAlignmentIssues(
    alignment,
    state.lineup,
    state.lockedPitcherPlayerId,
  ).length === 0;
}

function applySavedPlayUpdate(state: GameState, savedPlay: SavedPlayUpdate): GameState {
  return {
    ...state,
    inning: savedPlay.nextHalfInning.inning,
    half: savedPlay.nextHalfInning.half,
    outs: getNextOutCount(savedPlay.preview),
    teamScore: state.teamScore + savedPlay.preview.runs,
    bases: cloneBases(savedPlay.preview.nextBases),
    defensiveAlignments: savedPlay.defensiveAlignments,
    statsByPlayerId: savedPlay.nextStats,
    plays: [...state.plays, savedPlay.play],
    currentBatterIndex: savedPlay.nextBatterIndex,
    history: [...state.history, snapshotState(state)],
    lastSummary: savedPlay.preview.summary,
  };
}

function getNextOutCount(preview: PlayPreview) {
  return preview.inningEnded ? 0 : preview.projectedOuts;
}

export function getLatestCorrectablePlay(state: GameState): ScoredPlay | null {
  if (!canCorrectLatestPlay(state)) {
    return null;
  }

  const latestPlay = getLatestPlayInCurrentHalf(state);

  return latestPlay && hasPrePlaySnapshot(state, latestPlay) ? latestPlay : null;
}

function canCorrectLatestPlay(state: GameState) {
  return state.status === "IN_PROGRESS" && getCurrentTeamPhase(state) === "BATTING";
}

function getLatestPlayInCurrentHalf(state: GameState) {
  const latestPlay = state.plays.at(-1);

  if (!latestPlay || !isLatestPlayInCurrentHalf(state, latestPlay)) {
    return null;
  }

  return latestPlay;
}

function isLatestPlayInCurrentHalf(state: GameState, latestPlay: ScoredPlay) {
  return [
    latestPlay.inning === state.inning,
    !latestPlay.half || latestPlay.half === state.half,
  ].every(Boolean);
}

function hasPrePlaySnapshot(state: GameState, latestPlay: ScoredPlay) {
  return findPrePlaySnapshotIndex(state, latestPlay) >= 0;
}

export function getStateBeforeLatestPlayCorrection(state: GameState, playId: string): GameState | null {
  const latestPlay = getLatestCorrectablePlay(state);

  if (!latestPlay || latestPlay.id !== playId) {
    return null;
  }

  const snapshotIndex = findPrePlaySnapshotIndex(state, latestPlay);
  const prePlaySnapshot = state.history[snapshotIndex];

  if (!prePlaySnapshot) {
    return null;
  }

  return {
    ...prePlaySnapshot,
    defensiveAlignments: state.defensiveAlignments,
    defensiveEvents: state.defensiveEvents,
    lockedPitcherPlayerId: state.lockedPitcherPlayerId,
    opponentScore: state.opponentScore,
    history: state.history.slice(0, snapshotIndex),
  };
}

export function replaceLatestSavedPlay(
  state: GameState,
  playId: string,
  result: BatterResult,
  selections: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  rbiCredit: boolean,
  outType?: OutType,
): GameState {
  const correctionState = getStateBeforeLatestPlayCorrection(state, playId);

  if (!correctionState) {
    throw new InvalidPlayError("Only the latest play in the active offensive half can be corrected.");
  }

  const correctedState = savePlay(
    correctionState,
    result,
    selections,
    pinchRunners,
    rbiCredit,
    outType,
  );

  return {
    ...correctedState,
    history: [...state.history, snapshotState(state)],
  };
}

export function previewDefensiveEvent(state: GameState, input: DefensiveEventInput): DefensiveEventPreview {
  const fielder = input.fielderId ? state.lineup.find((player) => player.id === input.fielderId) : null;
  const event = createDefensiveEvent({
    id: `defense-event-${state.defensiveEvents.length + 1}`,
    inning: state.inning,
    half: state.half,
    type: input.type,
    fielder,
    position: input.position,
    outsRecorded: input.outsRecorded,
    runsAllowed: input.runsAllowed,
    basesAllowed: input.basesAllowed,
    ballType: input.ballType,
    misplayType: input.misplayType,
    misplayResult: input.misplayResult,
    greatPlayImpact: input.greatPlayImpact,
    involvedPlayerIds: input.involvedPlayerIds,
    notes: input.notes,
  });
  const projectedOuts = Math.min(3, state.outs + event.outsRecorded);
  const inningEnded = state.outs + event.outsRecorded >= 3;
  const nextHalfInning = inningEnded ? getNextHalfInning(state.inning, state.half) : state;

  return {
    event,
    projectedOuts,
    inningEnded,
    nextInning: nextHalfInning.inning,
    nextHalf: nextHalfInning.half,
    summary: buildDefensiveSummary(event, state.outs, projectedOuts),
  };
}

export function saveDefensiveEvent(state: GameState, input: DefensiveEventInput): GameState {
  if (state.status === "FINAL") {
    return state;
  }

  const preview = previewDefensiveEvent(state, input);

  return {
    ...state,
    inning: preview.nextInning,
    half: preview.nextHalf,
    outs: preview.inningEnded ? 0 : preview.projectedOuts,
    opponentScore: state.opponentScore + preview.event.runsAllowed,
    bases: preview.inningEnded ? createEmptyBases() : state.bases,
    defensiveEvents: [...state.defensiveEvents, preview.event],
    history: [...state.history, snapshotState(state)],
    lastSummary: preview.summary,
  };
}

export function undoLastPlay(state: GameState): GameState {
  const previous = state.history.at(-1);

  if (!previous) {
    return state;
  }

  return {
    ...previous,
    history: state.history.slice(0, -1),
  };
}

export function endGame(state: GameState, endedAt = new Date().toISOString(), teamName = "Us"): GameState {
  if (state.status === "FINAL") {
    return state;
  }

  return {
    ...state,
    status: "FINAL",
    endedAt,
    outs: 0,
    bases: createEmptyBases(),
    history: [...state.history, snapshotState(state)],
    lastSummary: `Final: ${teamName} ${state.teamScore}, ${state.opponent} ${state.opponentScore}. ${state.plays.length} play${state.plays.length === 1 ? "" : "s"} scored.`,
  };
}

export function getTeamGameTotals(state: GameState): TeamGameTotals {
  return getTeamTotalsFromStats(Object.values(state.statsByPlayerId));
}

export function getTeamSeasonTotals(players: Player[], state?: GameState): TeamGameTotals {
  return getTeamTotalsFromStats(Object.values(getSeasonStatsByPlayerId(players, state)));
}

function getTeamTotalsFromStats(statsList: PlayerStats[]): TeamGameTotals {
  const totals = statsList.reduce(addPlayerStatsToTeamTotals, createZeroTeamTotals());

  const onBaseTimes = totals.hits + totals.walks + totals.reachedOnError;
  const strikeouts = totals.strikeoutsLooking + totals.strikeoutsSwinging;
  const ballsInPlay =
    totals.hits +
    totals.reachedOnError +
    totals.fieldersChoice +
    totals.groundouts +
    totals.flyouts +
    totals.lineouts;

  return {
    ...totals,
    strikeouts,
    ballsInPlay,
    strikeoutRate: divide(strikeouts, totals.plateAppearances),
    ballInPlayRate: divide(ballsInPlay, totals.plateAppearances),
    productiveOutRate: divide(totals.productiveOuts, totals.outs),
    battingAverage: divide(totals.hits, totals.atBats),
    onBasePercentage: divide(onBaseTimes, totals.plateAppearances),
    sluggingPercentage: divide(totals.totalBases, totals.atBats),
    ops: divide(onBaseTimes, totals.plateAppearances) + divide(totals.totalBases, totals.atBats),
  };
}

type TeamTotalsAccumulator = Pick<
  TeamGameTotals,
  | "plateAppearances"
  | "atBats"
  | "hits"
  | "singles"
  | "doubles"
  | "triples"
  | "homeRuns"
  | "walks"
  | "reachedOnError"
  | "fieldersChoice"
  | "sacFlies"
  | "runs"
  | "rbis"
  | "outs"
  | "groundouts"
  | "flyouts"
  | "lineouts"
  | "strikeoutsLooking"
  | "strikeoutsSwinging"
  | "otherOuts"
  | "doublePlays"
  | "productiveOuts"
  | "totalBases"
>;

function createZeroTeamTotals(): TeamTotalsAccumulator {
  return {
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
    runs: 0,
    rbis: 0,
    outs: 0,
    groundouts: 0,
    flyouts: 0,
    lineouts: 0,
    strikeoutsLooking: 0,
    strikeoutsSwinging: 0,
    otherOuts: 0,
    doublePlays: 0,
    productiveOuts: 0,
    totalBases: 0,
  };
}

function addPlayerStatsToTeamTotals(
  current: TeamTotalsAccumulator,
  stats: PlayerStats,
): TeamTotalsAccumulator {
  const playerStats = { ...createZeroStats(), ...stats };

  return {
    plateAppearances: current.plateAppearances + playerStats.plateAppearances,
    atBats: current.atBats + playerStats.atBats,
    hits: current.hits + playerStats.hits,
    singles: current.singles + playerStats.singles,
    doubles: current.doubles + playerStats.doubles,
    triples: current.triples + playerStats.triples,
    homeRuns: current.homeRuns + playerStats.homeRuns,
    walks: current.walks + playerStats.walks,
    reachedOnError: current.reachedOnError + playerStats.reachedOnError,
    fieldersChoice: current.fieldersChoice + playerStats.fieldersChoice,
    sacFlies: current.sacFlies + playerStats.sacFlies,
    runs: current.runs + playerStats.runs,
    rbis: current.rbis + playerStats.rbis,
    outs: current.outs + playerStats.outs,
    groundouts: current.groundouts + playerStats.groundouts,
    flyouts: current.flyouts + playerStats.flyouts,
    lineouts: current.lineouts + playerStats.lineouts,
    strikeoutsLooking: current.strikeoutsLooking + playerStats.strikeoutsLooking,
    strikeoutsSwinging: current.strikeoutsSwinging + playerStats.strikeoutsSwinging,
    otherOuts: current.otherOuts + playerStats.otherOuts,
    doublePlays: current.doublePlays + playerStats.doublePlays,
    productiveOuts: current.productiveOuts + playerStats.productiveOuts,
    totalBases: current.totalBases + getTotalBases(playerStats),
  };
}

function getTotalBases(stats: PlayerStats) {
  return stats.singles + stats.doubles * 2 + stats.triples * 3 + stats.homeRuns * 4;
}

export function runnerSlotFromPlayer(player: Player): RunnerSlot {
  return {
    playerId: player.id,
    name: player.name,
  };
}

function applyPlayStats(
  currentStats: Record<string, PlayerStats>,
  preview: PlayPreview,
  result: BatterResult,
  outType?: OutType,
): Record<string, PlayerStats> {
  const next = cloneStats(currentStats);
  const batterStats = next[preview.batter.id];
  next[preview.batter.id] = addBatterResult(batterStats, result, preview.rbis, outType, preview.productiveOut);

  for (const movement of preview.movements) {
    next[movement.playerId] = applyRunnerMovementStats(next[movement.playerId], movement);
  }

  return next;
}

function applyRunnerMovementStats(stats: PlayerStats, movement: RunnerMovement) {
  let nextStats = stats;

  if (movement.scored) {
    nextStats = addRun(nextStats);
  }

  if (isBaseRunnerOut(movement)) {
    nextStats = addRunnerOut(nextStats);
  }

  return nextStats;
}

function isBaseRunnerOut(movement: RunnerMovement) {
  return movement.out && movement.fromBase !== "BATTER";
}

function createGameStatsByPlayerId(lineup: Player[]) {
  return Object.fromEntries(lineup.map((player) => [player.id, createZeroStats()]));
}

function buildRunnerMovement({
  runner,
  fromBase,
  destination,
  result,
  rbiCredit,
}: {
  runner: RunnerSlot;
  fromBase: BaseLabel | "BATTER";
  destination: RunnerDestination;
  result: BatterResult;
  rbiCredit: boolean;
}): RunnerMovement {
  return {
    playerId: runner.playerId,
    playerName: runner.name,
    originalPlayerId: runner.originalPlayerId,
    originalPlayerName: runner.originalName,
    fromBase,
    toBase: destination,
    advancedBases: getAdvancedBases(fromBase, destination),
    scored: destination === "HOME",
    out: destination === "OUT",
    rbiCredited: destination === "HOME" && rbiCredit,
    reason: getAdvanceReason(result),
  };
}

function getBatterDestination(result: BatterResult): RunnerDestination {
  return batterDestinations[result];
}

const batterDestinations: Record<BatterResult, RunnerDestination> = {
  "1B": "1B",
  "2B": "2B",
  "3B": "3B",
  HR: "HOME",
  BB: "1B",
  ROE: "1B",
  FC: "1B",
  SF: "OUT",
  Out: "OUT",
  DP: "OUT",
};

function getBatterOuts(result: BatterResult) {
  if (result === "DP") return 1;
  if (result === "Out" || result === "SF") return 1;
  return 0;
}

function getAdvanceReason(result: BatterResult): RunnerMovement["reason"] {
  return advanceReasons[result];
}

const advanceReasons: Record<BatterResult, RunnerMovement["reason"]> = {
  "1B": "Hit",
  "2B": "Hit",
  "3B": "Hit",
  HR: "Hit",
  BB: "Walk",
  ROE: "Error",
  FC: "Fielder's Choice",
  SF: "Sac Fly",
  Out: "Out",
  DP: "Out",
};

function getAdvancedBases(fromBase: BaseLabel | "BATTER", destination: RunnerDestination) {
  if (destination === "OUT") return 0;

  const start = fromBase === "BATTER" ? 0 : baseNumber(fromBase);
  const end = destination === "HOME" ? 4 : baseNumber(destination);

  return Math.max(0, end - start);
}

function baseNumber(base: BaseLabel) {
  return Number(base[0]);
}

function toRunnerDestination(destination: UiRunnerDestination): RunnerDestination {
  if (destination === "Scores") return "HOME";
  if (destination === "Out") return "OUT";
  return destination;
}

function placeRunner(bases: BasesState, destination: RunnerDestination, runner: RunnerSlot) {
  if (destination === "1B") bases.first = runner;
  if (destination === "2B") bases.second = runner;
  if (destination === "3B") bases.third = runner;
}

function buildSummary(
  batterName: string,
  result: BatterResult,
  outType: OutType | undefined,
  movements: RunnerMovement[],
  runs: number,
  outsBefore: number,
  outsAfter: number,
  rbis: number,
) {
  const runnerLines = movements.map((movement) => {
    if (movement.toBase === "HOME") return `${movement.playerName} scored`;
    if (movement.toBase === "OUT") return `${movement.playerName} out from ${movement.fromBase}`;
    if (movement.fromBase === "BATTER") return `${movement.playerName} to ${movement.toBase}`;
    return `${movement.playerName}: ${movement.fromBase} to ${movement.toBase}`;
  });
  const resultLabel = result === "Out" && outType ? formatOutTypeLabel(outType) : result;

  return [
    `${batterName}: ${resultLabel}`,
    ...runnerLines,
    `Runs +${runs}`,
    `Outs ${outsBefore} to ${outsAfter}`,
    rbis > 0 ? `RBI +${rbis}` : "No RBI",
  ].join(". ");
}

function buildDefensiveSummary(event: DefensiveEvent, outsBefore: number, outsAfter: number) {
  const fielder = event.fielderName ? `${event.fielderName}: ` : "";
  const runsLine = event.runsAllowed > 0 ? `Runs allowed +${event.runsAllowed}` : "No runs allowed";
  const basesLine = event.basesAllowed > 0 ? `Extra bases +${event.basesAllowed}` : "No extra bases";

  return [
    `${fielder}${event.type.replaceAll("_", " ")}`,
    `Outs ${outsBefore} to ${outsAfter}`,
    runsLine,
    basesLine,
  ].join(". ");
}

function assertValidOutType(result: BatterResult, outType: OutType | undefined) {
  if (result === "Out" && !outType) {
    throw new Error("Out type is required for normal outs.");
  }
}

function assertValidPlay(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  outType: OutType | undefined,
) {
  const validationError = getPlayValidationError(state, result, selections, pinchRunners, outType);

  if (validationError) {
    throw new InvalidPlayError(validationError);
  }
}

export function getPlayValidationError(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  outType?: OutType,
) {
  return firstValidationError([
    getResultLockReason(result, state.bases, state.outs),
    getOutTypeValidationError(result, outType),
    getPinchRunnerValidationError(state, pinchRunners),
    getRunnerDestinationValidationError(state, result, selections),
    getOutCountValidationError(state, result, selections),
  ]);
}

function firstValidationError(errors: Array<string | null | undefined>) {
  return errors.find(Boolean) ?? null;
}

function getOutTypeValidationError(result: BatterResult, outType: OutType | undefined) {
  return result === "Out" && !outType ? "Out type is required for normal outs." : null;
}

function getRunnerDestinationValidationError(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
) {
  const occupiedDestinations = new Map<BaseLabel, string>();

  for (const [base, runner] of occupiedBaseEntries(state.bases)) {
    const destination = toRunnerDestination(selections[base] ?? base);
    const destinationError = addOccupiedDestination(occupiedDestinations, runner.name, destination);

    if (destinationError) {
      return destinationError;
    }
  }

  return getBatterDestinationValidationError(state, result, occupiedDestinations);
}

function addOccupiedDestination(
  occupiedDestinations: Map<BaseLabel, string>,
  runnerName: string,
  destination: RunnerDestination,
) {
  if (!isBaseDestination(destination)) {
    return null;
  }

  const occupyingRunner = occupiedDestinations.get(destination);

  if (occupyingRunner) {
    return `${runnerName} and ${occupyingRunner} cannot both end at ${destination}.`;
  }

  occupiedDestinations.set(destination, runnerName);
  return null;
}

function isBaseDestination(destination: RunnerDestination): destination is BaseLabel {
  return baseDestinationValues.has(destination);
}

const baseDestinationValues = new Set<RunnerDestination>(["1B", "2B", "3B"]);

function getBatterDestinationValidationError(
  state: GameState,
  result: BatterResult,
  occupiedDestinations: Map<BaseLabel, string>,
) {
  const batterDestination = getBatterDestination(result);

  if (!isBaseDestination(batterDestination)) {
    return null;
  }

  return getBatterBaseCollisionError(state, occupiedDestinations, batterDestination);
}

function getBatterBaseCollisionError(
  state: GameState,
  occupiedDestinations: Map<BaseLabel, string>,
  batterDestination: BaseLabel,
) {
  const occupyingRunner = occupiedDestinations.get(batterDestination);

  if (!occupyingRunner) {
    return null;
  }

  return `${getCurrentBatter(state).name} and ${occupyingRunner} cannot both end at ${batterDestination}.`;
}

function getOutCountValidationError(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
) {
  const outsOnPlay = getRunnerOutCount(state, selections) + getBatterOuts(result);

  if (state.outs + outsOnPlay > 3) {
    return "Play cannot record more than three outs in the inning.";
  }

  return null;
}

function getRunnerOutCount(state: GameState, selections: MovementSelections) {
  return occupiedBaseEntries(state.bases).filter(([base]) => (
    toRunnerDestination(selections[base] ?? base) === "OUT"
  )).length;
}

function getPinchRunnerValidationError(state: GameState, pinchRunners: PinchRunnerSelections) {
  const occupiedPlayerIds = new Set(occupiedBaseEntries(state.bases).map(([, runner]) => runner.playerId));
  const selectedPinchRunnerIds = new Set<string>();
  const batter = getCurrentBatter(state);

  for (const pinchRunner of getSelectedPinchRunners(pinchRunners)) {
    const validationError = validatePinchRunner(
      pinchRunner,
      batter,
      occupiedPlayerIds,
      selectedPinchRunnerIds,
    );

    if (validationError) {
      return validationError;
    }

    selectedPinchRunnerIds.add(pinchRunner.playerId);
  }

  return null;
}

function getSelectedPinchRunners(pinchRunners: PinchRunnerSelections) {
  return Object.values(pinchRunners).filter(isRunnerSlot);
}

function isRunnerSlot(runner: RunnerSlot | undefined): runner is RunnerSlot {
  return Boolean(runner);
}

function validatePinchRunner(
  pinchRunner: RunnerSlot,
  batter: Player,
  occupiedPlayerIds: Set<string>,
  selectedPinchRunnerIds: Set<string>,
) {
  return firstValidationError([
    getBatterPinchRunnerError(pinchRunner, batter),
    getOccupiedPinchRunnerError(pinchRunner, occupiedPlayerIds),
    getDuplicatePinchRunnerError(pinchRunner, selectedPinchRunnerIds),
  ]);
}

function getBatterPinchRunnerError(pinchRunner: RunnerSlot, batter: Player) {
  return pinchRunner.playerId === batter.id ? "The current batter cannot also be a pinch runner." : null;
}

function getOccupiedPinchRunnerError(pinchRunner: RunnerSlot, occupiedPlayerIds: Set<string>) {
  return occupiedPlayerIds.has(pinchRunner.playerId) ? `${pinchRunner.name} is already on base.` : null;
}

function getDuplicatePinchRunnerError(pinchRunner: RunnerSlot, selectedPinchRunnerIds: Set<string>) {
  return selectedPinchRunnerIds.has(pinchRunner.playerId)
    ? `${pinchRunner.name} cannot pinch run for multiple runners on the same play.`
    : null;
}

function isProductiveOut(result: BatterResult, movements: RunnerMovement[], rbis: number) {
  if (result !== "Out" && result !== "SF") {
    return false;
  }

  return movements.some((movement) => (
    movement.fromBase !== "BATTER" &&
    (movement.scored || (!movement.out && movement.advancedBases > 0))
  )) || rbis > 0;
}

function formatOutTypeLabel(outType: OutType) {
  const labels: Record<OutType, string> = {
    GROUNDOUT: "Groundout",
    FLYOUT: "Flyout",
    LINEOUT: "Lineout",
    STRIKEOUT_LOOKING: "Strikeout Looking",
    STRIKEOUT_SWINGING: "Strikeout Swinging",
    OTHER_OUT: "Other Out",
  };

  return labels[outType];
}

function cloneBases(bases: BasesState): BasesState {
  return {
    first: bases.first ? { ...bases.first } : null,
    second: bases.second ? { ...bases.second } : null,
    third: bases.third ? { ...bases.third } : null,
  };
}

function cloneStats(stats: Record<string, PlayerStats>) {
  return Object.fromEntries(Object.entries(stats).map(([playerId, playerStats]) => [playerId, { ...playerStats }]));
}

function updateLineupPlayerSeasonStats(
  lineup: Player[],
  playerId: string,
  seasonStats: PlayerStats,
) {
  return lineup.map((player) => (
    player.id === playerId ? { ...player, seasonStats } : player
  ));
}

function findPrePlaySnapshotIndex(state: GameState, play: ScoredPlay) {
  return state.history.findLastIndex((snapshot) => (
    isPrePlaySnapshot(snapshot, state, play)
  ));
}

function isPrePlaySnapshot(
  snapshot: GameStateSnapshot,
  state: GameState,
  play: ScoredPlay,
) {
  return [
    snapshot.plays.length === state.plays.length - 1,
    snapshot.inning === play.inning,
    snapshot.half === getPlayHalf(play, state),
    getSnapshotBatterId(snapshot) === play.batterId,
  ].every(Boolean);
}

function getPlayHalf(play: ScoredPlay, state: GameState) {
  return play.half ?? state.half;
}

function getSnapshotBatterId(snapshot: GameStateSnapshot) {
  return snapshot.lineup[snapshot.currentBatterIndex]?.id;
}

function snapshotState(state: GameState): GameStateSnapshot {
  return {
    gameId: state.gameId,
    status: state.status,
    endedAt: state.endedAt,
    opponent: state.opponent,
    isHome: state.isHome,
    gameRules: state.gameRules,
    lineup: state.lineup,
    currentBatterIndex: state.currentBatterIndex,
    inning: state.inning,
    half: state.half,
    outs: state.outs,
    teamScore: state.teamScore,
    opponentScore: state.opponentScore,
    bases: cloneBases(state.bases),
    defensiveAlignments: state.defensiveAlignments,
    defensiveEvents: state.defensiveEvents,
    lockedPitcherPlayerId: state.lockedPitcherPlayerId,
    statsByPlayerId: cloneStats(state.statsByPlayerId),
    plays: state.plays,
    lastSummary: state.lastSummary,
  };
}

function getGameOutcomeLabel(teamScore: number, opponentScore: number): CompletedGameSummary["result"] {
  if (teamScore > opponentScore) return "Win";
  if (teamScore < opponentScore) return "Loss";
  return "Tie";
}

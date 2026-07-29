import type { BatterResult, GameRules, LocalGameStatus, OutType, ScoredPlay } from "@/types/game";
import type { Player } from "@/types/player";
import type {
  BaseLabel,
  BasesState,
  RunnerDestination,
  RunnerMovement,
  RunnerSlot,
} from "@/types/runner";
import type { PlayerStats } from "@/types/stats";
import type { DefensiveAlignment, DefensiveEvent } from "@/types/defense";
import {
  generateDefensiveAlignment,
  getAlignmentForCurrentHalf,
  getDefensiveAlignmentIssues,
  getNextHalfInning,
  getTeamPhase,
  upsertDefensiveAlignment,
  type TeamPhase,
} from "./defenseEngine.ts";
import {
  occupiedBaseEntries,
  type MovementSelections,
  type PinchRunnerSelections,
} from "./gamePlayRules.ts";
import {
  getAdvanceReason,
  getAdvancedBases,
  getBatterDestination,
  getBatterOuts,
  toRunnerDestination,
} from "./gameMovementRules.ts";
import {
  assertValidOutType,
  assertValidPlay,
  InvalidPlayError,
} from "./gamePlayValidation.ts";
import {
  cloneBases,
  cloneStats,
  findPrePlaySnapshotIndex,
  snapshotState,
} from "./gameStateSnapshots.ts";
import { defaultGameRules } from "./seedTeam.ts";
import { addBatterResult, addRun, addRunnerOut, createZeroStats } from "./statCalculations.ts";

export {
  batterResults,
  createDefaultMovements,
  defaultRbiCredit,
  destinationLabel,
  destinationOptions,
  getResultLockReason,
  occupiedBaseEntries,
} from "./gamePlayRules.ts";
export type {
  MovementSelections,
  PinchRunnerSelections,
} from "./gamePlayRules.ts";
export { getPlayValidationError } from "./gamePlayValidation.ts";
export {
  getDefensiveAlignmentForHalf,
  getOrCreateDefensiveAlignmentForHalf,
  initializeStartingDefense,
  previewDefensiveEvent,
  saveDefensiveAlignment,
  saveDefensiveEvent,
} from "./gameDefenseState.ts";
export {
  getGameStats,
  getPlayerGameStats,
  getPlayerSeasonStats,
  getSeasonStats,
  getSeasonStatsByPlayerId,
  updatePlayerSeasonStatsBaseline,
} from "./gameStats.ts";
export {
  firstGameHistoryId,
  getCompletedGameById,
  getCompletedGameHistory,
  upsertCompletedGame,
} from "./completedGames.ts";
export type { CompletedGameSummary } from "./completedGames.ts";
export {
  getTeamGameTotals,
  getTeamSeasonTotals,
} from "./teamGameTotals.ts";
export type { TeamGameTotals } from "./teamGameTotals.ts";

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

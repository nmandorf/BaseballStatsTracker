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
  copyAlignmentForHalf,
  createDefensiveEvent,
  createDefaultDefensiveAlignment,
  getAlignmentForCurrentHalf,
  getLatestDefensiveAlignment,
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

export type GameState = {
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

export class InvalidPlayError extends Error {
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
  href: string;
};

export const firstGameHistoryId = "first-game";

type CreateInitialGameStateOptions = {
  opponent?: string;
  isHome?: boolean;
  status?: LocalGameStatus;
  gameRules?: GameRules;
};

export function createInitialGameState(lineup: Player[], options: CreateInitialGameStateOptions = {}): GameState {
  return {
    status: options.status ?? "PREGAME",
    endedAt: null,
    opponent: options.opponent ?? "Opponent",
    isHome: options.isHome ?? false,
    gameRules: options.gameRules ?? defaultGameRules,
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
    statsByPlayerId: createGameStatsByPlayerId(lineup),
    plays: [],
    history: [],
    lastSummary: "First game of the season. All player stats start at zero.",
  };
}

export function createEmptyBases(): BasesState {
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

export function isTeamBatting(state: GameState) {
  return getCurrentTeamPhase(state) === "BATTING";
}

export function getCurrentDefensiveAlignment(state: GameState) {
  return getDefensiveAlignmentForHalf(state, state.inning, state.half);
}

export function getOrCreateCurrentDefensiveAlignment(state: GameState): DefensiveAlignment {
  return getOrCreateDefensiveAlignmentForHalf(state, state.inning, state.half);
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

  return copyAlignmentForHalf(
    getLatestDefensiveAlignment(state.defensiveAlignments),
    state.lineup,
    inning,
    half,
  );
}

export function initializeStartingDefense(state: GameState, alignment?: DefensiveAlignment): GameState {
  const startingAlignment = alignment ?? createDefaultDefensiveAlignment(state.lineup, state.inning, state.half);

  return {
    ...state,
    defensiveAlignments: upsertDefensiveAlignment(state.defensiveAlignments, startingAlignment),
  };
}

export function saveDefensiveAlignment(state: GameState, alignment: DefensiveAlignment): GameState {
  if (state.status === "FINAL") {
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

export function getPlayerStats(state: GameState, playerId: string) {
  return getPlayerGameStats(state, playerId);
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
  const completedGames = Array.isArray(source)
    ? source.filter((game) => game.status === "FINAL")
    : source.status === "FINAL"
      ? [source]
      : [];

  return completedGames.map((game) => getCompletedGameSummary(game));
}

export function getCompletedGameById(source: GameState | GameState[], gameId: string) {
  if (gameId !== firstGameHistoryId) {
    return null;
  }

  if (Array.isArray(source)) {
    return source.find((game) => game.status === "FINAL") ?? null;
  }

  return source.status === "FINAL" ? source : null;
}

export function upsertCompletedGame(games: GameState[], game: GameState): GameState[] {
  if (game.status !== "FINAL") {
    return games;
  }

  return [game, ...games.filter((item) => getCompletedGameId(item) !== getCompletedGameId(game))];
}

export function getCompletedGameSummary(state: GameState): CompletedGameSummary {
  return {
    id: getCompletedGameId(state),
    opponent: state.opponent,
    endedAt: state.endedAt,
    teamScore: state.teamScore,
    opponentScore: state.opponentScore,
    result: getGameOutcomeLabel(state.teamScore, state.opponentScore),
    playCount: state.plays.length,
    href: `/stats/games/${firstGameHistoryId}`,
  };
}

function getCompletedGameId(state: GameState) {
  void state;

  return firstGameHistoryId;
}


export function occupiedBaseEntries(bases: BasesState): Array<readonly [BaseLabel, RunnerSlot]> {
  return [
    ["1B", bases.first] as const,
    ["2B", bases.second] as const,
    ["3B", bases.third] as const,
  ].filter((entry): entry is readonly [BaseLabel, RunnerSlot] => Boolean(entry[1]));
}

export function getResultLockReason(result: BatterResult, bases: BasesState, outs: number): string | null {
  const hasRunner = Boolean(bases.first || bases.second || bases.third);

  if (result === "SF") {
    if (!bases.third) return "Sac fly needs a runner on 3B";
    if (outs >= 2) return "Sac fly needs fewer than 2 outs";
  }

  if (result === "DP") {
    if (!hasRunner) return "Double play needs a runner on base";
    if (outs >= 2) return "Double play needs fewer than 2 outs";
  }

  if (result === "FC" && !hasRunner) {
    return "Fielder's choice needs a runner on base";
  }

  return null;
}

export function createDefaultMovements(result: BatterResult, bases: BasesState): MovementSelections {
  const hasFirst = Boolean(bases.first);
  const hasSecond = Boolean(bases.second);
  const hasThird = Boolean(bases.third);
  const next: MovementSelections = {};

  if (hasFirst) next["1B"] = "1B";
  if (hasSecond) next["2B"] = "2B";
  if (hasThird) next["3B"] = "3B";

  if (result === "1B") {
    if (hasFirst) next["1B"] = "2B";
    if (hasSecond) next["2B"] = "Scores";
    if (hasThird) next["3B"] = "Scores";
  } else if (result === "2B") {
    if (hasFirst) next["1B"] = "3B";
    if (hasSecond) next["2B"] = "Scores";
    if (hasThird) next["3B"] = "Scores";
  } else if (result === "3B" || result === "HR") {
    if (hasFirst) next["1B"] = "Scores";
    if (hasSecond) next["2B"] = "Scores";
    if (hasThird) next["3B"] = "Scores";
  } else if (result === "BB") {
    if (hasFirst) next["1B"] = "2B";
    if (hasFirst && hasSecond) next["2B"] = "3B";
    if (hasFirst && hasSecond && hasThird) next["3B"] = "Scores";
  } else if (result === "ROE") {
    if (hasFirst) next["1B"] = "2B";
    if (hasSecond) next["2B"] = "3B";
    if (hasThird) next["3B"] = "Scores";
  } else if (result === "FC") {
    if (hasThird && hasSecond && hasFirst) {
      next["3B"] = "Out";
      next["2B"] = "3B";
      next["1B"] = "2B";
    } else if (hasFirst) {
      next["1B"] = "Out";
      if (hasSecond) next["2B"] = "3B";
      if (hasThird) next["3B"] = "3B";
    }
  } else if (result === "SF" && hasThird) {
    next["3B"] = "Scores";
  } else if (result === "DP") {
    if (hasFirst) next["1B"] = "Out";
    else if (hasSecond) next["2B"] = "Out";
    else if (hasThird) next["3B"] = "Out";
  }

  return next;
}

export function defaultRbiCredit(result: BatterResult, bases: BasesState, runsScored: number) {
  if (runsScored <= 0) {
    return false;
  }

  if (result === "BB") {
    return Boolean(bases.first && bases.second && bases.third);
  }

  return ["1B", "2B", "3B", "HR", "SF"].includes(result);
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
  const movements: RunnerMovement[] = [];
  const nextBases = createEmptyBases();
  let runs = 0;
  let runnerOuts = 0;

  for (const [base, runner] of occupiedBaseEntries(state.bases)) {
    const selectedRunner = pinchRunners[base] ?? runner;
    const destination = toRunnerDestination(selections[base] ?? base);
    const movement = buildRunnerMovement({
      runner: selectedRunner,
      fromBase: base,
      destination,
      result,
      rbiCredit,
    });

    if (runner.originalPlayerId || selectedRunner.originalPlayerId) {
      movement.originalPlayerId = selectedRunner.originalPlayerId ?? runner.originalPlayerId;
      movement.originalPlayerName = selectedRunner.originalName ?? runner.originalName;
    }

    if (movement.scored) runs += 1;
    if (movement.out) runnerOuts += 1;
    placeRunner(nextBases, destination, selectedRunner);
    movements.push(movement);
  }

  const batterDestination = getBatterDestination(result);
  const batterMovement = buildRunnerMovement({
    runner: { playerId: batter.id, name: batter.name },
    fromBase: "BATTER",
    destination: batterDestination,
    result,
    rbiCredit: false,
  });

  if (batterMovement.scored) runs += 1;
  placeRunner(nextBases, batterDestination, { playerId: batter.id, name: batter.name });
  movements.push(batterMovement);

  const batterOuts = getBatterOuts(result);
  const outsOnPlay = batterOuts + runnerOuts;
  const projectedOuts = Math.min(3, state.outs + outsOnPlay);
  const inningEnded = state.outs + outsOnPlay >= 3;
  const creditedRbis = rbiCredit ? runs : 0;
  const productiveOut = isProductiveOut(result, movements, creditedRbis);
  const finalBases = inningEnded ? createEmptyBases() : nextBases;

  return {
    batter,
    result,
    outType: result === "Out" ? outType : undefined,
    movements,
    nextBases: finalBases,
    runs,
    runnerOuts,
    batterOuts,
    outsOnPlay,
    projectedOuts,
    inningEnded,
    productiveOut,
    rbis: creditedRbis,
    summary: buildSummary(batter.name, result, outType, movements, runs, state.outs, projectedOuts, creditedRbis),
  };
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
  const nextStats = applyPlayStats(state.statsByPlayerId, preview, result, outType);
  const nextBatterIndex = (state.currentBatterIndex + 1) % state.lineup.length;
  const nextHalfInning = preview.inningEnded ? getNextHalfInning(state.inning, state.half) : state;
  const nextDefenseAlignment =
    preview.inningEnded && getTeamPhase(state.isHome, nextHalfInning.half) === "FIELDING"
      ? copyAlignmentForHalf(getLatestDefensiveAlignment(state.defensiveAlignments), state.lineup, nextHalfInning.inning, nextHalfInning.half)
      : null;

  return {
    ...state,
    inning: nextHalfInning.inning,
    half: nextHalfInning.half,
    outs: preview.inningEnded ? 0 : preview.projectedOuts,
    teamScore: state.teamScore + preview.runs,
    bases: cloneBases(preview.nextBases),
    defensiveAlignments: nextDefenseAlignment
      ? upsertDefensiveAlignment(state.defensiveAlignments, nextDefenseAlignment)
      : state.defensiveAlignments,
    statsByPlayerId: nextStats,
    plays: [...state.plays, play],
    currentBatterIndex: nextBatterIndex,
    history: [...state.history, snapshotState(state)],
    lastSummary: preview.summary,
  };
}

export function getLatestCorrectablePlay(state: GameState): ScoredPlay | null {
  if (state.status !== "IN_PROGRESS" || getCurrentTeamPhase(state) !== "BATTING") {
    return null;
  }

  const latestPlay = state.plays.at(-1);

  if (!latestPlay || latestPlay.inning !== state.inning) {
    return null;
  }

  if (latestPlay.half && latestPlay.half !== state.half) {
    return null;
  }

  return findPrePlaySnapshotIndex(state, latestPlay) >= 0 ? latestPlay : null;
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
  const totals = statsList.reduce(
    (current, stats) => ({
      plateAppearances: current.plateAppearances + stats.plateAppearances,
      atBats: current.atBats + stats.atBats,
      hits: current.hits + stats.hits,
      singles: current.singles + stats.singles,
      doubles: current.doubles + stats.doubles,
      triples: current.triples + stats.triples,
      homeRuns: current.homeRuns + stats.homeRuns,
      walks: current.walks + stats.walks,
      reachedOnError: current.reachedOnError + stats.reachedOnError,
      fieldersChoice: current.fieldersChoice + stats.fieldersChoice,
      sacFlies: current.sacFlies + stats.sacFlies,
      runs: current.runs + stats.runs,
      rbis: current.rbis + stats.rbis,
      outs: current.outs + stats.outs,
      groundouts: current.groundouts + (stats.groundouts ?? 0),
      flyouts: current.flyouts + (stats.flyouts ?? 0),
      lineouts: current.lineouts + (stats.lineouts ?? 0),
      strikeoutsLooking: current.strikeoutsLooking + (stats.strikeoutsLooking ?? 0),
      strikeoutsSwinging: current.strikeoutsSwinging + (stats.strikeoutsSwinging ?? 0),
      otherOuts: current.otherOuts + (stats.otherOuts ?? 0),
      doublePlays: current.doublePlays + (stats.doublePlays ?? 0),
      productiveOuts: current.productiveOuts + (stats.productiveOuts ?? 0),
      totalBases: current.totalBases + stats.singles + stats.doubles * 2 + stats.triples * 3 + stats.homeRuns * 4,
    }),
    {
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
    },
  );

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

export function syncLineupStats(state: GameState): Player[] {
  return state.lineup.map((player) => ({
    ...player,
    seasonStats: getPlayerSeasonStats(player, state),
  }));
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
    if (movement.scored) {
      next[movement.playerId] = addRun(next[movement.playerId]);
    }

    if (movement.out && movement.fromBase !== "BATTER") {
      next[movement.playerId] = addRunnerOut(next[movement.playerId]);
    }
  }

  return next;
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
  if (result === "HR") return "HOME";
  if (result === "3B") return "3B";
  if (result === "2B") return "2B";
  if (["1B", "BB", "ROE", "FC"].includes(result)) return "1B";
  return "OUT";
}

function getBatterOuts(result: BatterResult) {
  if (result === "DP") return 1;
  if (result === "Out" || result === "SF") return 1;
  return 0;
}

function getAdvanceReason(result: BatterResult): RunnerMovement["reason"] {
  if (["1B", "2B", "3B", "HR"].includes(result)) return "Hit";
  if (result === "BB") return "Walk";
  if (result === "ROE") return "Error";
  if (result === "FC") return "Fielder's Choice";
  if (result === "SF") return "Sac Fly";
  if (result === "Out" || result === "DP") return "Out";
  return "Runner Decision";
}

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
  const lockReason = getResultLockReason(result, state.bases, state.outs);

  if (lockReason) {
    return lockReason;
  }

  if (result === "Out" && !outType) {
    return "Out type is required for normal outs.";
  }

  const pinchRunnerError = getPinchRunnerValidationError(state, pinchRunners);

  if (pinchRunnerError) {
    return pinchRunnerError;
  }

  const occupiedDestinations = new Map<BaseLabel, string>();
  let runnerOuts = 0;

  for (const [base, runner] of occupiedBaseEntries(state.bases)) {
    const destination = toRunnerDestination(selections[base] ?? base);

    if (destination === "OUT") {
      runnerOuts += 1;
      continue;
    }

    if (destination === "HOME") {
      continue;
    }

    const occupyingRunner = occupiedDestinations.get(destination);

    if (occupyingRunner) {
      return `${runner.name} and ${occupyingRunner} cannot both end at ${destination}.`;
    }

    occupiedDestinations.set(destination, runner.name);
  }

  const batterDestination = getBatterDestination(result);

  if (batterDestination !== "OUT" && batterDestination !== "HOME") {
    const occupyingRunner = occupiedDestinations.get(batterDestination);

    if (occupyingRunner) {
      return `${getCurrentBatter(state).name} and ${occupyingRunner} cannot both end at ${batterDestination}.`;
    }
  }

  const outsOnPlay = runnerOuts + getBatterOuts(result);

  if (state.outs + outsOnPlay > 3) {
    return "Play cannot record more than three outs in the inning.";
  }

  return null;
}

function getPinchRunnerValidationError(state: GameState, pinchRunners: PinchRunnerSelections) {
  const occupiedPlayerIds = new Set(occupiedBaseEntries(state.bases).map(([, runner]) => runner.playerId));
  const selectedPinchRunnerIds = new Set<string>();
  const batter = getCurrentBatter(state);

  for (const pinchRunner of Object.values(pinchRunners)) {
    if (!pinchRunner) {
      continue;
    }

    if (pinchRunner.playerId === batter.id) {
      return "The current batter cannot also be a pinch runner.";
    }

    if (occupiedPlayerIds.has(pinchRunner.playerId)) {
      return `${pinchRunner.name} is already on base.`;
    }

    if (selectedPinchRunnerIds.has(pinchRunner.playerId)) {
      return `${pinchRunner.name} cannot pinch run for multiple runners on the same play.`;
    }

    selectedPinchRunnerIds.add(pinchRunner.playerId);
  }

  return null;
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
    snapshot.plays.length === state.plays.length - 1 &&
    snapshot.inning === play.inning &&
    snapshot.half === (play.half ?? state.half) &&
    snapshot.lineup[snapshot.currentBatterIndex]?.id === play.batterId
  ));
}

function snapshotState(state: GameState): GameStateSnapshot {
  return {
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

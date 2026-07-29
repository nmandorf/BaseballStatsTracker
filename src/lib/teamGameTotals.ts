import type { Player } from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import type { GameState } from "./gameEngine.ts";
import { getSeasonStatsByPlayerId } from "./gameStats.ts";
import { createZeroStats, divide } from "./statCalculations.ts";

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

export function getTeamGameTotals(state: GameState): TeamGameTotals {
  return getTeamTotalsFromStats(Object.values(state.statsByPlayerId));
}

export function getTeamSeasonTotals(
  players: Player[],
  state?: GameState,
): TeamGameTotals {
  return getTeamTotalsFromStats(
    Object.values(getSeasonStatsByPlayerId(players, state)),
  );
}

function getTeamTotalsFromStats(statsList: PlayerStats[]): TeamGameTotals {
  const totals = statsList.reduce(
    addPlayerStatsToTeamTotals,
    createZeroTeamTotals(),
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
    ops:
      divide(onBaseTimes, totals.plateAppearances) +
      divide(totals.totalBases, totals.atBats),
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
    plateAppearances:
      current.plateAppearances + playerStats.plateAppearances,
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
    strikeoutsLooking:
      current.strikeoutsLooking + playerStats.strikeoutsLooking,
    strikeoutsSwinging:
      current.strikeoutsSwinging + playerStats.strikeoutsSwinging,
    otherOuts: current.otherOuts + playerStats.otherOuts,
    doublePlays: current.doublePlays + playerStats.doublePlays,
    productiveOuts: current.productiveOuts + playerStats.productiveOuts,
    totalBases:
      current.totalBases +
      playerStats.singles +
      playerStats.doubles * 2 +
      playerStats.triples * 3 +
      playerStats.homeRuns * 4,
  };
}

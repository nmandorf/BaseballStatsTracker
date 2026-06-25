import type { PlayerStats } from "@/types/stats";
import { addStats } from "./statCalculations.ts";

export function replaceGameStatsInSeason(
  seasonStats: PlayerStats,
  previousGameStats: PlayerStats,
  nextGameStats: PlayerStats,
) {
  return addStats(subtractStats(seasonStats, previousGameStats), nextGameStats);
}

export function subtractStats(seasonStats: PlayerStats, gameStats: PlayerStats): PlayerStats {
  return {
    gamesPlayed: subtractStat(seasonStats.gamesPlayed, gameStats.gamesPlayed),
    plateAppearances: subtractStat(seasonStats.plateAppearances, gameStats.plateAppearances),
    atBats: subtractStat(seasonStats.atBats, gameStats.atBats),
    hits: subtractStat(seasonStats.hits, gameStats.hits),
    singles: subtractStat(seasonStats.singles, gameStats.singles),
    doubles: subtractStat(seasonStats.doubles, gameStats.doubles),
    triples: subtractStat(seasonStats.triples, gameStats.triples),
    homeRuns: subtractStat(seasonStats.homeRuns, gameStats.homeRuns),
    walks: subtractStat(seasonStats.walks, gameStats.walks),
    reachedOnError: subtractStat(seasonStats.reachedOnError, gameStats.reachedOnError),
    fieldersChoice: subtractStat(seasonStats.fieldersChoice, gameStats.fieldersChoice),
    sacFlies: subtractStat(seasonStats.sacFlies, gameStats.sacFlies),
    outs: subtractStat(seasonStats.outs, gameStats.outs),
    groundouts: subtractStat(seasonStats.groundouts, gameStats.groundouts),
    flyouts: subtractStat(seasonStats.flyouts, gameStats.flyouts),
    lineouts: subtractStat(seasonStats.lineouts, gameStats.lineouts),
    strikeoutsLooking: subtractStat(seasonStats.strikeoutsLooking, gameStats.strikeoutsLooking),
    strikeoutsSwinging: subtractStat(seasonStats.strikeoutsSwinging, gameStats.strikeoutsSwinging),
    otherOuts: subtractStat(seasonStats.otherOuts, gameStats.otherOuts),
    doublePlays: subtractStat(seasonStats.doublePlays, gameStats.doublePlays),
    productiveOuts: subtractStat(seasonStats.productiveOuts, gameStats.productiveOuts),
    runs: subtractStat(seasonStats.runs, gameStats.runs),
    rbis: subtractStat(seasonStats.rbis, gameStats.rbis),
  };
}

export function subtractStat(left: number, right: number) {
  return Math.max(0, left - right);
}

export function getSeasonStatsProgress(stats: PlayerStats) {
  return (
    stats.plateAppearances * 1_000_000 +
    stats.atBats * 100_000 +
    stats.hits * 10_000 +
    stats.runs * 1_000 +
    stats.rbis * 100 +
    stats.gamesPlayed
  );
}

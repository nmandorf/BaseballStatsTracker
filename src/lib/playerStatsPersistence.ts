import { createZeroStats } from "./statCalculations.ts";
import type { PlayerStats } from "@/types/stats";

export function toPersistedStatsData(stats: Partial<PlayerStats> | undefined) {
  return {
    plateAppearances: stats?.plateAppearances ?? 0,
    atBats: stats?.atBats ?? 0,
    hits: stats?.hits ?? 0,
    singles: stats?.singles ?? 0,
    doubles: stats?.doubles ?? 0,
    triples: stats?.triples ?? 0,
    homeRuns: stats?.homeRuns ?? 0,
    walks: stats?.walks ?? 0,
    reachedOnError: stats?.reachedOnError ?? 0,
    fieldersChoice: stats?.fieldersChoice ?? 0,
    sacFlies: stats?.sacFlies ?? 0,
    outs: stats?.outs ?? 0,
    groundouts: stats?.groundouts ?? 0,
    flyouts: stats?.flyouts ?? 0,
    lineouts: stats?.lineouts ?? 0,
    strikeoutsLooking: stats?.strikeoutsLooking ?? 0,
    strikeoutsSwinging: stats?.strikeoutsSwinging ?? 0,
    otherOuts: stats?.otherOuts ?? 0,
    doublePlays: stats?.doublePlays ?? 0,
    productiveOuts: stats?.productiveOuts ?? 0,
    runs: stats?.runs ?? 0,
    rbis: stats?.rbis ?? 0,
  };
}

export function toPersistedTeamStatsData(stats: Omit<PlayerStats, "gamesPlayed">) {
  return toPersistedStatsData(stats);
}

export function fromPersistedStatsData(stats: Partial<PlayerStats> | null | undefined): PlayerStats {
  const fallback = createZeroStats();

  if (!stats) {
    return fallback;
  }

  return {
    gamesPlayed: normalizeStatNumber(stats.gamesPlayed, fallback.gamesPlayed),
    plateAppearances: normalizeStatNumber(stats.plateAppearances, fallback.plateAppearances),
    atBats: normalizeStatNumber(stats.atBats, fallback.atBats),
    hits: normalizeStatNumber(stats.hits, fallback.hits),
    singles: normalizeStatNumber(stats.singles, fallback.singles),
    doubles: normalizeStatNumber(stats.doubles, fallback.doubles),
    triples: normalizeStatNumber(stats.triples, fallback.triples),
    homeRuns: normalizeStatNumber(stats.homeRuns, fallback.homeRuns),
    walks: normalizeStatNumber(stats.walks, fallback.walks),
    reachedOnError: normalizeStatNumber(stats.reachedOnError, fallback.reachedOnError),
    fieldersChoice: normalizeStatNumber(stats.fieldersChoice, fallback.fieldersChoice),
    sacFlies: normalizeStatNumber(stats.sacFlies, fallback.sacFlies),
    outs: normalizeStatNumber(stats.outs, fallback.outs),
    groundouts: normalizeStatNumber(stats.groundouts, fallback.groundouts),
    flyouts: normalizeStatNumber(stats.flyouts, fallback.flyouts),
    lineouts: normalizeStatNumber(stats.lineouts, fallback.lineouts),
    strikeoutsLooking: normalizeStatNumber(stats.strikeoutsLooking, fallback.strikeoutsLooking),
    strikeoutsSwinging: normalizeStatNumber(stats.strikeoutsSwinging, fallback.strikeoutsSwinging),
    otherOuts: normalizeStatNumber(stats.otherOuts, fallback.otherOuts),
    doublePlays: normalizeStatNumber(stats.doublePlays, fallback.doublePlays),
    productiveOuts: normalizeStatNumber(stats.productiveOuts, fallback.productiveOuts),
    runs: normalizeStatNumber(stats.runs, fallback.runs),
    rbis: normalizeStatNumber(stats.rbis, fallback.rbis),
  };
}

function normalizeStatNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

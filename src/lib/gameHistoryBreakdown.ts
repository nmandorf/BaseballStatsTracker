import { addStats, calculateStats, createZeroStats } from "./statCalculations.ts";
import { fromPersistedStatsData } from "./playerStatsPersistence.ts";
import type { GameHistoryBreakdown, PlayerStats } from "@/types/stats";

export function createGameHistoryBreakdown(
  stats: Partial<PlayerStats> | null | undefined,
): GameHistoryBreakdown | null {
  if (!stats) {
    return null;
  }

  const normalizedStats = fromPersistedStatsData(stats);
  const calculatedStats = calculateStats(normalizedStats);

  return {
    plateAppearances: normalizedStats.plateAppearances,
    hits: normalizedStats.hits,
    walks: normalizedStats.walks,
    rbis: normalizedStats.rbis,
    outs: normalizedStats.outs,
    battingAverage: calculatedStats.battingAverage,
    onBasePercentage: calculatedStats.onBasePercentage,
  };
}

export function createGameHistoryBreakdownFromPlayerStats(
  statsRecords: Array<Partial<PlayerStats>> | null | undefined,
): GameHistoryBreakdown | null {
  if (!statsRecords?.length) {
    return null;
  }

  const teamStats = statsRecords.reduce<PlayerStats>(
    (totals, playerStats) => addStats(totals, fromPersistedStatsData(playerStats)),
    createZeroStats(),
  );

  return createGameHistoryBreakdown(teamStats);
}

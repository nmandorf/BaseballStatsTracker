import { createZeroStats } from "./statCalculations.ts";
import type { PlayerStats } from "@/types/stats";

const persistedStatFields = [
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
] as const satisfies readonly (keyof Omit<PlayerStats, "gamesPlayed">)[];

type PersistedStatsData = Pick<PlayerStats, (typeof persistedStatFields)[number]>;

export function toPersistedStatsData(stats: Partial<PlayerStats> | undefined) {
  return Object.fromEntries(
    persistedStatFields.map((field) => [field, stats?.[field] ?? 0]),
  ) as PersistedStatsData;
}

export function toPersistedTeamStatsData(stats: Omit<PlayerStats, "gamesPlayed">) {
  return toPersistedStatsData(stats);
}

export function fromPersistedStatsData(stats: Partial<PlayerStats> | null | undefined): PlayerStats {
  const fallback = createZeroStats();

  if (!stats) {
    return fallback;
  }

  const normalizedStats = Object.fromEntries(
    persistedStatFields.map((field) => [
      field,
      normalizeStatNumber(stats[field], fallback[field]),
    ]),
  ) as PersistedStatsData;

  return {
    gamesPlayed: normalizeStatNumber(stats.gamesPlayed, fallback.gamesPlayed),
    ...normalizedStats,
  };
}

function normalizeStatNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

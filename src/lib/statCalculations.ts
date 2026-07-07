import type { BatterResult, OutType } from "@/types/game";
import type { CalculatedStats, PlayerStats } from "@/types/stats";

export function createZeroStats(): PlayerStats {
  return {
    gamesPlayed: 0,
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
    outs: 0,
    groundouts: 0,
    flyouts: 0,
    lineouts: 0,
    strikeoutsLooking: 0,
    strikeoutsSwinging: 0,
    otherOuts: 0,
    doublePlays: 0,
    productiveOuts: 0,
    runs: 0,
    rbis: 0,
  };
}

export function addStats(first: PlayerStats, second: PlayerStats): PlayerStats {
  return {
    gamesPlayed: first.gamesPlayed + second.gamesPlayed,
    plateAppearances: first.plateAppearances + second.plateAppearances,
    atBats: first.atBats + second.atBats,
    hits: first.hits + second.hits,
    singles: first.singles + second.singles,
    doubles: first.doubles + second.doubles,
    triples: first.triples + second.triples,
    homeRuns: first.homeRuns + second.homeRuns,
    walks: first.walks + second.walks,
    reachedOnError: first.reachedOnError + second.reachedOnError,
    fieldersChoice: first.fieldersChoice + second.fieldersChoice,
    sacFlies: first.sacFlies + second.sacFlies,
    outs: first.outs + second.outs,
    groundouts: statValue(first, "groundouts") + statValue(second, "groundouts"),
    flyouts: statValue(first, "flyouts") + statValue(second, "flyouts"),
    lineouts: statValue(first, "lineouts") + statValue(second, "lineouts"),
    strikeoutsLooking: statValue(first, "strikeoutsLooking") + statValue(second, "strikeoutsLooking"),
    strikeoutsSwinging: statValue(first, "strikeoutsSwinging") + statValue(second, "strikeoutsSwinging"),
    otherOuts: statValue(first, "otherOuts") + statValue(second, "otherOuts"),
    doublePlays: statValue(first, "doublePlays") + statValue(second, "doublePlays"),
    productiveOuts: statValue(first, "productiveOuts") + statValue(second, "productiveOuts"),
    runs: first.runs + second.runs,
    rbis: first.rbis + second.rbis,
  };
}

export function calculateStats(stats: PlayerStats): CalculatedStats {
  const totalBases =
    stats.singles +
    stats.doubles * 2 +
    stats.triples * 3 +
    stats.homeRuns * 4;
  const timesReachedBase = stats.hits + stats.walks + stats.reachedOnError;
  const strikeouts = statValue(stats, "strikeoutsLooking") + statValue(stats, "strikeoutsSwinging");
  const ballsInPlay =
    stats.hits +
    stats.reachedOnError +
    stats.fieldersChoice +
    statValue(stats, "groundouts") +
    statValue(stats, "flyouts") +
    statValue(stats, "lineouts");

  return {
    battingAverage: divide(stats.hits, stats.atBats),
    onBasePercentage: divide(timesReachedBase, stats.plateAppearances),
    sluggingPercentage: divide(totalBases, stats.atBats),
    ops: divide(timesReachedBase, stats.plateAppearances) + divide(totalBases, stats.atBats),
    extraBaseHitPercentage: divide(stats.doubles + stats.triples + stats.homeRuns, stats.hits),
    outRate: divide(stats.outs, stats.plateAppearances),
    totalBases,
    timesReachedBase,
    strikeouts,
    strikeoutRate: divide(strikeouts, stats.plateAppearances),
    strikeoutLookingRate: divide(statValue(stats, "strikeoutsLooking"), stats.plateAppearances),
    strikeoutSwingingRate: divide(statValue(stats, "strikeoutsSwinging"), stats.plateAppearances),
    ballsInPlay,
    ballInPlayRate: divide(ballsInPlay, stats.plateAppearances),
    productiveOutRate: divide(statValue(stats, "productiveOuts"), stats.outs),
  };
}

export function derivePriorStats(stats: PlayerStats): PlayerStats {
  const hits = stats.singles + stats.doubles + stats.triples + stats.homeRuns;
  const battingOuts = Math.max(0, stats.outs - stats.sacFlies);
  const atBats = hits + stats.reachedOnError + stats.fieldersChoice + battingOuts;
  const plateAppearances = atBats + stats.walks + stats.sacFlies;

  return {
    ...stats,
    hits,
    atBats,
    plateAppearances,
  };
}

export function getPriorStatsValidationError(stats: PlayerStats): string | null {
  return firstStatsValidationError([
    getSacFliesValidationError(stats),
    getClassifiedOutsValidationError(stats),
    getDoublePlaysValidationError(stats),
    getProductiveOutsValidationError(stats),
  ]);
}

function firstStatsValidationError(errors: Array<string | null>) {
  return errors.find(Boolean) ?? null;
}

function getSacFliesValidationError(stats: PlayerStats) {
  if (stats.sacFlies > stats.outs) {
    return "Sac flies cannot be greater than total outs.";
  }

  return null;
}

function getClassifiedOutsValidationError(stats: PlayerStats) {
  const classifiedOuts =
    stats.groundouts +
    stats.flyouts +
    stats.lineouts +
    stats.strikeoutsLooking +
    stats.strikeoutsSwinging +
    stats.otherOuts;
  const availableClassifiedOuts = stats.outs - stats.sacFlies;

  if (classifiedOuts > availableClassifiedOuts) {
    return `Total outs must be at least ${classifiedOuts + stats.sacFlies} to preserve saved out types and sac flies.`;
  }

  return null;
}

function getDoublePlaysValidationError(stats: PlayerStats) {
  if (stats.doublePlays > stats.outs) {
    return "Double plays cannot be greater than total outs.";
  }

  return null;
}

function getProductiveOutsValidationError(stats: PlayerStats) {
  if (stats.productiveOuts > stats.outs) {
    return "Productive outs cannot be greater than total outs.";
  }

  return null;
}

export function formatRate(value: number, digits = 3) {
  if (!Number.isFinite(value) || value <= 0) {
    return ".000";
  }

  return value.toFixed(digits).replace(/^0/, "");
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }

  return `${Math.round(value * 100)}%`;
}

export function addBatterResult(
  stats: PlayerStats,
  result: BatterResult,
  rbis: number,
  outType?: OutType,
  productiveOut = false,
): PlayerStats {
  const normalized = {
    ...createZeroStats(),
    ...stats,
  };
  const next = {
    ...normalized,
    plateAppearances: normalized.plateAppearances + 1,
    rbis: normalized.rbis + rbis,
  };

  if (countsAsAtBat(result)) {
    next.atBats += 1;
  }

  applyBatterResultCounters(next, result, outType, productiveOut);

  return next;
}

function countsAsAtBat(result: BatterResult) {
  return result !== "BB" && result !== "SF";
}

function applyBatterResultCounters(
  stats: PlayerStats,
  result: BatterResult,
  outType: OutType | undefined,
  productiveOut: boolean,
) {
  const resultCounter = batterResultCounters[result];

  if (resultCounter) {
    resultCounter(stats);
    return;
  }

  applyOutResultCounters(stats, result, outType, productiveOut);
}

const batterResultCounters: Partial<Record<BatterResult, (stats: PlayerStats) => void>> = {
  "1B": (stats) => {
    stats.hits += 1;
    stats.singles += 1;
  },
  "2B": (stats) => {
    stats.hits += 1;
    stats.doubles += 1;
  },
  "3B": (stats) => {
    stats.hits += 1;
    stats.triples += 1;
  },
  HR: (stats) => {
    stats.hits += 1;
    stats.homeRuns += 1;
  },
  BB: (stats) => {
    stats.walks += 1;
  },
  ROE: (stats) => {
    stats.reachedOnError += 1;
  },
  FC: (stats) => {
    stats.fieldersChoice += 1;
  },
};

function applyOutResultCounters(
  stats: PlayerStats,
  result: BatterResult,
  outType: OutType | undefined,
  productiveOut: boolean,
) {
  outResultCounters[result]?.(stats, outType, productiveOut);
}

type OutResultCounter = (
  stats: PlayerStats,
  outType: OutType | undefined,
  productiveOut: boolean,
) => void;

const outResultCounters: Partial<Record<BatterResult, OutResultCounter>> = {
  SF: addSacFlyCounter,
  Out: addNormalOutCounter,
  DP: addDoublePlayCounter,
};

function addSacFlyCounter(stats: PlayerStats, _outType: OutType | undefined, productiveOut: boolean) {
  stats.sacFlies += 1;
  stats.outs += 1;
  addProductiveOutCounter(stats, productiveOut);
}

function addNormalOutCounter(stats: PlayerStats, outType: OutType | undefined, productiveOut: boolean) {
  stats.outs += 1;
  addOutTypeCounter(stats, outType);
  addProductiveOutCounter(stats, productiveOut);
}

function addDoublePlayCounter(stats: PlayerStats) {
  stats.outs += 1;
  stats.doublePlays += 1;
}

function addProductiveOutCounter(stats: PlayerStats, productiveOut: boolean) {
  if (productiveOut) stats.productiveOuts += 1;
}

export function addRunnerOut(stats: PlayerStats): PlayerStats {
  const normalized = { ...createZeroStats(), ...stats };

  return {
    ...normalized,
    outs: normalized.outs + 1,
  };
}

export function addRun(stats: PlayerStats): PlayerStats {
  const normalized = { ...createZeroStats(), ...stats };

  return {
    ...normalized,
    runs: normalized.runs + 1,
  };
}

export function divide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function addOutTypeCounter(stats: PlayerStats, outType: OutType | undefined) {
  const outCounterKey = outTypeCounterKeys[outType ?? "OTHER_OUT"];
  stats[outCounterKey] += 1;
}

const outTypeCounterKeys = {
  GROUNDOUT: "groundouts",
  FLYOUT: "flyouts",
  LINEOUT: "lineouts",
  STRIKEOUT_LOOKING: "strikeoutsLooking",
  STRIKEOUT_SWINGING: "strikeoutsSwinging",
  OTHER_OUT: "otherOuts",
} as const satisfies Record<OutType, keyof PlayerStats>;

function statValue(stats: PlayerStats, key: keyof PlayerStats) {
  return stats[key] ?? 0;
}

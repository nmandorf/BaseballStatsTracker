import type { Player } from "@/types/player";
import {
  countBackToBackFemalePairs,
  needsMaleWraparoundHitter,
} from "./lineupGenderRules.ts";
import { calculateStats, divide } from "./statCalculations.ts";

export {
  isLineupGenderOptimized,
  validateLineupGenderRules,
  validateLineupPlayerPool,
} from "./lineupGenderRules.ts";
export type { LineupGenderValidation } from "./lineupGenderRules.ts";

export type RecommendedLineupRow = {
  player: Player;
  lineupSlot: number;
  role: string;
  signal: string;
  score: number;
};

export const lineupRankingPriorities = ["OBP", "Out rate", "SLG", "OPS", "XBH%", "Speed bonus"] as const;

export type LineupRankingPriority = (typeof lineupRankingPriorities)[number];

export type LineupRecommendationOptions = {
  rankingPriority?: LineupRankingPriority;
};

type CalculatedPlayerStats = ReturnType<typeof calculateStats>;

const roleOrder = new Map([
  ["High OBP table-setter", 10],
  ["Best overall hitter", 9],
  ["Strong contact + RBI hitter", 8],
  ["Best power hitter", 7],
  ["Next-best power hitter", 6],
  ["Best remaining hitter", 5],
  ["Useful but flawed hitter", 4],
  ["Weakest hitter hidden", 1],
  ["Contact hitter", 3],
  ["Second leadoff type", 2],
]);

const defaultRankingPriority: LineupRankingPriority = "OBP";

const signalBuilders: Record<LineupRankingPriority, (player: Player, stats: CalculatedPlayerStats) => string> = {
  OBP: (_player, stats) => `${formatInlineRate(stats.onBasePercentage)} OBP / ${formatInlineRate(stats.sluggingPercentage)} SLG`,
  "Out rate": (_player, stats) => `${formatInlineRate(stats.outRate)} Out rate`,
  SLG: (_player, stats) => `${formatInlineRate(stats.sluggingPercentage)} SLG`,
  OPS: (_player, stats) => `${formatInlineRate(stats.ops)} OPS`,
  "XBH%": (_player, stats) => `${formatPercent(stats.extraBaseHitPercentage)} XBH`,
  "Speed bonus": (player, stats) => `${player.speedRating} speed / ${formatInlineRate(stats.onBasePercentage)} OBP`,
};

const rankingPriorityWeights: Record<LineupRankingPriority, {
  average: number;
  avoidOuts: number;
  extraBaseHits: number;
  obp: number;
  ops: number;
  outQuality: number;
  runProduction: number;
  slg: number;
  speed: number;
}> = {
  OBP: {
    obp: 3,
    avoidOuts: 1.3,
    slg: 1,
    ops: 0.8,
    extraBaseHits: 0.35,
    average: 0.45,
    runProduction: 1,
    outQuality: 1,
    speed: 1,
  },
  "Out rate": {
    obp: 1.4,
    avoidOuts: 3.2,
    slg: 0.8,
    ops: 0.7,
    extraBaseHits: 0.3,
    average: 0.35,
    runProduction: 0.8,
    outQuality: 1.2,
    speed: 1,
  },
  SLG: {
    obp: 1.4,
    avoidOuts: 1,
    slg: 3,
    ops: 1,
    extraBaseHits: 0.75,
    average: 0.25,
    runProduction: 1.1,
    outQuality: 0.8,
    speed: 0.8,
  },
  OPS: {
    obp: 1.7,
    avoidOuts: 1,
    slg: 1.7,
    ops: 2.3,
    extraBaseHits: 0.45,
    average: 0.3,
    runProduction: 1,
    outQuality: 0.9,
    speed: 0.8,
  },
  "XBH%": {
    obp: 1.1,
    avoidOuts: 0.9,
    slg: 1.8,
    ops: 0.9,
    extraBaseHits: 2.4,
    average: 0.2,
    runProduction: 1.1,
    outQuality: 0.8,
    speed: 0.7,
  },
  "Speed bonus": {
    obp: 1.8,
    avoidOuts: 1.2,
    slg: 0.9,
    ops: 0.8,
    extraBaseHits: 0.35,
    average: 0.4,
    runProduction: 0.8,
    outQuality: 1,
    speed: 8,
  },
};

export function recommendBattingOrder(
  players: Player[],
  options: LineupRecommendationOptions = {},
): RecommendedLineupRow[] {
  const rankingPriority = options.rankingPriority ?? defaultRankingPriority;
  const activePlayers = players.filter((player) => player.isActive);
  const rankedPlayers = rankLineupPlayers(activePlayers, rankingPriority);

  const baseLineup = activePlayers.length >= 9
    ? arrangeLineupBySlot(rankedPlayers, rankingPriority)
    : rankedPlayers;
  const lineup = arrangeLineupByGender(baseLineup, rankingPriority);
  const contactBalancedLineup = balanceLowerLineupContact(lineup);
  const balancedLineup = arrangeLineupByGender(contactBalancedLineup, rankingPriority);
  const wraparoundOptimizedLineup = preferMaleWraparoundLeadoffProtection(balancedLineup);

  return wraparoundOptimizedLineup.map((player, index) => (
    buildLineupRow(player, index + 1, getLineupScore(player, rankingPriority), rankingPriority)
  ));
}

function rankLineupPlayers(players: Player[], rankingPriority: LineupRankingPriority) {
  if (players.length >= 9 && players.every((player) => player.seasonStats.plateAppearances === 0)) {
    return [...players].sort((a, b) => a.seedOrder - b.seedOrder);
  }

  return [...players].sort((a, b) => (
    getLineupScore(b, rankingPriority) - getLineupScore(a, rankingPriority) ||
    a.seedOrder - b.seedOrder
  ));
}

function arrangeLineupBySlot(players: Player[], rankingPriority: LineupRankingPriority) {
  if (players.length < 9) {
    return players;
  }

  const remaining = [...players];
  const take = (index: number) => remaining.splice(Math.min(index, remaining.length - 1), 1)[0];
  const lineup: Player[] = [];

  lineup[0] = take(0);
  lineup[1] = take(0);
  lineup[2] = take(0);
  lineup[3] = take(bestPowerIndex(remaining, rankingPriority));
  lineup[4] = take(bestPowerIndex(remaining, rankingPriority));
  lineup[5] = take(0);

  const weakest = remaining.splice(weakestIndex(remaining, rankingPriority), 1)[0];
  const secondLeadoff = remaining.splice(bestTurnoverIndex(remaining, rankingPriority), 1)[0];
  lineup.push(...remaining);
  lineup.push(weakest);
  lineup.push(secondLeadoff);

  return lineup.filter(Boolean);
}

function arrangeLineupByGender(players: Player[], rankingPriority: LineupRankingPriority) {
  const femaleLeadoff = players
    .filter((player) => player.gender === "Female")
    .sort((a, b) => (
      getLineupScore(b, rankingPriority) - getLineupScore(a, rankingPriority) ||
      a.seedOrder - b.seedOrder
    ))[0];

  if (!femaleLeadoff) {
    return players;
  }

  const remaining = players.filter((player) => player.id !== femaleLeadoff.id);
  const lineup: Player[] = [femaleLeadoff];

  while (remaining.length) {
    const lastPlayer = lineup[lineup.length - 1];
    const index = chooseNextGenderBalancedIndex(remaining, lastPlayer);

    lineup.push(remaining.splice(index, 1)[0]);
  }

  return lineup;
}

function chooseNextGenderBalancedIndex(remaining: Player[], lastPlayer?: Player) {
  if (isFemalePlayer(lastPlayer)) {
    return chooseSeparatorAfterFemaleHitter(remaining);
  }

  return shouldUseNextFemaleHitter(remaining) ? findFirstFemaleIndex(remaining) : 0;
}

function isFemalePlayer(player: Player | undefined) {
  return player?.gender === "Female";
}

function shouldUseNextFemaleHitter(remaining: Player[]) {
  return hasFemaleHitter(remaining) && shouldUseFemaleBeforeSavingSeparator(remaining);
}

function chooseSeparatorAfterFemaleHitter(remaining: Player[]) {
  const firstNonFemaleIndex = findFirstNonFemaleIndex(remaining);

  return firstNonFemaleIndex >= 0 ? firstNonFemaleIndex : 0;
}

function hasFemaleHitter(players: Player[]) {
  return players.some((player) => player.gender === "Female");
}

function findFirstFemaleIndex(players: Player[]) {
  return players.findIndex((player) => player.gender === "Female");
}

function findFirstNonFemaleIndex(players: Player[]) {
  return players.findIndex((player) => player.gender !== "Female");
}

function shouldUseFemaleBeforeSavingSeparator(remaining: Player[]) {
  const femaleCount = remaining.filter((player) => player.gender === "Female").length;
  const nonFemaleCount = remaining.length - femaleCount;

  return remaining[0]?.gender !== "Female" && nonFemaleCount <= femaleCount - 1;
}

function preferMaleWraparoundLeadoffProtection(players: Player[]) {
  if (!needsMaleWraparoundHitter(players)) {
    return players;
  }

  const wraparoundHitterIndex = chooseMaleWraparoundHitterIndex(players);

  if (wraparoundHitterIndex < 0) {
    return players;
  }

  return movePlayerToFinalSlot(players, wraparoundHitterIndex);
}

function chooseMaleWraparoundHitterIndex(players: Player[]) {
  const candidateIndexes = players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => index > 0 && player.gender === "Male")
    .map(({ index }) => index);

  if (!candidateIndexes.length) {
    return -1;
  }

  return candidateIndexes.reduce((bestIndex, candidateIndex) => {
    const bestLineup = movePlayerToFinalSlot(players, bestIndex);
    const candidateLineup = movePlayerToFinalSlot(players, candidateIndex);
    const bestBackToBackFemales = countBackToBackFemalePairs(bestLineup);
    const candidateBackToBackFemales = countBackToBackFemalePairs(candidateLineup);

    if (candidateBackToBackFemales !== bestBackToBackFemales) {
      return candidateBackToBackFemales < bestBackToBackFemales ? candidateIndex : bestIndex;
    }

    return candidateIndex > bestIndex ? candidateIndex : bestIndex;
  }, candidateIndexes[0]);
}

function movePlayerToFinalSlot(players: Player[], playerIndex: number) {
  const lineup = [...players];
  const [wraparoundHitter] = lineup.splice(playerIndex, 1);

  lineup.push(wraparoundHitter);

  return lineup;
}

function buildLineupRow(
  player: Player,
  lineupSlot: number,
  score: number,
  rankingPriority: LineupRankingPriority,
): RecommendedLineupRow {
  return {
    player,
    lineupSlot,
    role: slotRole(lineupSlot, player.roleHint),
    signal: buildSignal(player, rankingPriority),
    score,
  };
}

function getLineupScore(player: Player, rankingPriority: LineupRankingPriority = defaultRankingPriority) {
  const stats = calculateStats(player.seasonStats);
  const weights = rankingPriorityWeights[rankingPriority];
  const speedBonus = getSpeedBonus(player);
  const roleBonus = (roleOrder.get(player.roleHint) ?? 0) / 100;

  if (player.seasonStats.plateAppearances === 0) {
    return roleBonus + speedBonus * weights.speed + (11 - player.seedOrder) / 1000;
  }

  return (
    stats.onBasePercentage * weights.obp +
    (1 - stats.outRate) * weights.avoidOuts +
    stats.sluggingPercentage * weights.slg +
    stats.ops * weights.ops +
    stats.extraBaseHitPercentage * weights.extraBaseHits +
    stats.battingAverage * weights.average +
    (player.seasonStats.runs * 0.015 + player.seasonStats.rbis * 0.012) * weights.runProduction +
    getOutQualityAdjustment(player) * weights.outQuality +
    speedBonus * weights.speed +
    roleBonus
  );
}

function buildSignal(player: Player, rankingPriority: LineupRankingPriority) {
  const stats = calculateStats(player.seasonStats);

  if (player.seasonStats.plateAppearances === 0) {
    return player.roleHint;
  }

  return signalBuilders[rankingPriority](player, stats);
}

function formatInlineRate(value: number) {
  return value.toFixed(3).replace(/^0/, "");
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function bestPowerIndex(players: Player[], rankingPriority: LineupRankingPriority) {
  return players.reduce((bestIndex, player, index) => {
    const best = players[bestIndex];
    const playerStats = calculateStats(player.seasonStats);
    const bestStats = calculateStats(best.seasonStats);
    const playerPower =
      playerStats.sluggingPercentage +
      playerStats.extraBaseHitPercentage +
      powerHint(player) -
      doublePlayPenalty(player);
    const bestPower =
      bestStats.sluggingPercentage +
      bestStats.extraBaseHitPercentage +
      powerHint(best) -
      doublePlayPenalty(best);
    const playerPriorityAdjustment = getLineupScore(player, rankingPriority) * 0.12;
    const bestPriorityAdjustment = getLineupScore(best, rankingPriority) * 0.12;

    return playerPower + playerPriorityAdjustment > bestPower + bestPriorityAdjustment ? index : bestIndex;
  }, 0);
}

function weakestIndex(players: Player[], rankingPriority: LineupRankingPriority) {
  return players.reduce((weakestPlayerIndex, player, index) => {
    const weakest = players[weakestPlayerIndex];
    return getLineupScore(player, rankingPriority) < getLineupScore(weakest, rankingPriority)
      ? index
      : weakestPlayerIndex;
  }, 0);
}

function bestTurnoverIndex(players: Player[], rankingPriority: LineupRankingPriority) {
  return players.reduce((bestIndex, player, index) => {
    const best = players[bestIndex];
    const playerValue = getLineupScore(player, rankingPriority) + (player.speedRating === "Fast" ? 0.08 : 0) + contactSpotBonus(player);
    const bestValue = getLineupScore(best, rankingPriority) + (best.speedRating === "Fast" ? 0.08 : 0) + contactSpotBonus(best);

    return playerValue > bestValue ? index : bestIndex;
  }, 0);
}

function getSpeedBonus(player: Player) {
  return player.speedRating === "Fast" ? 0.04 : player.speedRating === "Average" ? 0.02 : 0;
}

function powerHint(player: Player) {
  return /power|gap|extra-base|damage/i.test(`${player.roleHint} ${player.notes}`) ? 0.2 : 0;
}

function getOutQualityAdjustment(player: Player) {
  const plateAppearances = player.seasonStats.plateAppearances;

  if (plateAppearances <= 0) {
    return 0;
  }

  return calculateOutQualityAdjustment(getOutQualityRates(player, plateAppearances));
}

function getOutQualityRates(player: Player, plateAppearances: number) {
  const stats = calculateStats(player.seasonStats);

  return {
    ballInPlayRate: stats.ballInPlayRate,
    doublePlayRate: divide(optionalStat(player.seasonStats.doublePlays), plateAppearances),
    lineoutRate: divide(optionalStat(player.seasonStats.lineouts), plateAppearances),
    productiveOutRate: stats.productiveOutRate,
    strikeoutLookingRate: divide(optionalStat(player.seasonStats.strikeoutsLooking), plateAppearances),
    strikeoutRate: stats.strikeoutRate,
    strikeoutSwingingRate: divide(optionalStat(player.seasonStats.strikeoutsSwinging), plateAppearances),
  };
}

function optionalStat(value: number | undefined) {
  return value ?? 0;
}

function calculateOutQualityAdjustment(rates: ReturnType<typeof getOutQualityRates>) {
  return (
    rates.ballInPlayRate * 0.18 +
    rates.lineoutRate * 0.05 +
    rates.productiveOutRate * 0.04 -
    rates.strikeoutRate * 0.22 -
    rates.strikeoutLookingRate * 0.08 -
    rates.strikeoutSwingingRate * 0.04 -
    rates.doublePlayRate * 0.35
  );
}

function contactSpotBonus(player: Player) {
  const stats = calculateStats(player.seasonStats);

  if (player.seasonStats.plateAppearances <= 0) {
    return 0;
  }

  return stats.ballInPlayRate * 0.12 - stats.strikeoutRate * 0.18;
}

function doublePlayPenalty(player: Player) {
  return divide(player.seasonStats.doublePlays ?? 0, player.seasonStats.plateAppearances) * 0.3;
}

function balanceLowerLineupContact(players: Player[]) {
  if (players.length < 9) {
    return players;
  }

  const lineup = [...players];
  const lowerStart = Math.min(6, lineup.length - 1);

  for (let index = lowerStart; index < lineup.length - 1; index += 1) {
    if (!hasAdjacentHighStrikeoutProfiles(lineup, index)) {
      continue;
    }

    const bufferIndex = findContactBufferIndex(lineup, index);

    moveContactBufferBehindCurrentHitter(lineup, index, bufferIndex);
  }

  return lineup;
}

function hasAdjacentHighStrikeoutProfiles(lineup: Player[], index: number) {
  return isHighStrikeoutProfile(lineup[index]) && isHighStrikeoutProfile(lineup[index + 1]);
}

function findContactBufferIndex(lineup: Player[], currentIndex: number) {
  return lineup.findIndex((player, playerIndex) => (
    playerIndex > currentIndex + 1 && isContactBufferProfile(player)
  ));
}

function moveContactBufferBehindCurrentHitter(lineup: Player[], currentIndex: number, bufferIndex: number) {
  if (bufferIndex < 0) {
    return;
  }

  const [buffer] = lineup.splice(bufferIndex, 1);
  lineup.splice(currentIndex + 1, 0, buffer);
}

function isHighStrikeoutProfile(player: Player) {
  const stats = calculateStats(player.seasonStats);

  return player.seasonStats.plateAppearances >= 4 && stats.strikeoutRate >= 0.25;
}

function isContactBufferProfile(player: Player) {
  const stats = calculateStats(player.seasonStats);

  return player.seasonStats.plateAppearances >= 4 && stats.ballInPlayRate >= 0.5 && stats.strikeoutRate <= 0.15;
}

function slotRole(slot: number, fallback: string) {
  const roles: Record<number, string> = {
    1: "Best OBP/contact hitter",
    2: "Best overall hitter",
    3: "Strong contact + RBI hitter",
    4: "Best power/damage hitter",
    5: "Next-best power hitter",
    6: "Best remaining hitter",
    7: "Useful but flawed hitter",
    8: "Weakest hitter",
    9: "Contact hitter",
    10: "Second leadoff type",
  };

  return roles[slot] ?? fallback;
}

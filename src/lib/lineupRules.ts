import type { Player } from "@/types/player";
import { calculateStats, divide } from "./statCalculations.ts";

export type RecommendedLineupRow = {
  player: Player;
  lineupSlot: number;
  role: string;
  signal: string;
  score: number;
};

export type LineupGenderValidation = {
  isLeagueCompliant: boolean;
  hasFemaleLeadoff: boolean;
  warnings: string[];
  missingGenderPlayerNames: string[];
};

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

export function recommendBattingOrder(players: Player[]): RecommendedLineupRow[] {
  const activePlayers = players.filter((player) => player.isActive);
  const rankedPlayers = rankLineupPlayers(activePlayers);

  const baseLineup = activePlayers.length >= 9
    ? arrangeLineupBySlot(rankedPlayers)
    : rankedPlayers;
  const lineup = arrangeLineupByGender(baseLineup);
  const contactBalancedLineup = balanceLowerLineupContact(lineup);
  const balancedLineup = arrangeLineupByGender(contactBalancedLineup);

  return balancedLineup.map((player, index) => buildLineupRow(player, index + 1, getLineupScore(player)));
}

export function isLineupGenderOptimized(lineup: Player[]) {
  return validateLineupGenderRules(lineup).isLeagueCompliant && !hasAvoidableBackToBackFemales(lineup);
}

export function validateLineupPlayerPool(players: Player[]): LineupGenderValidation {
  const activePlayers = players.filter((player) => player.isActive);
  const missingGenderPlayerNames = activePlayers
    .filter((player) => player.gender === "Unknown")
    .map((player) => player.name);
  const hasFemale = activePlayers.some((player) => player.gender === "Female");
  const warnings = buildMissingGenderWarnings(missingGenderPlayerNames);

  if (!hasFemale) {
    warnings.push("Select at least one female player; league rules require a female leadoff hitter.");
  }

  return {
    isLeagueCompliant: missingGenderPlayerNames.length === 0 && hasFemale,
    hasFemaleLeadoff: false,
    warnings,
    missingGenderPlayerNames,
  };
}

export function validateLineupGenderRules(lineup: Player[]): LineupGenderValidation {
  const missingGenderPlayerNames = lineup
    .filter((player) => player.gender === "Unknown")
    .map((player) => player.name);
  const hasFemale = lineup.some((player) => player.gender === "Female");
  const hasFemaleLeadoff = lineup[0]?.gender === "Female";
  const warnings = buildMissingGenderWarnings(missingGenderPlayerNames);

  if (!hasFemale) {
    warnings.push("Select at least one female player; league rules require a female leadoff hitter.");
  } else if (!hasFemaleLeadoff) {
    warnings.push("Move a female player into the leadoff spot before accepting this lineup.");
  }

  if (hasAvoidableBackToBackFemales(lineup)) {
    warnings.push("Female hitters are back-to-back; spread them out when enough male hitters are available.");
  }

  return {
    isLeagueCompliant: missingGenderPlayerNames.length === 0 && hasFemaleLeadoff,
    hasFemaleLeadoff,
    warnings,
    missingGenderPlayerNames,
  };
}

function rankLineupPlayers(players: Player[]) {
  if (players.length >= 9 && players.every((player) => player.seasonStats.plateAppearances === 0)) {
    return [...players].sort((a, b) => a.seedOrder - b.seedOrder);
  }

  return [...players].sort((a, b) => getLineupScore(b) - getLineupScore(a) || a.seedOrder - b.seedOrder);
}

function arrangeLineupBySlot(players: Player[]) {
  if (players.length < 9) {
    return players;
  }

  const remaining = [...players];
  const take = (index: number) => remaining.splice(Math.min(index, remaining.length - 1), 1)[0];
  const lineup: Player[] = [];

  lineup[0] = take(0);
  lineup[1] = take(0);
  lineup[2] = take(0);
  lineup[3] = take(bestPowerIndex(remaining));
  lineup[4] = take(bestPowerIndex(remaining));
  lineup[5] = take(0);

  const weakest = remaining.splice(weakestIndex(remaining), 1)[0];
  const secondLeadoff = remaining.splice(bestTurnoverIndex(remaining), 1)[0];
  lineup.push(...remaining);
  lineup.push(weakest);
  lineup.push(secondLeadoff);

  return lineup.filter(Boolean);
}

function arrangeLineupByGender(players: Player[]) {
  const femaleLeadoff = players
    .filter((player) => player.gender === "Female")
    .sort((a, b) => getLineupScore(b) - getLineupScore(a) || a.seedOrder - b.seedOrder)[0];

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
  const firstNonFemaleIndex = remaining.findIndex((player) => player.gender !== "Female");

  if (lastPlayer?.gender === "Female") {
    return firstNonFemaleIndex >= 0 ? firstNonFemaleIndex : 0;
  }

  const firstFemaleIndex = remaining.findIndex((player) => player.gender === "Female");

  if (firstFemaleIndex < 0) {
    return 0;
  }

  const femaleCount = remaining.filter((player) => player.gender === "Female").length;
  const nonFemaleCount = remaining.length - femaleCount;
  const needsSavedSeparator = remaining[0]?.gender !== "Female" && nonFemaleCount <= femaleCount - 1;

  return needsSavedSeparator ? firstFemaleIndex : 0;
}

function buildLineupRow(player: Player, lineupSlot: number, score: number): RecommendedLineupRow {
  return {
    player,
    lineupSlot,
    role: slotRole(lineupSlot, player.roleHint),
    signal: buildSignal(player),
    score,
  };
}

function getLineupScore(player: Player) {
  const stats = calculateStats(player.seasonStats);
  const speedBonus = player.speedRating === "Fast" ? 0.04 : player.speedRating === "Average" ? 0.02 : 0;
  const roleBonus = (roleOrder.get(player.roleHint) ?? 0) / 100;

  if (player.seasonStats.plateAppearances === 0) {
    return roleBonus + speedBonus + (11 - player.seedOrder) / 1000;
  }

  return (
    stats.onBasePercentage * 2.2 +
    (1 - stats.outRate) * 1.4 +
    stats.sluggingPercentage * 1.3 +
    stats.ops +
    stats.extraBaseHitPercentage * 0.55 +
    stats.battingAverage * 0.45 +
    player.seasonStats.runs * 0.015 +
    player.seasonStats.rbis * 0.012 +
    getOutQualityAdjustment(player) +
    speedBonus +
    roleBonus
  );
}

function buildSignal(player: Player) {
  const stats = calculateStats(player.seasonStats);

  if (player.seasonStats.plateAppearances === 0) {
    return player.roleHint;
  }

  return `${formatInlineRate(stats.onBasePercentage)} OBP / ${formatInlineRate(stats.sluggingPercentage)} SLG`;
}

function formatInlineRate(value: number) {
  return value.toFixed(3).replace(/^0/, "");
}

function bestPowerIndex(players: Player[]) {
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

    return playerPower > bestPower ? index : bestIndex;
  }, 0);
}

function weakestIndex(players: Player[]) {
  return players.reduce((weakestPlayerIndex, player, index) => {
    const weakest = players[weakestPlayerIndex];
    return getLineupScore(player) < getLineupScore(weakest) ? index : weakestPlayerIndex;
  }, 0);
}

function bestTurnoverIndex(players: Player[]) {
  return players.reduce((bestIndex, player, index) => {
    const best = players[bestIndex];
    const playerValue = getLineupScore(player) + (player.speedRating === "Fast" ? 0.08 : 0) + contactSpotBonus(player);
    const bestValue = getLineupScore(best) + (best.speedRating === "Fast" ? 0.08 : 0) + contactSpotBonus(best);

    return playerValue > bestValue ? index : bestIndex;
  }, 0);
}

function powerHint(player: Player) {
  return /power|gap|extra-base|damage/i.test(`${player.roleHint} ${player.notes}`) ? 0.2 : 0;
}

function getOutQualityAdjustment(player: Player) {
  const plateAppearances = player.seasonStats.plateAppearances;

  if (plateAppearances <= 0) {
    return 0;
  }

  const stats = calculateStats(player.seasonStats);
  const lineoutRate = divide(player.seasonStats.lineouts ?? 0, plateAppearances);
  const strikeoutLookingRate = divide(player.seasonStats.strikeoutsLooking ?? 0, plateAppearances);
  const strikeoutSwingingRate = divide(player.seasonStats.strikeoutsSwinging ?? 0, plateAppearances);
  const doublePlayRate = divide(player.seasonStats.doublePlays ?? 0, plateAppearances);

  return (
    stats.ballInPlayRate * 0.18 +
    lineoutRate * 0.05 +
    stats.productiveOutRate * 0.04 -
    stats.strikeoutRate * 0.22 -
    strikeoutLookingRate * 0.08 -
    strikeoutSwingingRate * 0.04 -
    doublePlayRate * 0.35
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
    if (!isHighStrikeoutProfile(lineup[index]) || !isHighStrikeoutProfile(lineup[index + 1])) {
      continue;
    }

    const bufferIndex = lineup.findIndex((player, playerIndex) => (
      playerIndex > index + 1 && isContactBufferProfile(player)
    ));

    if (bufferIndex > -1) {
      const [buffer] = lineup.splice(bufferIndex, 1);
      lineup.splice(index + 1, 0, buffer);
    }
  }

  return lineup;
}

function isHighStrikeoutProfile(player: Player) {
  const stats = calculateStats(player.seasonStats);

  return player.seasonStats.plateAppearances >= 4 && stats.strikeoutRate >= 0.25;
}

function isContactBufferProfile(player: Player) {
  const stats = calculateStats(player.seasonStats);

  return player.seasonStats.plateAppearances >= 4 && stats.ballInPlayRate >= 0.5 && stats.strikeoutRate <= 0.15;
}

function buildMissingGenderWarnings(playerNames: string[]) {
  if (!playerNames.length) {
    return [];
  }

  return [`Set gender for ${formatNameList(playerNames)} before accepting a league-compliant lineup.`];
}

function formatNameList(names: string[]) {
  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function hasAvoidableBackToBackFemales(players: Player[]) {
  const femaleCount = players.filter((player) => player.gender === "Female").length;
  const maleCount = players.filter((player) => player.gender === "Male").length;
  const minimumBackToBackFemalePairs = Math.max(0, femaleCount - (maleCount + 1));
  const backToBackFemalePairs = players.filter((player, index) => (
    index > 0 && player.gender === "Female" && players[index - 1]?.gender === "Female"
  )).length;

  return backToBackFemalePairs > minimumBackToBackFemalePairs;
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

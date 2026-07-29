import type { Player } from "@/types/player";

export type LineupGenderValidation = {
  isLeagueCompliant: boolean;
  hasFemaleLeadoff: boolean;
  warnings: string[];
  missingGenderPlayerNames: string[];
};

export function isLineupGenderOptimized(lineup: Player[]) {
  return (
    validateLineupGenderRules(lineup).isLeagueCompliant &&
    !hasAvoidableBackToBackFemales(lineup) &&
    !needsMaleWraparoundHitter(lineup)
  );
}

export function validateLineupPlayerPool(
  players: Player[],
): LineupGenderValidation {
  const activePlayers = players.filter((player) => player.isActive);
  const missingGenderPlayerNames = activePlayers
    .filter((player) => player.gender === "Unknown")
    .map((player) => player.name);
  const hasFemale = activePlayers.some(
    (player) => player.gender === "Female",
  );
  const warnings = buildMissingGenderWarnings(missingGenderPlayerNames);

  if (!hasFemale) {
    warnings.push(
      "Select at least one female player; league rules require a female leadoff hitter.",
    );
  }

  return {
    isLeagueCompliant:
      missingGenderPlayerNames.length === 0 && hasFemale,
    hasFemaleLeadoff: false,
    warnings,
    missingGenderPlayerNames,
  };
}

export function validateLineupGenderRules(
  lineup: Player[],
): LineupGenderValidation {
  const genderFacts = getLineupGenderFacts(lineup);
  const warnings = buildLineupGenderWarnings(lineup, genderFacts);

  return {
    isLeagueCompliant:
      genderFacts.missingGenderPlayerNames.length === 0 &&
      genderFacts.hasFemaleLeadoff,
    hasFemaleLeadoff: genderFacts.hasFemaleLeadoff,
    warnings,
    missingGenderPlayerNames: genderFacts.missingGenderPlayerNames,
  };
}

export function needsMaleWraparoundHitter(players: Player[]) {
  return (
    hasFemaleLeadoff(players) &&
    !hasMaleFinalHitter(players) &&
    hasMaleHitterAfterLeadoff(players)
  );
}

export function countBackToBackFemalePairs(players: Player[]) {
  return players.filter(
    (player, index) =>
      index > 0 &&
      player.gender === "Female" &&
      players[index - 1]?.gender === "Female",
  ).length;
}

function getLineupGenderFacts(lineup: Player[]) {
  const missingGenderPlayerNames = lineup
    .filter((player) => player.gender === "Unknown")
    .map((player) => player.name);

  return {
    hasFemale: lineup.some((player) => player.gender === "Female"),
    hasFemaleLeadoff: lineup[0]?.gender === "Female",
    missingGenderPlayerNames,
  };
}

function buildLineupGenderWarnings(
  lineup: Player[],
  genderFacts: ReturnType<typeof getLineupGenderFacts>,
) {
  return [
    ...buildMissingGenderWarnings(genderFacts.missingGenderPlayerNames),
    ...buildFemaleLeadoffWarnings(genderFacts),
    ...buildLineupSpacingWarnings(lineup),
  ];
}

function buildFemaleLeadoffWarnings(
  genderFacts: ReturnType<typeof getLineupGenderFacts>,
) {
  if (!genderFacts.hasFemale) {
    return [
      "Select at least one female player; league rules require a female leadoff hitter.",
    ];
  }

  return genderFacts.hasFemaleLeadoff
    ? []
    : [
        "Move a female player into the leadoff spot before accepting this lineup.",
      ];
}

function buildLineupSpacingWarnings(lineup: Player[]) {
  return [
    ...getBackToBackFemaleWarning(lineup),
    ...getMaleWraparoundWarning(lineup),
  ];
}

function getBackToBackFemaleWarning(lineup: Player[]) {
  return hasAvoidableBackToBackFemales(lineup)
    ? [
        "Female hitters are back-to-back; spread them out when enough male hitters are available.",
      ]
    : [];
}

function getMaleWraparoundWarning(lineup: Player[]) {
  return needsMaleWraparoundHitter(lineup)
    ? [
        "Place a male hitter in the final lineup spot before the female leadoff hitter to maximize the two-base walk rule.",
      ]
    : [];
}

function buildMissingGenderWarnings(playerNames: string[]) {
  if (!playerNames.length) {
    return [];
  }

  return [
    `Set gender for ${formatNameList(playerNames)} before accepting a league-compliant lineup.`,
  ];
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
  const femaleCount = players.filter(
    (player) => player.gender === "Female",
  ).length;
  const maleCount = players.filter(
    (player) => player.gender === "Male",
  ).length;
  const minimumBackToBackFemalePairs = getMinimumBackToBackFemalePairs(
    players,
    femaleCount,
    maleCount,
  );

  return (
    countBackToBackFemalePairs(players) >
    minimumBackToBackFemalePairs
  );
}

function getMinimumBackToBackFemalePairs(
  players: Player[],
  femaleCount: number,
  maleCount: number,
) {
  const protectsFemaleLeadoff =
    players[0]?.gender === "Female" &&
    players.some(
      (player, index) => index > 0 && player.gender === "Male",
    );

  return protectsFemaleLeadoff
    ? Math.max(0, femaleCount - maleCount)
    : Math.max(0, femaleCount - (maleCount + 1));
}

function hasFemaleLeadoff(players: Player[]) {
  return players.length > 1 && players[0]?.gender === "Female";
}

function hasMaleFinalHitter(players: Player[]) {
  return players[players.length - 1]?.gender === "Male";
}

function hasMaleHitterAfterLeadoff(players: Player[]) {
  return players.some(
    (player, index) => index > 0 && player.gender === "Male",
  );
}

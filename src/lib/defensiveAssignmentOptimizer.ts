import type {
  DefensiveAlignment,
  DefensivePosition,
  DefensiveRatingValue,
  DefensiveSlot,
} from "@/types/defense";
import type { Player } from "@/types/player";
import {
  minimumFemaleDefenders,
  normalizeDefensivePosition,
} from "./defensiveConstants.ts";

function assignedSlot(player: Player): DefensiveSlot {
  return {
    status: "ASSIGNED",
    playerId: player.id,
    playerName: player.name,
  };
}

type AssignmentState = {
  assignedPositionMask: number;
  femaleDefenderCount: number;
  avoidPositionAssignments: number;
  score: number;
  slots: DefensiveAlignment["slots"];
};

export function optimizeDefensiveAssignments(
  players: Player[],
  positions: DefensivePosition[],
  benchCounts: Record<string, number>,
  lockedPitcherPlayerId?: string | null,
  requiredPlayerIds = new Set<string>(),
): DefensiveAlignment["slots"] {
  let assignmentStates = createInitialAssignmentStates();

  players.forEach((player) => {
    assignmentStates = advanceAssignmentStatesForPlayer({
      player,
      assignmentStates,
      positions,
      benchCounts,
      lockedPitcherPlayerId,
      isRequiredPlayer: requiredPlayerIds.has(player.id),
    });
  });

  const availableFemaleCount = players.filter((player) => player.gender === "Female").length;
  const maximumAssignedPlayers = Math.min(players.length, positions.length);
  const requiredFemaleCount = Math.min(
    minimumFemaleDefenders,
    availableFemaleCount,
    maximumAssignedPlayers,
  );
  const bestState = selectBestAssignmentState(assignmentStates, requiredFemaleCount);
  const slots = fillVacantDefensiveSlots(bestState.slots, positions);

  return slots;
}

function createInitialAssignmentStates() {
  return new Map<string, AssignmentState>([
    ["0:0", {
      assignedPositionMask: 0,
      femaleDefenderCount: 0,
      avoidPositionAssignments: 0,
      score: 0,
      slots: {},
    }],
  ]);
}

function advanceAssignmentStatesForPlayer({
  player,
  assignmentStates,
  positions,
  benchCounts,
  lockedPitcherPlayerId,
  isRequiredPlayer,
}: {
  player: Player;
  assignmentStates: Map<string, AssignmentState>;
  positions: DefensivePosition[];
  benchCounts: Record<string, number>;
  lockedPitcherPlayerId?: string | null;
  isRequiredPlayer: boolean;
}) {
  const nextStates = isRequiredPlayer
    ? new Map<string, AssignmentState>()
    : new Map(assignmentStates);

  assignmentStates.forEach((state) => {
    positions.forEach((position, positionIndex) => {
      if (!canAssignPlayerToPosition(state, player, position, positionIndex, lockedPitcherPlayerId)) {
        return;
      }

      const candidateState = createCandidateAssignmentState(state, player, position, positionIndex, benchCounts);
      const stateKey = getAssignmentStateKey(candidateState);
      const existingState = nextStates.get(stateKey);

      if (isPreferredAssignmentState(candidateState, existingState)) {
        nextStates.set(stateKey, candidateState);
      }
    });
  });

  return nextStates;
}

function canAssignPlayerToPosition(
  state: AssignmentState,
  player: Player,
  position: DefensivePosition,
  positionIndex: number,
  lockedPitcherPlayerId?: string | null,
) {
  const positionMask = getPositionMask(positionIndex);

  return [
    isPositionAvailable(state, positionMask),
    canPlaceLockedPitcher(player, position, lockedPitcherPlayerId),
    canPlacePitcher(player, position, lockedPitcherPlayerId),
  ].every(Boolean);
}

function isPositionAvailable(state: AssignmentState, positionMask: number) {
  return (state.assignedPositionMask & positionMask) === 0;
}

function canPlaceLockedPitcher(
  player: Player,
  position: DefensivePosition,
  lockedPitcherPlayerId?: string | null,
) {
  return !lockedPitcherPlayerId || player.id !== lockedPitcherPlayerId || position === "P";
}

function canPlacePitcher(
  player: Player,
  position: DefensivePosition,
  lockedPitcherPlayerId?: string | null,
) {
  return !lockedPitcherPlayerId || player.id === lockedPitcherPlayerId || position !== "P";
}

function createCandidateAssignmentState(
  state: AssignmentState,
  player: Player,
  position: DefensivePosition,
  positionIndex: number,
  benchCounts: Record<string, number>,
): AssignmentState {
  const assignedPositionMask = state.assignedPositionMask | getPositionMask(positionIndex);

  return {
    assignedPositionMask,
    femaleDefenderCount: Math.min(
      minimumFemaleDefenders,
      state.femaleDefenderCount + (player.gender === "Female" ? 1 : 0),
    ),
    avoidPositionAssignments: state.avoidPositionAssignments + getAvoidPositionAssignmentCount(player, position),
    score: state.score + getPositionFitScore(player, position, benchCounts),
    slots: {
      ...state.slots,
      [position]: assignedSlot(player),
    },
  };
}

function getPositionMask(positionIndex: number) {
  return 1 << positionIndex;
}

function getAvoidPositionAssignmentCount(player: Player, position: DefensivePosition) {
  return normalizeDefensivePosition(player.defensiveProfile.notes.avoidPosition) === position ? 1 : 0;
}

function getAssignmentStateKey(state: AssignmentState) {
  return `${state.assignedPositionMask}:${state.femaleDefenderCount}`;
}

function isPreferredAssignmentState(candidateState: AssignmentState, existingState?: AssignmentState) {
  if (!existingState) {
    return true;
  }

  if (candidateState.avoidPositionAssignments !== existingState.avoidPositionAssignments) {
    return candidateState.avoidPositionAssignments < existingState.avoidPositionAssignments;
  }

  return candidateState.score > existingState.score;
}

function selectBestAssignmentState(
  assignmentStates: Map<string, AssignmentState>,
  requiredFemaleCount: number,
): AssignmentState {
  return [...assignmentStates.values()].sort((firstState, secondState) => (
    compareAssignmentStates(firstState, secondState, requiredFemaleCount)
  ))[0];
}

function compareAssignmentStates(
  firstState: AssignmentState,
  secondState: AssignmentState,
  requiredFemaleCount: number,
) {
  for (const comparer of assignmentStateComparers) {
    const difference = comparer(firstState, secondState, requiredFemaleCount);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

type AssignmentStateComparer = (
  firstState: AssignmentState,
  secondState: AssignmentState,
  requiredFemaleCount: number,
) => number;

const assignmentStateComparers: AssignmentStateComparer[] = [
  compareAssignedPositionCount,
  compareFemaleMinimum,
  compareAvoidPositionAssignments,
  compareAssignmentScore,
];

function compareAssignedPositionCount(firstState: AssignmentState, secondState: AssignmentState) {
  return countAssignedPositions(secondState.assignedPositionMask)
    - countAssignedPositions(firstState.assignedPositionMask);
}

function compareFemaleMinimum(
  firstState: AssignmentState,
  secondState: AssignmentState,
  requiredFemaleCount: number,
) {
  const firstMeetsFemaleMinimum = meetsFemaleMinimum(firstState, requiredFemaleCount);
  const secondMeetsFemaleMinimum = meetsFemaleMinimum(secondState, requiredFemaleCount);

  if (firstMeetsFemaleMinimum === secondMeetsFemaleMinimum) {
    return 0;
  }

  return secondMeetsFemaleMinimum ? 1 : -1;
}

function compareAvoidPositionAssignments(firstState: AssignmentState, secondState: AssignmentState) {
  return firstState.avoidPositionAssignments - secondState.avoidPositionAssignments;
}

function compareAssignmentScore(firstState: AssignmentState, secondState: AssignmentState) {
  return secondState.score - firstState.score;
}

function meetsFemaleMinimum(state: AssignmentState, requiredFemaleCount: number) {
  return state.femaleDefenderCount >= requiredFemaleCount;
}

function fillVacantDefensiveSlots(
  assignedSlots: DefensiveAlignment["slots"],
  positions: DefensivePosition[],
) {
  const slots = { ...assignedSlots };

  positions.forEach((position) => {
    slots[position] ??= { status: "VACANT" };
  });

  return slots;
}

function countAssignedPositions(positionMask: number) {
  let remainingMask = positionMask;
  let count = 0;

  while (remainingMask > 0) {
    count += remainingMask & 1;
    remainingMask >>= 1;
  }

  return count;
}

function getPositionFitScore(
  player: Player,
  position: DefensivePosition,
  benchCounts: Record<string, number>,
) {
  const preferences = getDefensivePositionPreferences(player);
  let score = (benchCounts[player.id] ?? 0) * 1_000;

  score += getPositionPreferenceScore(position, preferences);
  score += getRatingScore(player.defensiveProfile.ratings.positionConfidence) * 4;
  score += getPositionRatingScore(player, position);

  return score;
}

type DefensivePositionPreference = DefensivePosition | null;

type DefensivePositionPreferences = {
  avoidPosition: DefensivePositionPreference;
  backupPosition: DefensivePositionPreference;
  bestPosition: DefensivePositionPreference;
  primaryPosition: DefensivePositionPreference;
};

function getDefensivePositionPreferences(player: Player): DefensivePositionPreferences {
  return {
    avoidPosition: normalizeDefensivePosition(player.defensiveProfile.notes.avoidPosition),
    backupPosition: normalizeDefensivePosition(player.defensiveProfile.notes.backupPosition),
    bestPosition: normalizeDefensivePosition(player.defensiveProfile.notes.bestPosition),
    primaryPosition: normalizeDefensivePosition(player.primaryPosition),
  };
}

function getPositionPreferenceScore(
  position: DefensivePosition,
  preferences: DefensivePositionPreferences,
) {
  if (position === preferences.avoidPosition) {
    return -10_000;
  }

  return getPreferredPositionScore(position, preferences)
    + getUnmatchedPreferredPositionPenalty(position, preferences);
}

type PositionPreferenceScoreRule = {
  key: Exclude<keyof DefensivePositionPreferences, "avoidPosition">;
  score: number;
};

const positionPreferenceScoreRules: PositionPreferenceScoreRule[] = [
  { key: "primaryPosition", score: 420 },
  { key: "bestPosition", score: 300 },
  { key: "backupPosition", score: 160 },
];

function getPreferredPositionScore(
  position: DefensivePosition,
  preferences: DefensivePositionPreferences,
) {
  return positionPreferenceScoreRules.reduce((score, rule) => (
    preferences[rule.key] === position ? score + rule.score : score
  ), 0);
}

function getUnmatchedPreferredPositionPenalty(
  position: DefensivePosition,
  preferences: DefensivePositionPreferences,
) {
  if (!hasPreferredPosition(preferences)) {
    return 0;
  }

  return isPreferredPosition(position, preferences) ? 0 : -80;
}

function hasPreferredPosition(preferences: DefensivePositionPreferences) {
  return positionPreferenceScoreRules.some((rule) => Boolean(preferences[rule.key]));
}

function isPreferredPosition(
  position: DefensivePosition,
  preferences: DefensivePositionPreferences,
) {
  return positionPreferenceScoreRules.some((rule) => preferences[rule.key] === position);
}

function getPositionRatingScore(player: Player, position: DefensivePosition) {
  const ratings = player.defensiveProfile.ratings;
  const ratingScores = {
    accuracy: getRatingScore(ratings.throwAccuracy),
    arm: getRatingScore(ratings.armStrength),
    glove: getRatingScore(ratings.gloveSkill),
    range: getRatingScore(ratings.range),
  };

  return positionRatingScorers[position]?.(ratingScores) ?? getOutfieldRatingScore(ratingScores);
}

type DefensiveRatingScores = {
  accuracy: number;
  arm: number;
  glove: number;
  range: number;
};

const positionRatingScorers: Partial<Record<DefensivePosition, (scores: DefensiveRatingScores) => number>> = {
  P: getPitcherRatingScore,
  C: getCatcherRatingScore,
  "1B": getFirstBaseRatingScore,
  "2B": getSecondBaseRatingScore,
  SS: getLeftSideInfieldRatingScore,
  "3B": getLeftSideInfieldRatingScore,
};

function getPitcherRatingScore({ accuracy, glove }: DefensiveRatingScores) {
  return accuracy * 5 + glove * 2;
}

function getCatcherRatingScore({ accuracy, glove }: DefensiveRatingScores) {
  return glove * 3 + accuracy * 2;
}

function getFirstBaseRatingScore({ glove, range }: DefensiveRatingScores) {
  return glove * 5 + range;
}

function getSecondBaseRatingScore({ accuracy, glove, range }: DefensiveRatingScores) {
  return glove * 4 + range * 3 + accuracy * 2;
}

function getLeftSideInfieldRatingScore({ accuracy, arm, glove, range }: DefensiveRatingScores) {
  return arm * 4 + range * 4 + glove * 3 + accuracy * 2;
}

function getOutfieldRatingScore({ accuracy, arm, range }: DefensiveRatingScores) {
  return range * 5 + arm * 4 + accuracy * 2;
}

function getRatingScore(rating: DefensiveRatingValue) {
  if (rating === "High") return 3;
  if (rating === "Medium") return 2;
  if (rating === "Low") return 1;
  return 0;
}


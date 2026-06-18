import type {
  BallType,
  DefensiveAlignment,
  DefensiveEvent,
  DefensiveEventType,
  DefensivePosition,
  DefensiveProfile,
  DefensiveRatingValue,
  DefensiveSlot,
  DefensiveSummary,
  InningHalf,
} from "@/types/defense";
import type { Player } from "@/types/player";

export type TeamPhase = "BATTING" | "FIELDING";

export const minimumFemaleDefenders = 3;

export type DefensiveAlignmentIssue = {
  code:
    | "NOT_ENOUGH_FEMALE_PLAYERS"
    | "NOT_ENOUGH_FEMALE_DEFENDERS"
    | "LOCKED_PITCHER_MISSING"
    | "LOCKED_PITCHER_MOVED"
    | "REQUIRED_POSITION_VACANT";
  message: string;
};

export const defensivePositions: DefensivePosition[] = [
  "P",
  "C",
  "1B",
  "2B",
  "SS",
  "3B",
  "LF",
  "LC",
  "RC",
  "RF",
];

const suggestedInfieldPositions = ["SS", "2B", "3B", "1B", "P", "C"] as const satisfies readonly DefensivePosition[];
const suggestedOutfieldPositions = ["LC", "RC", "LF", "RF"] as const satisfies readonly DefensivePosition[];

export const defensivePositionLabels: Record<DefensivePosition, string> = {
  P: "Pitcher",
  C: "Catcher",
  "1B": "First Base",
  "2B": "Second Base",
  SS: "Shortstop",
  "3B": "Third Base",
  LF: "Left Field",
  LC: "Left Center",
  RC: "Right Center",
  RF: "Right Field",
};

export const defensiveEventLabels: Record<DefensiveEventType, string> = {
  ROUTINE_OUT: "Routine Out",
  HIT_NO_PLAY: "Hit / No Play",
  MISPLAY: "Misplay",
  GREAT_PLAY: "Great Play",
  EXTRA_BASES_ALLOWED: "Extra Bases",
  DOUBLE_PLAY: "Double Play",
};

export function createDefaultDefensiveProfile(): DefensiveProfile {
  return {
    ratings: {
      armStrength: "Unknown",
      throwAccuracy: "Unknown",
      gloveSkill: "Unknown",
      range: "Unknown",
      positionConfidence: "Unknown",
    },
    notes: {
      strengths: "",
      weaknesses: "",
      bestPosition: "",
      avoidPosition: "",
      backupPosition: "",
      communication: "",
      health: "",
    },
  };
}

export function getTeamPhase(isHome: boolean, half: InningHalf): TeamPhase {
  if (isHome) {
    return half === "Top" ? "FIELDING" : "BATTING";
  }

  return half === "Top" ? "BATTING" : "FIELDING";
}

export function getNextHalfInning(inning: number, half: InningHalf) {
  if (half === "Top") {
    return { inning, half: "Bottom" as const };
  }

  return { inning: inning + 1, half: "Top" as const };
}

export function getFirstDefensiveHalf(isHome: boolean) {
  return {
    inning: 1,
    half: isHome ? "Top" as const : "Bottom" as const,
  };
}

export function createDefaultDefensiveAlignment(
  players: Player[],
  inning: number,
  half: InningHalf,
  options: { id?: string; updatedAt?: string } = {},
): DefensiveAlignment {
  return generateDefensiveAlignment({
    players,
    priorAlignments: [],
    inning,
    half,
    id: options.id,
    updatedAt: options.updatedAt,
  });
}

export function generateDefensiveAlignment(input: {
  players: Player[];
  priorAlignments: DefensiveAlignment[];
  inning: number;
  half: InningHalf;
  lockedPitcherPlayerId?: string | null;
  id?: string;
  updatedAt?: string;
}): DefensiveAlignment {
  const benchCounts = getDefensiveBenchCounts(input.players, input.priorAlignments);
  const slots = optimizeDefensiveAssignments(
    input.players,
    defensivePositions,
    benchCounts,
    input.lockedPitcherPlayerId,
  );

  return buildAlignment({
    id: input.id ?? createAlignmentId(input.inning, input.half),
    inning: input.inning,
    half: input.half,
    slots,
    players: input.players,
    updatedAt: input.updatedAt,
  });
}

export function getDefensiveAlignmentIssues(
  alignment: DefensiveAlignment,
  players: Player[],
  lockedPitcherPlayerId?: string | null,
): DefensiveAlignmentIssue[] {
  const femalePlayerCount = players.filter((player) => player.gender === "Female").length;
  const assignedFemaleCount = getAssignedFemaleDefenderCount(alignment, players);
  const vacantRequiredPositions = defensivePositions.filter(
    (position) => alignment.slots[position]?.status !== "ASSIGNED",
  );
  const issues: DefensiveAlignmentIssue[] = [];

  if (femalePlayerCount < minimumFemaleDefenders) {
    issues.push({
      code: "NOT_ENOUGH_FEMALE_PLAYERS",
      message: `Add at least ${minimumFemaleDefenders} female players to generate a legal defense.`,
    });
  } else if (assignedFemaleCount < minimumFemaleDefenders) {
    issues.push({
      code: "NOT_ENOUGH_FEMALE_DEFENDERS",
      message: `Assign at least ${minimumFemaleDefenders} female players on defense.`,
    });
  }

  if (!lockedPitcherPlayerId) {
    if (players.length >= defensivePositions.length && vacantRequiredPositions.length > 0) {
      issues.push({
        code: "REQUIRED_POSITION_VACANT",
        message: `Assign a player at ${vacantRequiredPositions.map((position) => defensivePositionLabels[position]).join(", ")}.`,
      });
    }

    return issues;
  }

  const lockedPitcher = players.find((player) => player.id === lockedPitcherPlayerId);
  const assignedPitcherId = getAssignedPlayerIdForPosition(alignment, "P");

  if (!lockedPitcher) {
    issues.push({
      code: "LOCKED_PITCHER_MISSING",
      message: "The full-game pitcher is no longer available in this lineup.",
    });
  } else if (assignedPitcherId !== lockedPitcherPlayerId) {
    issues.push({
      code: "LOCKED_PITCHER_MOVED",
      message: `${lockedPitcher.name} must remain at Pitcher for the full game.`,
    });
  }

  if (players.length >= defensivePositions.length && vacantRequiredPositions.length > 0) {
    issues.push({
      code: "REQUIRED_POSITION_VACANT",
      message: `Assign a player at ${vacantRequiredPositions.map((position) => defensivePositionLabels[position]).join(", ")}.`,
    });
  }

  return issues;
}

export function getAssignedFemaleDefenderCount(alignment: DefensiveAlignment, players: Player[]) {
  const femalePlayerIds = new Set(
    players.filter((player) => player.gender === "Female").map((player) => player.id),
  );

  return defensivePositions.filter((position) => {
    const slot = alignment.slots[position];
    return slot?.status === "ASSIGNED" && femalePlayerIds.has(slot.playerId);
  }).length;
}

export function getDefensiveBenchCounts(players: Player[], alignments: DefensiveAlignment[]) {
  const counts = Object.fromEntries(players.map((player) => [player.id, 0])) as Record<string, number>;

  alignments.forEach((alignment) => {
    alignment.benchPlayerIds.forEach((playerId) => {
      if (playerId in counts) {
        counts[playerId] += 1;
      }
    });
  });

  return counts;
}

export function normalizeDefensivePosition(value: string | null | undefined): DefensivePosition | null {
  const normalizedValue = value?.trim().toUpperCase().replaceAll(/[^A-Z0-9]/g, "") ?? "";
  const aliases: Record<string, DefensivePosition> = {
    P: "P",
    PITCHER: "P",
    C: "C",
    CATCHER: "C",
    "1B": "1B",
    FIRST: "1B",
    FIRSTBASE: "1B",
    "2B": "2B",
    SECOND: "2B",
    SECONDBASE: "2B",
    SS: "SS",
    SHORT: "SS",
    SHORTSTOP: "SS",
    "3B": "3B",
    THIRD: "3B",
    THIRDBASE: "3B",
    LF: "LF",
    LEFTFIELD: "LF",
    LC: "LC",
    LCF: "LC",
    LEFTCENTER: "LC",
    LEFTCENTERFIELD: "LC",
    RC: "RC",
    RCF: "RC",
    RIGHTCENTER: "RC",
    RIGHTCENTERFIELD: "RC",
    RF: "RF",
    RIGHTFIELD: "RF",
  };

  return aliases[normalizedValue] ?? null;
}

export function copyAlignmentForHalf(
  source: DefensiveAlignment | null | undefined,
  players: Player[],
  inning: number,
  half: InningHalf,
): DefensiveAlignment {
  if (!source) {
    return createDefaultDefensiveAlignment(players, inning, half);
  }

  return buildAlignment({
    id: createAlignmentId(inning, half),
    inning,
    half,
    slots: { ...source.slots },
    players,
  });
}

export function normalizeDefensiveAlignment(
  alignment: DefensiveAlignment,
  players: Player[],
): DefensiveAlignment {
  return buildAlignment({
    id: alignment.id,
    inning: alignment.inning,
    half: alignment.half,
    slots: alignment.slots,
    players,
    updatedAt: alignment.updatedAt,
  });
}

export function assignPlayerToPosition(
  alignment: DefensiveAlignment,
  players: Player[],
  position: DefensivePosition,
  playerId: string | "VACANT",
): DefensiveAlignment {
  const sourcePosition = playerId === "VACANT"
    ? null
    : getAssignedPositionForPlayer(alignment, playerId);
  const destinationSlot = alignment.slots[position];

  if (sourcePosition && sourcePosition !== position && destinationSlot?.status === "ASSIGNED") {
    return swapDefensivePlayers(alignment, players, sourcePosition, position);
  }

  const nextSlots = removePlayerFromSlots(alignment.slots, playerId);

  if (playerId === "VACANT") {
    nextSlots[position] = { status: "VACANT" };
    return buildAlignment({
      ...alignment,
      slots: nextSlots,
      players,
    });
  }

  const player = players.find((candidate) => candidate.id === playerId);

  if (!player) {
    return alignment;
  }

  nextSlots[position] = assignedSlot(player);
  return buildAlignment({
    ...alignment,
    slots: nextSlots,
    players,
  });
}

export function swapDefensivePlayers(
  alignment: DefensiveAlignment,
  players: Player[],
  firstPosition: DefensivePosition,
  secondPosition: DefensivePosition,
): DefensiveAlignment {
  const nextSlots = { ...alignment.slots };
  const firstSlot = nextSlots[firstPosition];

  nextSlots[firstPosition] = nextSlots[secondPosition];
  nextSlots[secondPosition] = firstSlot;

  return buildAlignment({
    ...alignment,
    slots: nextSlots,
    players,
  });
}

export function getAssignedPositionForPlayer(
  alignment: DefensiveAlignment,
  playerId: string,
): DefensivePosition | null {
  return defensivePositions.find((position) => {
    const slot = alignment.slots[position];
    return slot?.status === "ASSIGNED" && slot.playerId === playerId;
  }) ?? null;
}

export function getAssignedPlayerIdForPosition(
  alignment: DefensiveAlignment,
  position: DefensivePosition,
) {
  const slot = alignment.slots[position];
  return slot?.status === "ASSIGNED" ? slot.playerId : null;
}

export function getSuggestedPositionForBallType(
  alignment: DefensiveAlignment,
  ballType: BallType,
): DefensivePosition {
  const preferredPositions = isOutfieldBallType(ballType)
    ? suggestedOutfieldPositions
    : suggestedInfieldPositions;

  return preferredPositions.find((position) => getAssignedPlayerIdForPosition(alignment, position))
    ?? preferredPositions[0];
}

export function getAlignmentForCurrentHalf(alignments: DefensiveAlignment[], inning: number, half: InningHalf) {
  return alignments.find((alignment) => alignment.inning === inning && alignment.half === half) ?? null;
}

export function upsertDefensiveAlignment(
  alignments: DefensiveAlignment[],
  alignment: DefensiveAlignment,
): DefensiveAlignment[] {
  const nextAlignment = {
    ...alignment,
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = alignments.findIndex(
    (candidate) => candidate.inning === alignment.inning && candidate.half === alignment.half,
  );

  if (existingIndex === -1) {
    return [...alignments, nextAlignment];
  }

  return alignments.map((candidate, index) => (index === existingIndex ? nextAlignment : candidate));
}

export function createDefensiveEvent(input: {
  id: string;
  inning: number;
  half: InningHalf;
  type: DefensiveEventType;
  fielder?: Player | null;
  position?: DefensivePosition;
  outsRecorded?: number;
  runsAllowed?: number;
  basesAllowed?: number;
  ballType?: DefensiveEvent["ballType"];
  misplayType?: DefensiveEvent["misplayType"];
  misplayResult?: DefensiveEvent["misplayResult"];
  greatPlayImpact?: DefensiveEvent["greatPlayImpact"];
  involvedPlayerIds?: string[];
  notes?: string;
  createdAt?: string;
}): DefensiveEvent {
  return {
    id: input.id,
    inning: input.inning,
    half: input.half,
    type: input.type,
    fielderId: input.fielder?.id,
    fielderName: input.fielder?.name,
    position: input.position,
    ballType: input.ballType,
    misplayType: input.misplayType,
    misplayResult: input.misplayResult,
    greatPlayImpact: input.greatPlayImpact,
    involvedPlayerIds: input.involvedPlayerIds ?? (input.fielder ? [input.fielder.id] : []),
    outsRecorded: Math.max(0, Math.min(3, Math.floor(input.outsRecorded ?? defaultOutsForEvent(input.type)))),
    runsAllowed: Math.max(0, Math.floor(input.runsAllowed ?? 0)),
    basesAllowed: Math.max(0, Math.floor(input.basesAllowed ?? 0)),
    notes: input.notes?.trim() ?? "",
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function getDefensiveSummary(
  player: Player,
  alignments: DefensiveAlignment[],
  events: DefensiveEvent[],
): DefensiveSummary {
  const inningsByPosition = getInningsByPosition(player.id, alignments);
  const playerEvents = events.filter((event) => event.fielderId === player.id || event.involvedPlayerIds.includes(player.id));
  const routinePlaysMade = playerEvents.filter((event) => event.type === "ROUTINE_OUT").length;
  const greatPlays = playerEvents.filter((event) => event.type === "GREAT_PLAY").length;
  const misplays = playerEvents.filter((event) => event.type === "MISPLAY").length;
  const extraBasesAllowed = playerEvents.reduce((total, event) => total + event.basesAllowed, 0);
  const defensiveInnings = Object.values(inningsByPosition).reduce((total, innings) => total + (innings ?? 0), 0);
  const defensiveChances = routinePlaysMade + greatPlays + misplays;

  return {
    playerId: player.id,
    inningsByPosition,
    defensiveInnings,
    defensiveChances,
    routinePlaysMade,
    greatPlays,
    misplays,
    extraBasesAllowed,
    routinePlaySuccessRate: divide(routinePlaysMade, defensiveChances),
    misplayRate: divide(misplays, defensiveChances),
    greatPlayRate: divide(greatPlays, defensiveChances),
    extraBasesAllowedPerInning: divide(extraBasesAllowed, defensiveInnings),
    bestFitLabel: getBestFitLabel(player, inningsByPosition, playerEvents),
    evidenceLabel: getEvidenceLabel(defensiveInnings, defensiveChances),
  };
}

export function normalizeDefensiveProfile(profile: Partial<DefensiveProfile> | undefined): DefensiveProfile {
  const fallback = createDefaultDefensiveProfile();

  if (!profile) {
    return fallback;
  }

  return {
    ratings: {
      armStrength: normalizeRating(profile.ratings?.armStrength),
      throwAccuracy: normalizeRating(profile.ratings?.throwAccuracy),
      gloveSkill: normalizeRating(profile.ratings?.gloveSkill),
      range: normalizeRating(profile.ratings?.range),
      positionConfidence: normalizeRating(profile.ratings?.positionConfidence),
    },
    notes: {
      strengths: normalizeText(profile.notes?.strengths),
      weaknesses: normalizeText(profile.notes?.weaknesses),
      bestPosition: normalizeDefensivePositionPreference(profile.notes?.bestPosition),
      avoidPosition: normalizeDefensivePositionPreference(profile.notes?.avoidPosition),
      backupPosition: normalizeDefensivePositionPreference(profile.notes?.backupPosition),
      communication: normalizeText(profile.notes?.communication),
      health: normalizeText(profile.notes?.health),
    },
  };
}

export function normalizeDefensivePositionPreference(value: unknown) {
  const positionPreference = normalizeText(value);
  const normalizedPreference = positionPreference.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");

  return normalizedPreference === "ROVER" ? "" : positionPreference;
}

function buildAlignment(input: {
  id: string;
  inning: number;
  half: InningHalf;
  slots: DefensiveAlignment["slots"];
  players: Player[];
  updatedAt?: string;
}): DefensiveAlignment {
  const activePlayerIds = new Set(input.players.map((player) => player.id));
  const assignedPlayerIds = new Set<string>();
  const normalizedSlots: DefensiveAlignment["slots"] = {};

  defensivePositions.forEach((position) => {
    const slot = input.slots[position];

    if (!slot || slot.status === "VACANT" || !activePlayerIds.has(slot.playerId) || assignedPlayerIds.has(slot.playerId)) {
      normalizedSlots[position] = { status: "VACANT" };
      return;
    }

    assignedPlayerIds.add(slot.playerId);
    normalizedSlots[position] = slot;
  });

  const benchPlayerIds = input.players
    .filter((player) => !assignedPlayerIds.has(player.id))
    .map((player) => player.id);

  return {
    id: input.id,
    inning: input.inning,
    half: input.half,
    slots: normalizedSlots,
    benchPlayerIds,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

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

function optimizeDefensiveAssignments(
  players: Player[],
  positions: DefensivePosition[],
  benchCounts: Record<string, number>,
  lockedPitcherPlayerId?: string | null,
): DefensiveAlignment["slots"] {
  let assignmentStates = new Map<string, AssignmentState>([
    ["0:0", {
      assignedPositionMask: 0,
      femaleDefenderCount: 0,
      avoidPositionAssignments: 0,
      score: 0,
      slots: {},
    }],
  ]);

  players.forEach((player) => {
    const nextStates = new Map(assignmentStates);

    assignmentStates.forEach((state) => {
      positions.forEach((position, positionIndex) => {
        const positionMask = 1 << positionIndex;

        if ((state.assignedPositionMask & positionMask) !== 0) {
          return;
        }

        if (lockedPitcherPlayerId && player.id === lockedPitcherPlayerId && position !== "P") {
          return;
        }

        if (lockedPitcherPlayerId && player.id !== lockedPitcherPlayerId && position === "P") {
          return;
        }

        const assignedPositionMask = state.assignedPositionMask | positionMask;
        const femaleDefenderCount = Math.min(
          minimumFemaleDefenders,
          state.femaleDefenderCount + (player.gender === "Female" ? 1 : 0),
        );
        const candidateState: AssignmentState = {
          assignedPositionMask,
          femaleDefenderCount,
          avoidPositionAssignments: state.avoidPositionAssignments
            + (normalizeDefensivePosition(player.defensiveProfile.notes.avoidPosition) === position ? 1 : 0),
          score: state.score + getPositionFitScore(player, position, benchCounts),
          slots: {
            ...state.slots,
            [position]: assignedSlot(player),
          },
        };
        const stateKey = `${assignedPositionMask}:${femaleDefenderCount}`;
        const existingState = nextStates.get(stateKey);

        if (
          !existingState
          || candidateState.avoidPositionAssignments < existingState.avoidPositionAssignments
          || (
            candidateState.avoidPositionAssignments === existingState.avoidPositionAssignments
            && candidateState.score > existingState.score
          )
        ) {
          nextStates.set(stateKey, candidateState);
        }
      });
    });

    assignmentStates = nextStates;
  });

  const availableFemaleCount = players.filter((player) => player.gender === "Female").length;
  const maximumAssignedPlayers = Math.min(players.length, positions.length);
  const requiredFemaleCount = Math.min(
    minimumFemaleDefenders,
    availableFemaleCount,
    maximumAssignedPlayers,
  );
  const bestState = [...assignmentStates.values()].sort((firstState, secondState) => {
    const assignedDifference = countAssignedPositions(secondState.assignedPositionMask)
      - countAssignedPositions(firstState.assignedPositionMask);

    if (assignedDifference !== 0) return assignedDifference;

    const firstMeetsFemaleMinimum = firstState.femaleDefenderCount >= requiredFemaleCount;
    const secondMeetsFemaleMinimum = secondState.femaleDefenderCount >= requiredFemaleCount;

    if (firstMeetsFemaleMinimum !== secondMeetsFemaleMinimum) {
      return secondMeetsFemaleMinimum ? 1 : -1;
    }

    if (firstState.avoidPositionAssignments !== secondState.avoidPositionAssignments) {
      return firstState.avoidPositionAssignments - secondState.avoidPositionAssignments;
    }

    return secondState.score - firstState.score;
  })[0];
  const slots = { ...bestState.slots };

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
  const bestPosition = normalizeDefensivePosition(player.defensiveProfile.notes.bestPosition);
  const primaryPosition = normalizeDefensivePosition(player.primaryPosition);
  const backupPosition = normalizeDefensivePosition(player.defensiveProfile.notes.backupPosition);
  const avoidPosition = normalizeDefensivePosition(player.defensiveProfile.notes.avoidPosition);
  let score = (benchCounts[player.id] ?? 0) * 1_000;

  if (position === avoidPosition) score -= 10_000;
  if (position === bestPosition) score += 300;
  if (position === primaryPosition) score += 240;
  if (position === backupPosition) score += 160;
  if (
    (bestPosition || primaryPosition || backupPosition)
    && position !== bestPosition
    && position !== primaryPosition
    && position !== backupPosition
  ) {
    score -= 80;
  }

  score += getRatingScore(player.defensiveProfile.ratings.positionConfidence) * 4;
  score += getPositionRatingScore(player, position);

  return score;
}

function getPositionRatingScore(player: Player, position: DefensivePosition) {
  const ratings = player.defensiveProfile.ratings;
  const gloveScore = getRatingScore(ratings.gloveSkill);
  const accuracyScore = getRatingScore(ratings.throwAccuracy);
  const armScore = getRatingScore(ratings.armStrength);
  const rangeScore = getRatingScore(ratings.range);

  if (position === "P") return accuracyScore * 5 + gloveScore * 2;
  if (position === "C") return gloveScore * 3 + accuracyScore * 2;
  if (position === "1B") return gloveScore * 5 + rangeScore;
  if (position === "2B") return gloveScore * 4 + rangeScore * 3 + accuracyScore * 2;
  if (position === "SS" || position === "3B") return armScore * 4 + rangeScore * 4 + gloveScore * 3 + accuracyScore * 2;
  return rangeScore * 5 + armScore * 4 + accuracyScore * 2;
}

function getRatingScore(rating: DefensiveRatingValue) {
  if (rating === "High") return 3;
  if (rating === "Medium") return 2;
  if (rating === "Low") return 1;
  return 0;
}

function removePlayerFromSlots(
  slots: DefensiveAlignment["slots"],
  playerId: string | "VACANT",
) {
  const nextSlots = { ...slots };

  if (playerId === "VACANT") {
    return nextSlots;
  }

  defensivePositions.forEach((position) => {
    const slot = nextSlots[position];

    if (slot?.status === "ASSIGNED" && slot.playerId === playerId) {
      nextSlots[position] = { status: "VACANT" };
    }
  });

  return nextSlots;
}

function getInningsByPosition(playerId: string, alignments: DefensiveAlignment[]) {
  return alignments.reduce<Partial<Record<DefensivePosition, number>>>((inningsByPosition, alignment) => {
    defensivePositions.forEach((position) => {
      const slot = alignment.slots[position];

      if (slot?.status !== "ASSIGNED" || slot.playerId !== playerId) {
        return;
      }

      inningsByPosition[position] = (inningsByPosition[position] ?? 0) + 1;
    });

    return inningsByPosition;
  }, {});
}

function getBestFitLabel(
  player: Player,
  inningsByPosition: Partial<Record<DefensivePosition, number>>,
  events: DefensiveEvent[],
) {
  const noteBestPosition = player.defensiveProfile.notes.bestPosition.trim();

  if (noteBestPosition) {
    return noteBestPosition;
  }

  const mostPlayedPosition = Object.entries(inningsByPosition)
    .sort(([, firstInnings], [, secondInnings]) => (secondInnings ?? 0) - (firstInnings ?? 0))[0]?.[0] as DefensivePosition | undefined;

  if (mostPlayedPosition) {
    return defensivePositionLabels[mostPlayedPosition];
  }

  if (isHigh(player.defensiveProfile.ratings.range) && isHigh(player.defensiveProfile.ratings.armStrength)) {
    return "Outfield fit";
  }

  if (isHigh(player.defensiveProfile.ratings.gloveSkill) && isHigh(player.defensiveProfile.ratings.throwAccuracy)) {
    return "Infield fit";
  }

  if (events.some((event) => event.type === "GREAT_PLAY")) {
    return "Reliable defender";
  }

  return "Needs more defense data";
}

function getEvidenceLabel(defensiveInnings: number, defensiveChances: number) {
  if (defensiveInnings >= 6 && defensiveChances >= 5) {
    return "Based on game data";
  }

  if (defensiveInnings > 0 || defensiveChances > 0) {
    return "Small sample";
  }

  return "Based on profile";
}

function defaultOutsForEvent(type: DefensiveEventType) {
  if (type === "ROUTINE_OUT" || type === "GREAT_PLAY") return 1;
  if (type === "DOUBLE_PLAY") return 2;
  return 0;
}

function createAlignmentId(inning: number, half: InningHalf) {
  return `defense-${inning}-${half.toLowerCase()}`;
}

function normalizeRating(value: unknown): DefensiveRatingValue {
  return value === "Low" || value === "Medium" || value === "High" ? value : "Unknown";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isOutfieldBallType(ballType: BallType) {
  return ballType === "Fly ball"
    || ballType === "Line drive"
    || ballType === "Short fly"
    || ballType === "Hard hit ball";
}

function isHigh(value: DefensiveRatingValue) {
  return value === "High";
}

function divide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

import type {
  BallType,
  DefensiveAlignment,
  DefensivePosition,
  DefensiveProfile,
  DefensiveRatingValue,
  DefensiveSlot,
  InningHalf,
} from "@/types/defense";
import type { Player } from "@/types/player";
import {
  defensivePositionLabels,
  defensivePositions,
  minimumFemaleDefenders,
} from "./defensiveConstants.ts";
import { optimizeDefensiveAssignments } from "./defensiveAssignmentOptimizer.ts";

export {
  defensiveEventLabels,
  defensivePositionLabels,
  defensivePositions,
  minimumFemaleDefenders,
  normalizeDefensivePosition,
} from "./defensiveConstants.ts";
export {
  createDefensiveEvent,
  getDefensiveSummary,
} from "./defensiveEvents.ts";
export type { DefensiveEventInput } from "./defensiveEvents.ts";

export type TeamPhase = "BATTING" | "FIELDING";

export type DefensiveAlignmentIssue = {
  code:
    | "NOT_ENOUGH_FEMALE_PLAYERS"
    | "NOT_ENOUGH_FEMALE_DEFENDERS"
    | "LOCKED_PITCHER_MISSING"
    | "LOCKED_PITCHER_MOVED"
    | "REQUIRED_POSITION_VACANT";
  message: string;
};

const suggestedInfieldPositions = ["SS", "2B", "3B", "1B", "P", "C"] as const satisfies readonly DefensivePosition[];
const suggestedOutfieldPositions = ["LC", "RC", "LF", "RF"] as const satisfies readonly DefensivePosition[];

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
  requiredPlayerIds?: Iterable<string>;
  id?: string;
  updatedAt?: string;
}): DefensiveAlignment {
  const benchCounts = getDefensiveBenchCounts(input.players, input.priorAlignments);
  const slots = optimizeDefensiveAssignments(
    input.players,
    defensivePositions,
    benchCounts,
    input.lockedPitcherPlayerId,
    new Set(input.requiredPlayerIds ?? []),
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

  addFemaleDefenderIssues(issues, femalePlayerCount, assignedFemaleCount);
  addLockedPitcherIssue(issues, alignment, players, lockedPitcherPlayerId);
  addVacantRequiredPositionIssue(issues, players, vacantRequiredPositions);

  return issues;
}

function addFemaleDefenderIssues(
  issues: DefensiveAlignmentIssue[],
  femalePlayerCount: number,
  assignedFemaleCount: number,
) {
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
}

function addLockedPitcherIssue(
  issues: DefensiveAlignmentIssue[],
  alignment: DefensiveAlignment,
  players: Player[],
  lockedPitcherPlayerId?: string | null,
) {
  if (!lockedPitcherPlayerId) {
    return;
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
}

function addVacantRequiredPositionIssue(
  issues: DefensiveAlignmentIssue[],
  players: Player[],
  vacantRequiredPositions: DefensivePosition[],
) {
  if (players.length >= defensivePositions.length && vacantRequiredPositions.length > 0) {
    issues.push({
      code: "REQUIRED_POSITION_VACANT",
      message: `Assign a player at ${vacantRequiredPositions.map((position) => defensivePositionLabels[position]).join(", ")}.`,
    });
  }
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
  const swappedAlignment = getSwappedAssignment(alignment, players, position, playerId);

  if (swappedAlignment) {
    return swappedAlignment;
  }

  return assignPlayerToOpenPosition(alignment, players, position, playerId);
}

function assignPlayerToOpenPosition(
  alignment: DefensiveAlignment,
  players: Player[],
  position: DefensivePosition,
  playerId: string | "VACANT",
) {
  const nextSlots = removePlayerFromSlots(alignment.slots, playerId);

  if (playerId === "VACANT") {
    return buildAlignmentWithSlot(alignment, players, nextSlots, position, { status: "VACANT" });
  }

  const player = players.find((candidate) => candidate.id === playerId);

  if (!player) {
    return alignment;
  }

  return buildAlignmentWithSlot(alignment, players, nextSlots, position, assignedSlot(player));
}

function getSwappedAssignment(
  alignment: DefensiveAlignment,
  players: Player[],
  position: DefensivePosition,
  playerId: string | "VACANT",
) {
  const sourcePosition = getAssignmentSourcePosition(alignment, playerId);

  if (!sourcePosition || !shouldSwapAssignedPlayers(alignment, sourcePosition, position)) {
    return null;
  }

  return swapDefensivePlayers(alignment, players, sourcePosition, position);
}

function getAssignmentSourcePosition(
  alignment: DefensiveAlignment,
  playerId: string | "VACANT",
) {
  return playerId === "VACANT" ? null : getAssignedPositionForPlayer(alignment, playerId);
}

function shouldSwapAssignedPlayers(
  alignment: DefensiveAlignment,
  sourcePosition: DefensivePosition,
  destinationPosition: DefensivePosition,
) {
  return [
    sourcePosition !== destinationPosition,
    alignment.slots[destinationPosition]?.status === "ASSIGNED",
  ].every(Boolean);
}

function buildAlignmentWithSlot(
  alignment: DefensiveAlignment,
  players: Player[],
  slots: DefensiveAlignment["slots"],
  position: DefensivePosition,
  slot: DefensiveSlot,
) {
  slots[position] = slot;

  return buildAlignment({
    ...alignment,
    slots,
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

export function normalizeDefensiveProfile(profile: Partial<DefensiveProfile> | undefined): DefensiveProfile {
  const fallback = createDefaultDefensiveProfile();

  if (!profile) {
    return fallback;
  }

  return {
    ratings: normalizeDefensiveRatings(profile.ratings),
    notes: normalizeDefensiveNotes(profile.notes),
  };
}

function normalizeDefensiveRatings(ratings: Partial<DefensiveProfile["ratings"]> | undefined) {
  const source = ratings ?? {};

  return {
    armStrength: normalizeRating(source.armStrength),
    throwAccuracy: normalizeRating(source.throwAccuracy),
    gloveSkill: normalizeRating(source.gloveSkill),
    range: normalizeRating(source.range),
    positionConfidence: normalizeRating(source.positionConfidence),
  };
}

function normalizeDefensiveNotes(notes: Partial<DefensiveProfile["notes"]> | undefined) {
  const source = notes ?? {};

  return {
    strengths: normalizeText(source.strengths),
    weaknesses: normalizeText(source.weaknesses),
    bestPosition: normalizeDefensivePositionPreference(source.bestPosition),
    avoidPosition: normalizeDefensivePositionPreference(source.avoidPosition),
    backupPosition: normalizeDefensivePositionPreference(source.backupPosition),
    communication: normalizeText(source.communication),
    health: normalizeText(source.health),
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
    normalizeAlignmentSlot(position, input.slots, normalizedSlots, activePlayerIds, assignedPlayerIds);
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

function normalizeAlignmentSlot(
  position: DefensivePosition,
  sourceSlots: DefensiveAlignment["slots"],
  normalizedSlots: DefensiveAlignment["slots"],
  activePlayerIds: Set<string>,
  assignedPlayerIds: Set<string>,
) {
  const slot = sourceSlots[position];

  if (!isUsableAssignedSlot(slot, activePlayerIds, assignedPlayerIds)) {
    normalizedSlots[position] = { status: "VACANT" };
    return;
  }

  assignedPlayerIds.add(slot.playerId);
  normalizedSlots[position] = slot;
}

function isUsableAssignedSlot(
  slot: DefensiveSlot | undefined,
  activePlayerIds: Set<string>,
  assignedPlayerIds: Set<string>,
) : slot is Extract<DefensiveSlot, { status: "ASSIGNED" }> {
  if (!slot || slot.status !== "ASSIGNED") {
    return false;
  }

  return activePlayerIds.has(slot.playerId) && !assignedPlayerIds.has(slot.playerId);
}

function assignedSlot(player: Player): DefensiveSlot {
  return {
    status: "ASSIGNED",
    playerId: player.id,
    playerName: player.name,
  };
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

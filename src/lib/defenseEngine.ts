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

export const requiredDefensivePositions: DefensivePosition[] = [
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

export const allDefensivePositions: DefensivePosition[] = [...requiredDefensivePositions, "ROVER"];

const suggestedInfieldPositions = ["SS", "2B", "3B", "1B", "P", "C"] as const satisfies readonly DefensivePosition[];
const suggestedOutfieldPositions = ["LC", "RC", "LF", "RF", "ROVER"] as const satisfies readonly DefensivePosition[];

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
  ROVER: "Rover",
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
  options: { roverEnabled?: boolean; id?: string; updatedAt?: string } = {},
): DefensiveAlignment {
  const roverEnabled = options.roverEnabled ?? players.length > requiredDefensivePositions.length;
  const positions = roverEnabled ? allDefensivePositions : requiredDefensivePositions;
  const slots: DefensiveAlignment["slots"] = {};

  positions.forEach((position, index) => {
    const player = players[index];
    slots[position] = player ? assignedSlot(player) : { status: "VACANT" };
  });

  return buildAlignment({
    id: options.id ?? createAlignmentId(inning, half),
    inning,
    half,
    roverEnabled,
    slots,
    players,
    updatedAt: options.updatedAt,
  });
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
    roverEnabled: source.roverEnabled,
    slots: { ...source.slots },
    players,
  });
}

export function assignPlayerToPosition(
  alignment: DefensiveAlignment,
  players: Player[],
  position: DefensivePosition,
  playerId: string | "VACANT" | "DISABLED_ROVER",
): DefensiveAlignment {
  const nextSlots = removePlayerFromSlots(alignment.slots, playerId);

  if (playerId === "DISABLED_ROVER" && position === "ROVER") {
    delete nextSlots.ROVER;
    return buildAlignment({
      ...alignment,
      roverEnabled: false,
      slots: nextSlots,
      players,
    });
  }

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
    roverEnabled: position === "ROVER" ? true : alignment.roverEnabled,
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
  return allDefensivePositions.find((position) => {
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

export function getLatestDefensiveAlignment(alignments: DefensiveAlignment[]) {
  return alignments.at(-1) ?? null;
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
      bestPosition: normalizeText(profile.notes?.bestPosition),
      avoidPosition: normalizeText(profile.notes?.avoidPosition),
      backupPosition: normalizeText(profile.notes?.backupPosition),
      communication: normalizeText(profile.notes?.communication),
      health: normalizeText(profile.notes?.health),
    },
  };
}

function buildAlignment(input: {
  id: string;
  inning: number;
  half: InningHalf;
  roverEnabled: boolean;
  slots: DefensiveAlignment["slots"];
  players: Player[];
  updatedAt?: string;
}): DefensiveAlignment {
  const activePlayerIds = new Set(input.players.map((player) => player.id));
  const assignedPlayerIds = new Set<string>();
  const normalizedSlots: DefensiveAlignment["slots"] = {};
  const positions = input.roverEnabled ? allDefensivePositions : requiredDefensivePositions;

  positions.forEach((position) => {
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
    roverEnabled: input.roverEnabled,
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

function removePlayerFromSlots(
  slots: DefensiveAlignment["slots"],
  playerId: string | "VACANT" | "DISABLED_ROVER",
) {
  const nextSlots = { ...slots };

  if (playerId === "VACANT" || playerId === "DISABLED_ROVER") {
    return nextSlots;
  }

  allDefensivePositions.forEach((position) => {
    const slot = nextSlots[position];

    if (slot?.status === "ASSIGNED" && slot.playerId === playerId) {
      nextSlots[position] = { status: "VACANT" };
    }
  });

  return nextSlots;
}

function getInningsByPosition(playerId: string, alignments: DefensiveAlignment[]) {
  return alignments.reduce<Partial<Record<DefensivePosition, number>>>((inningsByPosition, alignment) => {
    allDefensivePositions.forEach((position) => {
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

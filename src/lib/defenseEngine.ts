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
    CF: "LC",
    CENTER: "LC",
    CENTERFIELD: "LC",
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

type DefensiveEventInput = {
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
};

export function createDefensiveEvent(input: DefensiveEventInput): DefensiveEvent {
  return {
    id: input.id,
    inning: input.inning,
    half: input.half,
    type: input.type,
    ...getDefensiveEventFielder(input.fielder),
    position: input.position,
    ballType: input.ballType,
    misplayType: input.misplayType,
    misplayResult: input.misplayResult,
    greatPlayImpact: input.greatPlayImpact,
    involvedPlayerIds: getDefensiveEventPlayerIds(input),
    outsRecorded: normalizeOutsRecorded(input.outsRecorded, input.type),
    runsAllowed: normalizeNonNegativeInteger(input.runsAllowed),
    basesAllowed: normalizeNonNegativeInteger(input.basesAllowed),
    notes: normalizeEventNotes(input.notes),
    createdAt: getEventCreatedAt(input.createdAt),
  };
}

function getDefensiveEventFielder(fielder: Player | null | undefined) {
  return {
    fielderId: fielder?.id,
    fielderName: fielder?.name,
  };
}

function getDefensiveEventPlayerIds(input: DefensiveEventInput) {
  return input.involvedPlayerIds ?? (input.fielder ? [input.fielder.id] : []);
}

function normalizeOutsRecorded(outsRecorded: number | undefined, eventType: DefensiveEventType) {
  return Math.max(0, Math.min(3, Math.floor(outsRecorded ?? defaultOutsForEvent(eventType))));
}

function normalizeNonNegativeInteger(value: number | undefined) {
  return Math.max(0, Math.floor(value ?? 0));
}

function normalizeEventNotes(notes: string | undefined) {
  return notes?.trim() ?? "";
}

function getEventCreatedAt(createdAt: string | undefined) {
  return createdAt ?? new Date().toISOString();
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
  const inningsByPosition: Partial<Record<DefensivePosition, number>> = {};

  alignments.forEach((alignment) => {
    countAlignmentInningsForPlayer(inningsByPosition, alignment, playerId);
  });

  return inningsByPosition;
}

function countAlignmentInningsForPlayer(
  inningsByPosition: Partial<Record<DefensivePosition, number>>,
  alignment: DefensiveAlignment,
  playerId: string,
) {
  defensivePositions.forEach((position) => {
    if (isAssignedPlayerSlot(alignment.slots[position], playerId)) {
      inningsByPosition[position] = (inningsByPosition[position] ?? 0) + 1;
    }
  });
}

function isAssignedPlayerSlot(slot: DefensiveSlot | undefined, playerId: string) {
  return slot?.status === "ASSIGNED" && slot.playerId === playerId;
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

  return getEvidenceBasedFitLabel(player, events);
}

function getEvidenceBasedFitLabel(player: Player, events: DefensiveEvent[]) {
  for (const rule of evidenceFitRules) {
    if (rule.matches(player, events)) return rule.label;
  }

  return "Needs more defense data";
}

type EvidenceFitRule = {
  label: string;
  matches: (player: Player, events: DefensiveEvent[]) => boolean;
};

const evidenceFitRules: EvidenceFitRule[] = [
  { label: "Outfield fit", matches: hasOutfieldFitProfile },
  { label: "Infield fit", matches: hasInfieldFitProfile },
  { label: "Reliable defender", matches: hasGreatPlayEvent },
];

function hasOutfieldFitProfile(player: Player) {
  const ratings = player.defensiveProfile.ratings;
  return isHigh(ratings.range) && isHigh(ratings.armStrength);
}

function hasInfieldFitProfile(player: Player) {
  const ratings = player.defensiveProfile.ratings;
  return isHigh(ratings.gloveSkill) && isHigh(ratings.throwAccuracy);
}

function hasGreatPlayEvent(_player: Player, events: DefensiveEvent[]) {
  return events.some(isGreatPlayEvent);
}

function isGreatPlayEvent(event: DefensiveEvent) {
  return event.type === "GREAT_PLAY";
}

function getEvidenceLabel(defensiveInnings: number, defensiveChances: number) {
  if (hasEnoughDefenseEvidence(defensiveInnings, defensiveChances)) {
    return "Based on game data";
  }

  if (hasAnyDefenseEvidence(defensiveInnings, defensiveChances)) {
    return "Small sample";
  }

  return "Based on profile";
}

function hasEnoughDefenseEvidence(defensiveInnings: number, defensiveChances: number) {
  return defensiveInnings >= 6 && defensiveChances >= 5;
}

function hasAnyDefenseEvidence(defensiveInnings: number, defensiveChances: number) {
  return defensiveInnings > 0 || defensiveChances > 0;
}

function defaultOutsForEvent(type: DefensiveEventType) {
  return defaultOutsByEventType[type] ?? 0;
}

const defaultOutsByEventType: Partial<Record<DefensiveEventType, number>> = {
  ROUTINE_OUT: 1,
  GREAT_PLAY: 1,
  DOUBLE_PLAY: 2,
};

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

import type {
  DefensiveAlignment,
  DefensiveEvent,
  DefensiveEventType,
  DefensivePosition,
  DefensiveSlot,
  DefensiveSummary,
  InningHalf,
} from "@/types/defense";
import type { Player } from "@/types/player";
import {
  defensivePositionLabels,
  defensivePositions,
} from "./defensiveConstants.ts";

export type DefensiveEventInput = {
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

export function createDefensiveEvent(
  input: DefensiveEventInput,
): DefensiveEvent {
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
    involvedPlayerIds:
      input.involvedPlayerIds ??
      (input.fielder ? [input.fielder.id] : []),
    outsRecorded: normalizeOutsRecorded(
      input.outsRecorded,
      input.type,
    ),
    runsAllowed: normalizeNonNegativeInteger(input.runsAllowed),
    basesAllowed: normalizeNonNegativeInteger(input.basesAllowed),
    notes: input.notes?.trim() ?? "",
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function getDefensiveSummary(
  player: Player,
  alignments: DefensiveAlignment[],
  events: DefensiveEvent[],
): DefensiveSummary {
  const inningsByPosition = getInningsByPosition(
    player.id,
    alignments,
  );
  const playerEvents = events.filter(
    (event) =>
      event.fielderId === player.id ||
      event.involvedPlayerIds.includes(player.id),
  );
  const routinePlaysMade = countEvents(
    playerEvents,
    "ROUTINE_OUT",
  );
  const greatPlays = countEvents(playerEvents, "GREAT_PLAY");
  const misplays = countEvents(playerEvents, "MISPLAY");
  const extraBasesAllowed = playerEvents.reduce(
    (total, event) => total + event.basesAllowed,
    0,
  );
  const defensiveInnings = Object.values(
    inningsByPosition,
  ).reduce((total, innings) => total + (innings ?? 0), 0);
  const defensiveChances =
    routinePlaysMade + greatPlays + misplays;

  return {
    playerId: player.id,
    inningsByPosition,
    defensiveInnings,
    defensiveChances,
    routinePlaysMade,
    greatPlays,
    misplays,
    extraBasesAllowed,
    routinePlaySuccessRate: divide(
      routinePlaysMade,
      defensiveChances,
    ),
    misplayRate: divide(misplays, defensiveChances),
    greatPlayRate: divide(greatPlays, defensiveChances),
    extraBasesAllowedPerInning: divide(
      extraBasesAllowed,
      defensiveInnings,
    ),
    bestFitLabel: getBestFitLabel(
      player,
      inningsByPosition,
      playerEvents,
    ),
    evidenceLabel: getEvidenceLabel(
      defensiveInnings,
      defensiveChances,
    ),
  };
}

function countEvents(
  events: DefensiveEvent[],
  type: DefensiveEventType,
) {
  return events.filter((event) => event.type === type).length;
}

function normalizeOutsRecorded(
  outsRecorded: number | undefined,
  eventType: DefensiveEventType,
) {
  return Math.max(
    0,
    Math.min(
      3,
      Math.floor(
        outsRecorded ?? defaultOutsByEventType[eventType] ?? 0,
      ),
    ),
  );
}

function normalizeNonNegativeInteger(value: number | undefined) {
  return Math.max(0, Math.floor(value ?? 0));
}

function getInningsByPosition(
  playerId: string,
  alignments: DefensiveAlignment[],
) {
  const inningsByPosition: Partial<
    Record<DefensivePosition, number>
  > = {};

  alignments.forEach((alignment) => {
    defensivePositions.forEach((position) => {
      if (
        isAssignedPlayerSlot(
          alignment.slots[position],
          playerId,
        )
      ) {
        inningsByPosition[position] =
          (inningsByPosition[position] ?? 0) + 1;
      }
    });
  });

  return inningsByPosition;
}

function isAssignedPlayerSlot(
  slot: DefensiveSlot | undefined,
  playerId: string,
) {
  return slot?.status === "ASSIGNED" && slot.playerId === playerId;
}

function getBestFitLabel(
  player: Player,
  inningsByPosition: Partial<
    Record<DefensivePosition, number>
  >,
  events: DefensiveEvent[],
) {
  const noteBestPosition =
    player.defensiveProfile.notes.bestPosition.trim();

  if (noteBestPosition) {
    return noteBestPosition;
  }

  const mostPlayedPosition = Object.entries(inningsByPosition).sort(
    ([, firstInnings], [, secondInnings]) =>
      (secondInnings ?? 0) - (firstInnings ?? 0),
  )[0]?.[0] as DefensivePosition | undefined;

  if (mostPlayedPosition) {
    return defensivePositionLabels[mostPlayedPosition];
  }

  return getEvidenceBasedFitLabel(player, events);
}

function getEvidenceBasedFitLabel(
  player: Player,
  events: DefensiveEvent[],
) {
  const ratings = player.defensiveProfile.ratings;

  if (
    ratings.range === "High" &&
    ratings.armStrength === "High"
  ) {
    return "Outfield fit";
  }

  if (
    ratings.gloveSkill === "High" &&
    ratings.throwAccuracy === "High"
  ) {
    return "Infield fit";
  }

  if (events.some((event) => event.type === "GREAT_PLAY")) {
    return "Reliable defender";
  }

  return "Needs more defense data";
}

function getEvidenceLabel(
  defensiveInnings: number,
  defensiveChances: number,
) {
  if (defensiveInnings >= 6 && defensiveChances >= 5) {
    return "Based on game data";
  }

  if (defensiveInnings > 0 || defensiveChances > 0) {
    return "Small sample";
  }

  return "Based on profile";
}

const defaultOutsByEventType: Partial<
  Record<DefensiveEventType, number>
> = {
  ROUTINE_OUT: 1,
  GREAT_PLAY: 1,
  DOUBLE_PLAY: 2,
};

function divide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

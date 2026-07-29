import type { DefensiveAlignment, DefensiveEvent } from "@/types/defense";
import type { DefensiveEventInput } from "@/types/game";
import {
  createDefaultDefensiveAlignment,
  createDefensiveEvent,
  generateDefensiveAlignment,
  getAlignmentForCurrentHalf,
  getAssignedPlayerIdForPosition,
  getDefensiveAlignmentIssues,
  upsertDefensiveAlignment,
} from "./defenseEngine.ts";
import type {
  DefensiveEventPreview,
  GameState,
} from "./gameEngine.ts";
import { snapshotState } from "./gameStateSnapshots.ts";

export function getDefensiveAlignmentForHalf(
  state: GameState,
  inning: number,
  half: GameState["half"],
) {
  return getAlignmentForCurrentHalf(state.defensiveAlignments, inning, half);
}

export function getOrCreateDefensiveAlignmentForHalf(
  state: GameState,
  inning: number,
  half: GameState["half"],
): DefensiveAlignment {
  const currentAlignment = getDefensiveAlignmentForHalf(state, inning, half);

  if (currentAlignment) {
    return currentAlignment;
  }

  return generateDefensiveAlignment({
    players: state.lineup,
    priorAlignments: state.defensiveAlignments,
    inning,
    half,
    lockedPitcherPlayerId: state.lockedPitcherPlayerId,
  });
}

export function initializeStartingDefense(
  state: GameState,
  alignment?: DefensiveAlignment,
): GameState {
  const startingAlignment = alignment ?? createDefaultDefensiveAlignment(
    state.lineup,
    state.inning,
    state.half,
  );
  const lockedPitcherPlayerId = getAssignedPlayerIdForPosition(startingAlignment, "P");
  const issues = getDefensiveAlignmentIssues(
    startingAlignment,
    state.lineup,
    lockedPitcherPlayerId,
  );

  if (issues.length > 0) {
    return {
      ...state,
      status: "PREGAME",
      lockedPitcherPlayerId: null,
    };
  }

  return {
    ...state,
    lockedPitcherPlayerId,
    defensiveAlignments: upsertDefensiveAlignment(state.defensiveAlignments, startingAlignment),
  };
}

export function saveDefensiveAlignment(
  state: GameState,
  alignment: DefensiveAlignment,
): GameState {
  if (state.status === "FINAL") {
    return state;
  }

  const issues = getDefensiveAlignmentIssues(
    alignment,
    state.lineup,
    state.lockedPitcherPlayerId,
  );

  if (issues.length > 0) {
    return state;
  }

  return {
    ...state,
    defensiveAlignments: upsertDefensiveAlignment(state.defensiveAlignments, alignment),
  };
}

export function previewDefensiveEvent(
  state: GameState,
  input: DefensiveEventInput,
): DefensiveEventPreview {
  const fielder = input.fielderId
    ? state.lineup.find((player) => player.id === input.fielderId)
    : null;
  const event = createDefensiveEvent({
    id: `defense-event-${state.defensiveEvents.length + 1}`,
    inning: state.inning,
    half: state.half,
    type: input.type,
    fielder,
    position: input.position,
    outsRecorded: input.outsRecorded,
    runsAllowed: input.runsAllowed,
    basesAllowed: input.basesAllowed,
    ballType: input.ballType,
    misplayType: input.misplayType,
    misplayResult: input.misplayResult,
    greatPlayImpact: input.greatPlayImpact,
    involvedPlayerIds: input.involvedPlayerIds,
    notes: input.notes,
  });
  const projectedOuts = Math.min(3, state.outs + event.outsRecorded);
  const inningEnded = state.outs + event.outsRecorded >= 3;
  const nextHalfInning = inningEnded
    ? getNextHalfInning(state.inning, state.half)
    : state;

  return {
    event,
    projectedOuts,
    inningEnded,
    nextInning: nextHalfInning.inning,
    nextHalf: nextHalfInning.half,
    summary: buildDefensiveSummary(event, state.outs, projectedOuts),
  };
}

export function saveDefensiveEvent(
  state: GameState,
  input: DefensiveEventInput,
): GameState {
  if (state.status === "FINAL") {
    return state;
  }

  const preview = previewDefensiveEvent(state, input);

  return {
    ...state,
    inning: preview.nextInning,
    half: preview.nextHalf,
    outs: preview.inningEnded ? 0 : preview.projectedOuts,
    opponentScore: state.opponentScore + preview.event.runsAllowed,
    bases: preview.inningEnded ? createEmptyBases() : state.bases,
    defensiveEvents: [...state.defensiveEvents, preview.event],
    history: [...state.history, snapshotState(state)],
    lastSummary: preview.summary,
  };
}

function getNextHalfInning(
  inning: number,
  half: GameState["half"],
): Pick<GameState, "inning" | "half"> {
  return half === "Top"
    ? { inning, half: "Bottom" }
    : { inning: inning + 1, half: "Top" };
}

function createEmptyBases() {
  return {
    first: null,
    second: null,
    third: null,
  };
}

function buildDefensiveSummary(
  event: DefensiveEvent,
  outsBefore: number,
  outsAfter: number,
) {
  const fielder = event.fielderName ? `${event.fielderName}: ` : "";
  const runsLine = event.runsAllowed > 0
    ? `Runs allowed +${event.runsAllowed}`
    : "No runs allowed";
  const basesLine = event.basesAllowed > 0
    ? `Extra bases +${event.basesAllowed}`
    : "No extra bases";

  return [
    `${fielder}${event.type.replaceAll("_", " ")}`,
    `Outs ${outsBefore} to ${outsAfter}`,
    runsLine,
    basesLine,
  ].join(". ");
}

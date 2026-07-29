import { buildFullGameDefensiveLineupPlan } from "@/lib/defensiveLineupPlanner";
import {
  createDefaultDefensiveAlignment,
  getDefensiveAlignmentIssues,
  getFirstDefensiveHalf,
} from "@/lib/defenseEngine";
import type { RecommendedLineupRow } from "@/lib/lineupRules";
import type { PregameSetup } from "@/lib/pregameSetupStorage";
import type { DefensiveAlignment } from "@/types/defense";
import type { Player } from "@/types/player";

export function getDefenseAlignment(
  currentDraftStartingDefense: DefensiveAlignment | null,
  savedDefenseAlignment: DefensiveAlignment | null,
) {
  return currentDraftStartingDefense ?? savedDefenseAlignment;
}

export function getDefenseIssues(
  defenseAlignment: DefensiveAlignment | null,
  lineupPlayers: Player[],
) {
  return defenseAlignment
    ? getDefensiveAlignmentIssues(defenseAlignment, lineupPlayers)
    : [];
}

export function getFullGameDefenseEmptyReason(defenseIssues: unknown[]) {
  return defenseIssues.length
    ? "Fix the starting defense to build the full-game grid."
    : "Generate a batting order to build the defensive grid.";
}

export function resolveStartingDefenseAlignment(
  lineupPlayers: RecommendedLineupRow["player"][],
  startingDefense: DefensiveAlignment | null,
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
) {
  if (!lineupPlayers.length) {
    return null;
  }

  return canReuseStartingDefense(
    startingDefense,
    lineupPlayers,
    firstDefensiveHalf,
  )
    ? startingDefense
    : createDefaultDefensiveAlignment(
        lineupPlayers,
        firstDefensiveHalf.inning,
        firstDefensiveHalf.half,
      );
}

function canReuseStartingDefense(
  startingDefense: DefensiveAlignment | null,
  lineupPlayers: RecommendedLineupRow["player"][],
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
) {
  if (!startingDefense) {
    return false;
  }

  if (
    startingDefense.inning !== firstDefensiveHalf.inning ||
    startingDefense.half !== firstDefensiveHalf.half
  ) {
    return false;
  }

  const activeLineupIds = new Set(
    lineupPlayers.map((player) => player.id),
  );
  return Object.values(startingDefense.slots).every(
    (slot) =>
      !slot ||
      slot.status === "VACANT" ||
      activeLineupIds.has(slot.playerId),
  );
}

export function getDefenseDraftKey(
  setup: PregameSetup,
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
  lineupPlayers: Player[],
) {
  return [
    setup.gameId ?? "unscheduled",
    firstDefensiveHalf.inning,
    firstDefensiveHalf.half,
    lineupPlayers.map((player) => player.id).join("|"),
  ].join("|");
}

export function getCurrentDraftStartingDefense(
  draftStartingDefense: {
    key: string;
    alignment: DefensiveAlignment;
  } | null,
  defenseDraftKey: string,
) {
  return draftStartingDefense?.key === defenseDraftKey
    ? draftStartingDefense.alignment
    : null;
}

export function getFullGameDefensePlan(
  lineupPlayers: Player[],
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
  defenseAlignment: DefensiveAlignment | null,
  defenseIssues: unknown[],
) {
  if (!defenseAlignment || defenseIssues.length) {
    return null;
  }

  return buildFullGameDefensiveLineupPlan({
    players: lineupPlayers,
    firstInning: firstDefensiveHalf.inning,
    half: firstDefensiveHalf.half,
    startingAlignment: defenseAlignment,
  });
}

export function getDefenseStatusLabel(
  canStartGame: boolean,
  defenseIssues: unknown[],
  startingDefenseSaved: boolean,
) {
  if (canStartGame) {
    return "Ready";
  }

  if (defenseIssues.length) {
    return "Fix defense";
  }

  return startingDefenseSaved ? "Saved" : "Save defense";
}

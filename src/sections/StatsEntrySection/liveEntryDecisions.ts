import {
  getPlayValidationError,
  occupiedBaseEntries,
  previewPlay,
  runnerSlotFromPlayer,
  type GameState,
  type MovementSelections,
  type PinchRunnerSelections,
} from "@/lib/gameEngine";
import type { BatterResult, OutType, ScoredPlay } from "@/types/game";
import type { Player } from "@/types/player";
import type { BaseLabel, UiRunnerDestination } from "@/types/runner";

export type PlayPreviewDetails = {
  hasRuns: boolean;
  outs: number;
  rbis: number;
  runs: number;
  summary: string;
};

export function getLastResultByBatter(plays: ScoredPlay[]) {
  const results = new Map<string, BatterResult>();

  plays.forEach((play) => {
    results.set(play.batterId, play.result);
  });

  return results;
}

export function getPreviewDetails(
  preview: ReturnType<typeof previewPlay> | null,
  currentOuts: number,
): PlayPreviewDetails {
  if (!preview) {
    return {
      hasRuns: false,
      outs: currentOuts,
      rbis: 0,
      runs: 0,
      summary: "Tap a batter result to preview runner movement, runs, outs, and RBI.",
    };
  }

  return {
    hasRuns: preview.runs > 0,
    outs: preview.projectedOuts,
    rbis: preview.rbis,
    runs: preview.runs,
    summary: preview.summary,
  };
}

export function getCurrentPlayValidationError(
  scoringState: GameState,
  selectedResult: BatterResult | null,
  effectiveMovements: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  selectedOutType: OutType | undefined,
) {
  return selectedResult
    ? getPlayValidationError(scoringState, selectedResult, effectiveMovements, pinchRunners, selectedOutType)
    : null;
}

export function getPinchRunnerOptions(
  lineup: Player[],
  batter: Player,
  occupiedBases: ReturnType<typeof occupiedBaseEntries>,
  pinchRunners: PinchRunnerSelections,
) {
  const occupiedIds = new Set(occupiedBases.map(([, runner]) => runner.playerId));
  const selectedPinchRunnerIds = new Set(Object.values(pinchRunners).map((runner) => runner.playerId));

  return lineup.filter((player) => (
    player.id !== batter.id
      && !occupiedIds.has(player.id)
      && !selectedPinchRunnerIds.has(player.id)
  ));
}

export function getSavableResult(
  selectedResult: BatterResult | null,
  selectedOutType: OutType | undefined,
  playValidationError: string | null,
) {
  if (!selectedResult || playValidationError) {
    return null;
  }

  return selectedResult === "Out" && !selectedOutType
    ? "NEEDS_OUT_TYPE" as const
    : selectedResult;
}

export function removePinchRunner(current: PinchRunnerSelections, base: BaseLabel) {
  const next = { ...current };
  delete next[base];
  return next;
}

export function addPinchRunner(
  current: PinchRunnerSelections,
  pinchBase: BaseLabel | null,
  player: Player,
  bases: GameState["bases"],
) {
  if (!pinchBase) {
    return current;
  }

  const originalRunner = bases[baseToKey(pinchBase)];

  return {
    ...current,
    [pinchBase]: {
      ...runnerSlotFromPlayer(player),
      originalPlayerId: originalRunner?.playerId,
      originalName: originalRunner?.name,
    },
  };
}

export function movementSelectionsFromPlay(play: ScoredPlay): MovementSelections {
  const selections: MovementSelections = {};

  for (const movement of play.runnerAdvancements) {
    if (movement.fromBase === "BATTER") {
      continue;
    }

    selections[movement.fromBase] = movementSelectionByDestination[movement.toBase];
  }

  return selections;
}

export function pinchRunnerSelectionsFromPlay(play: ScoredPlay): PinchRunnerSelections {
  const selections: PinchRunnerSelections = {};

  for (const movement of play.runnerAdvancements) {
    if (movement.fromBase === "BATTER" || !movement.originalPlayerId) {
      continue;
    }

    selections[movement.fromBase] = {
      playerId: movement.playerId,
      name: movement.playerName,
      originalPlayerId: movement.originalPlayerId,
      originalName: movement.originalPlayerName,
    };
  }

  return selections;
}

function baseToKey(base: BaseLabel) {
  if (base === "1B") return "first";
  if (base === "2B") return "second";
  return "third";
}

const movementSelectionByDestination: Record<
  ScoredPlay["runnerAdvancements"][number]["toBase"],
  UiRunnerDestination
> = {
  "1B": "1B",
  "2B": "2B",
  "3B": "3B",
  HOME: "Scores",
  OUT: "Out",
};

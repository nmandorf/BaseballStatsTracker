import type { BatterResult, OutType } from "@/types/game";
import type {
  BaseLabel,
  RunnerDestination,
  RunnerSlot,
} from "@/types/runner";
import type { Player } from "@/types/player";
import type { GameState } from "./gameEngine.ts";
import {
  getResultLockReason,
  occupiedBaseEntries,
  type MovementSelections,
  type PinchRunnerSelections,
} from "./gamePlayRules.ts";
import {
  getBatterDestination,
  getBatterOuts,
  toRunnerDestination,
} from "./gameMovementRules.ts";

export class InvalidPlayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlayError";
  }
}

export function assertValidOutType(result: BatterResult, outType: OutType | undefined) {
  if (result === "Out" && !outType) {
    throw new Error("Out type is required for normal outs.");
  }
}

export function assertValidPlay(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  outType: OutType | undefined,
) {
  const validationError = getPlayValidationError(state, result, selections, pinchRunners, outType);

  if (validationError) {
    throw new InvalidPlayError(validationError);
  }
}

export function getPlayValidationError(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
  pinchRunners: PinchRunnerSelections,
  outType?: OutType,
) {
  return firstValidationError([
    getResultLockReason(result, state.bases, state.outs),
    getOutTypeValidationError(result, outType),
    getPinchRunnerValidationError(state, pinchRunners),
    getRunnerDestinationValidationError(state, result, selections),
    getOutCountValidationError(state, result, selections),
  ]);
}

function firstValidationError(errors: Array<string | null | undefined>) {
  return errors.find(Boolean) ?? null;
}

function getOutTypeValidationError(result: BatterResult, outType: OutType | undefined) {
  return result === "Out" && !outType ? "Out type is required for normal outs." : null;
}

function getRunnerDestinationValidationError(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
) {
  const occupiedDestinations = new Map<BaseLabel, string>();

  for (const [base, runner] of occupiedBaseEntries(state.bases)) {
    const destination = toRunnerDestination(selections[base] ?? base);
    const destinationError = addOccupiedDestination(occupiedDestinations, runner.name, destination);

    if (destinationError) {
      return destinationError;
    }
  }

  return getBatterDestinationValidationError(state, result, occupiedDestinations);
}

function addOccupiedDestination(
  occupiedDestinations: Map<BaseLabel, string>,
  runnerName: string,
  destination: RunnerDestination,
) {
  if (!isBaseDestination(destination)) {
    return null;
  }

  const occupyingRunner = occupiedDestinations.get(destination);

  if (occupyingRunner) {
    return `${runnerName} and ${occupyingRunner} cannot both end at ${destination}.`;
  }

  occupiedDestinations.set(destination, runnerName);
  return null;
}

function isBaseDestination(destination: RunnerDestination): destination is BaseLabel {
  return baseDestinationValues.has(destination);
}

const baseDestinationValues = new Set<RunnerDestination>(["1B", "2B", "3B"]);

function getBatterDestinationValidationError(
  state: GameState,
  result: BatterResult,
  occupiedDestinations: Map<BaseLabel, string>,
) {
  const batterDestination = getBatterDestination(result);

  if (!isBaseDestination(batterDestination)) {
    return null;
  }

  const occupyingRunner = occupiedDestinations.get(batterDestination);
  return occupyingRunner
    ? `${getCurrentBatter(state).name} and ${occupyingRunner} cannot both end at ${batterDestination}.`
    : null;
}

function getOutCountValidationError(
  state: GameState,
  result: BatterResult,
  selections: MovementSelections,
) {
  const outsOnPlay = getRunnerOutCount(state, selections) + getBatterOuts(result);
  return state.outs + outsOnPlay > 3
    ? "Play cannot record more than three outs in the inning."
    : null;
}

function getRunnerOutCount(state: GameState, selections: MovementSelections) {
  return occupiedBaseEntries(state.bases).filter(([base]) => (
    toRunnerDestination(selections[base] ?? base) === "OUT"
  )).length;
}

function getPinchRunnerValidationError(state: GameState, pinchRunners: PinchRunnerSelections) {
  const occupiedPlayerIds = new Set(occupiedBaseEntries(state.bases).map(([, runner]) => runner.playerId));
  const selectedPinchRunnerIds = new Set<string>();
  const batter = getCurrentBatter(state);

  for (const pinchRunner of Object.values(pinchRunners).filter(isRunnerSlot)) {
    const validationError = validatePinchRunner(
      pinchRunner,
      batter,
      occupiedPlayerIds,
      selectedPinchRunnerIds,
    );

    if (validationError) {
      return validationError;
    }

    selectedPinchRunnerIds.add(pinchRunner.playerId);
  }

  return null;
}

function isRunnerSlot(runner: RunnerSlot | undefined): runner is RunnerSlot {
  return Boolean(runner);
}

function validatePinchRunner(
  pinchRunner: RunnerSlot,
  batter: Player,
  occupiedPlayerIds: Set<string>,
  selectedPinchRunnerIds: Set<string>,
) {
  return firstValidationError([
    pinchRunner.playerId === batter.id ? "The current batter cannot also be a pinch runner." : null,
    occupiedPlayerIds.has(pinchRunner.playerId) ? `${pinchRunner.name} is already on base.` : null,
    selectedPinchRunnerIds.has(pinchRunner.playerId)
      ? `${pinchRunner.name} cannot pinch run for multiple runners on the same play.`
      : null,
  ]);
}

function getCurrentBatter(state: GameState) {
  return state.lineup[state.currentBatterIndex];
}

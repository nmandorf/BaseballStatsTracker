import type { BatterResult } from "@/types/game";
import type {
  BaseLabel,
  BasesState,
  RunnerSlot,
  UiRunnerDestination,
} from "@/types/runner";

export const batterResults: BatterResult[] = [
  "1B",
  "2B",
  "3B",
  "HR",
  "BB",
  "ROE",
  "FC",
  "SF",
  "Out",
  "DP",
];

export const destinationOptions: Record<BaseLabel, UiRunnerDestination[]> = {
  "1B": ["1B", "2B", "3B", "Scores", "Out"],
  "2B": ["2B", "3B", "Scores", "Out"],
  "3B": ["3B", "Scores", "Out"],
};

export const destinationLabel: Record<UiRunnerDestination, string> = {
  "1B": "Stays at 1B",
  "2B": "To 2B",
  "3B": "To 3B",
  Scores: "Scores",
  Out: "Out",
};

export type MovementSelections = Partial<
  Record<BaseLabel, UiRunnerDestination>
>;
export type PinchRunnerSelections = Partial<Record<BaseLabel, RunnerSlot>>;

type OccupiedBaseFlags = {
  hasFirst: boolean;
  hasSecond: boolean;
  hasThird: boolean;
};

export function occupiedBaseEntries(
  bases: BasesState,
): Array<readonly [BaseLabel, RunnerSlot]> {
  return [
    ["1B", bases.first] as const,
    ["2B", bases.second] as const,
    ["3B", bases.third] as const,
  ].filter(
    (entry): entry is readonly [BaseLabel, RunnerSlot] => Boolean(entry[1]),
  );
}

export function getResultLockReason(
  result: BatterResult,
  bases: BasesState,
  outs: number,
): string | null {
  return resultLockChecks[result]?.(bases, outs) ?? null;
}

type ResultLockCheck = (bases: BasesState, outs: number) => string | null;

const resultLockChecks: Partial<Record<BatterResult, ResultLockCheck>> = {
  SF: getSacFlyLockReason,
  DP: getDoublePlayLockReason,
  FC: getFieldersChoiceLockReason,
};

function getSacFlyLockReason(bases: BasesState, outs: number) {
  if (!bases.third) return "Sac fly needs a runner on 3B";
  if (outs >= 2) return "Sac fly needs fewer than 2 outs";
  return null;
}

function getDoublePlayLockReason(bases: BasesState, outs: number) {
  if (!hasAnyRunner(bases)) return "Double play needs a runner on base";
  if (outs >= 2) return "Double play needs fewer than 2 outs";
  return null;
}

function getFieldersChoiceLockReason(bases: BasesState) {
  return hasAnyRunner(bases)
    ? null
    : "Fielder's choice needs a runner on base";
}

function hasAnyRunner(bases: BasesState) {
  return Boolean(bases.first || bases.second || bases.third);
}

export function createDefaultMovements(
  result: BatterResult,
  bases: BasesState,
): MovementSelections {
  const occupiedBases = getOccupiedBaseFlags(bases);
  const movements = createStationaryMovements(occupiedBases);

  defaultMovementAppliers[result]?.(occupiedBases, movements);

  return movements;
}

function getOccupiedBaseFlags(bases: BasesState): OccupiedBaseFlags {
  return {
    hasFirst: Boolean(bases.first),
    hasSecond: Boolean(bases.second),
    hasThird: Boolean(bases.third),
  };
}

function createStationaryMovements(
  occupiedBases: OccupiedBaseFlags,
): MovementSelections {
  const movements: MovementSelections = {};

  if (occupiedBases.hasFirst) movements["1B"] = "1B";
  if (occupiedBases.hasSecond) movements["2B"] = "2B";
  if (occupiedBases.hasThird) movements["3B"] = "3B";

  return movements;
}

const defaultMovementAppliers: Partial<
  Record<
    BatterResult,
    (
      occupiedBases: OccupiedBaseFlags,
      movements: MovementSelections,
    ) => void
  >
> = {
  "1B": applySingleMovement,
  "2B": applyDoubleMovement,
  "3B": scoreAllOccupiedRunners,
  HR: scoreAllOccupiedRunners,
  BB: applyWalkMovement,
  ROE: applyReachedOnErrorMovement,
  FC: applyFieldersChoiceMovement,
  SF: applySacFlyMovement,
  DP: applyDoublePlayMovement,
};

function applySingleMovement(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (occupiedBases.hasFirst) movements["1B"] = "2B";
  if (occupiedBases.hasSecond) movements["2B"] = "Scores";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyDoubleMovement(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (occupiedBases.hasFirst) movements["1B"] = "3B";
  if (occupiedBases.hasSecond) movements["2B"] = "Scores";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function scoreAllOccupiedRunners(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (occupiedBases.hasFirst) movements["1B"] = "Scores";
  if (occupiedBases.hasSecond) movements["2B"] = "Scores";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyWalkMovement(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (!occupiedBases.hasFirst) {
    return;
  }

  movements["1B"] = "2B";
  applyForcedWalkFromSecond(occupiedBases, movements);
}

function applyForcedWalkFromSecond(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (!occupiedBases.hasSecond) {
    return;
  }

  movements["2B"] = "3B";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyReachedOnErrorMovement(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (occupiedBases.hasFirst) movements["1B"] = "2B";
  if (occupiedBases.hasSecond) movements["2B"] = "3B";
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyFieldersChoiceMovement(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (areBasesLoaded(occupiedBases)) {
    movements["3B"] = "Out";
    movements["2B"] = "3B";
    movements["1B"] = "2B";
    return;
  }

  if (!occupiedBases.hasFirst) {
    return;
  }

  movements["1B"] = "Out";
  if (occupiedBases.hasSecond) movements["2B"] = "3B";
  if (occupiedBases.hasThird) movements["3B"] = "3B";
}

function areBasesLoaded(occupiedBases: OccupiedBaseFlags) {
  return (
    occupiedBases.hasFirst &&
    occupiedBases.hasSecond &&
    occupiedBases.hasThird
  );
}

function applySacFlyMovement(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (occupiedBases.hasThird) movements["3B"] = "Scores";
}

function applyDoublePlayMovement(
  occupiedBases: OccupiedBaseFlags,
  movements: MovementSelections,
) {
  if (occupiedBases.hasFirst) {
    movements["1B"] = "Out";
    return;
  }

  if (occupiedBases.hasSecond) {
    movements["2B"] = "Out";
    return;
  }

  if (occupiedBases.hasThird) movements["3B"] = "Out";
}

export function defaultRbiCredit(
  result: BatterResult,
  bases: BasesState,
  runsScored: number,
) {
  if (runsScored <= 0) {
    return false;
  }

  const basesLoaded = Boolean(bases.first && bases.second && bases.third);
  return result === "BB"
    ? basesLoaded
    : defaultRbiCreditByResult[result];
}

const defaultRbiCreditByResult: Record<BatterResult, boolean> = {
  "1B": true,
  "2B": true,
  "3B": true,
  HR: true,
  BB: false,
  ROE: false,
  FC: false,
  SF: true,
  Out: false,
  DP: false,
};

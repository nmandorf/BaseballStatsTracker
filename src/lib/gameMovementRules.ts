import type { BatterResult } from "@/types/game";
import type {
  BaseLabel,
  RunnerDestination,
  RunnerMovement,
  UiRunnerDestination,
} from "@/types/runner";

export function getBatterDestination(result: BatterResult): RunnerDestination {
  const destinations: Record<BatterResult, RunnerDestination> = {
    "1B": "1B",
    "2B": "2B",
    "3B": "3B",
    HR: "HOME",
    BB: "1B",
    ROE: "1B",
    FC: "1B",
    SF: "OUT",
    Out: "OUT",
    DP: "OUT",
  };

  return destinations[result];
}

export function getBatterOuts(result: BatterResult) {
  return result === "DP" ? 1 : result === "Out" || result === "SF" ? 1 : 0;
}

export function getAdvanceReason(result: BatterResult): RunnerMovement["reason"] {
  const reasons: Record<BatterResult, RunnerMovement["reason"]> = {
    "1B": "Hit",
    "2B": "Hit",
    "3B": "Hit",
    HR: "Hit",
    BB: "Walk",
    ROE: "Error",
    FC: "Fielder's Choice",
    SF: "Sac Fly",
    Out: "Out",
    DP: "Out",
  };

  return reasons[result];
}

export function getAdvancedBases(
  fromBase: BaseLabel | "BATTER",
  destination: RunnerDestination,
) {
  if (destination === "OUT") {
    return 0;
  }

  const fromNumber = fromBase === "BATTER" ? 0 : baseNumber(fromBase);
  const toNumber = destination === "HOME" ? 4 : baseNumber(destination);
  return Math.max(0, toNumber - fromNumber);
}

export function toRunnerDestination(destination: UiRunnerDestination): RunnerDestination {
  if (destination === "Scores") {
    return "HOME";
  }

  if (destination === "Out") {
    return "OUT";
  }

  return destination;
}

function baseNumber(base: BaseLabel) {
  return Number(base[0]);
}

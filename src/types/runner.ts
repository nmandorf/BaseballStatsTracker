export type BaseLabel = "1B" | "2B" | "3B";
export type BaseKey = "first" | "second" | "third";
export type RunnerDestination = BaseLabel | "HOME" | "OUT";
export type UiRunnerDestination = BaseLabel | "Scores" | "Out";

export type RunnerSlot = {
  playerId: string;
  name: string;
  originalPlayerId?: string;
  originalName?: string;
};

export type BasesState = Record<BaseKey, RunnerSlot | null>;

export type RunnerMovement = {
  playerId: string;
  playerName: string;
  originalPlayerId?: string;
  originalPlayerName?: string;
  fromBase: BaseLabel | "BATTER";
  toBase: RunnerDestination;
  advancedBases: number;
  scored: boolean;
  out: boolean;
  rbiCredited: boolean;
  reason: "Hit" | "Walk" | "Error" | "Fielder's Choice" | "Sac Fly" | "Out" | "Runner Decision";
};

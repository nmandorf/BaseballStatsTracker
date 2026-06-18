import type { BasesState, RunnerMovement } from "@/types/runner";
import type { DefensiveAlignment, DefensiveEvent } from "@/types/defense";

export type BatterResult = "1B" | "2B" | "3B" | "HR" | "BB" | "ROE" | "FC" | "SF" | "Out" | "DP";
export type OutType =
  | "GROUNDOUT"
  | "FLYOUT"
  | "LINEOUT"
  | "STRIKEOUT_LOOKING"
  | "STRIKEOUT_SWINGING"
  | "OTHER_OUT";
export type LocalGameStatus = "PREGAME" | "IN_PROGRESS" | "FINAL";

export type GameRules = {
  homeRunLimitEnabled: boolean;
  homeRunLimit: number;
  afterHomeRunLimit: "Out" | "Single" | "Other";
  runLimitPerInning: number | null;
  mercyRule: string;
  courtesyRunnersAllowed: boolean;
  walksAllowed: boolean;
  sacFliesTracked: boolean;
  errorsTracked: boolean;
  fieldersChoicesTracked: boolean;
};

export type ScoredPlay = {
  id: string;
  inning: number;
  half?: "Top" | "Bottom";
  batterId: string;
  batterName: string;
  outsBefore: number;
  basesBefore: BasesState;
  result: BatterResult;
  outType?: OutType;
  runnerAdvancements: RunnerMovement[];
  runsScored: number;
  rbis: number;
  outsOnPlay: number;
  basesAfter: BasesState;
  summary: string;
};

export type DefensiveEventInput = {
  type: DefensiveEvent["type"];
  fielderId?: string;
  position?: DefensiveEvent["position"];
  outsRecorded?: number;
  runsAllowed?: number;
  basesAllowed?: number;
  ballType?: DefensiveEvent["ballType"];
  misplayType?: DefensiveEvent["misplayType"];
  misplayResult?: DefensiveEvent["misplayResult"];
  greatPlayImpact?: DefensiveEvent["greatPlayImpact"];
  involvedPlayerIds?: string[];
  notes?: string;
};

export type DefensiveGameState = {
  defensiveAlignments: DefensiveAlignment[];
  defensiveEvents: DefensiveEvent[];
};

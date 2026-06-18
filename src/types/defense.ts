export type InningHalf = "Top" | "Bottom";

export type DefensivePosition =
  | "P"
  | "C"
  | "1B"
  | "2B"
  | "SS"
  | "3B"
  | "LF"
  | "LC"
  | "RC"
  | "RF"
  | "ROVER";

export type DefensiveSlot =
  | {
      status: "ASSIGNED";
      playerId: string;
      playerName: string;
    }
  | {
      status: "VACANT";
    };

export type DefensiveAlignment = {
  id: string;
  inning: number;
  half: InningHalf;
  roverEnabled: boolean;
  slots: Partial<Record<DefensivePosition, DefensiveSlot>>;
  benchPlayerIds: string[];
  updatedAt: string;
};

export type BallType =
  | "Ground ball"
  | "Fly ball"
  | "Line drive"
  | "Pop up"
  | "Short fly"
  | "Hard hit ball"
  | "Weak hit ball";

export type MisplayType =
  | "Fielding mistake"
  | "Throwing mistake"
  | "Catching mistake"
  | "Missed fly ball"
  | "Bad decision"
  | "Did not cover base"
  | "Did not back up play";

export type MisplayResult =
  | "Batter reached base"
  | "Runner advanced"
  | "Run scored"
  | "Extra base allowed"
  | "Out missed";

export type GreatPlayImpact =
  | "Saved an out"
  | "Saved a run"
  | "Prevented extra base"
  | "Ended inning"
  | "Double play started";

export type DefensiveEventType =
  | "ROUTINE_OUT"
  | "HIT_NO_PLAY"
  | "MISPLAY"
  | "GREAT_PLAY"
  | "EXTRA_BASES_ALLOWED"
  | "DOUBLE_PLAY";

export type DefensiveEvent = {
  id: string;
  inning: number;
  half: InningHalf;
  type: DefensiveEventType;
  fielderId?: string;
  fielderName?: string;
  position?: DefensivePosition;
  ballType?: BallType;
  misplayType?: MisplayType;
  misplayResult?: MisplayResult;
  greatPlayImpact?: GreatPlayImpact;
  involvedPlayerIds: string[];
  outsRecorded: number;
  runsAllowed: number;
  basesAllowed: number;
  notes: string;
  createdAt: string;
};

export type DefensiveRatingValue = "Low" | "Medium" | "High" | "Unknown";

export type DefensiveRatings = {
  armStrength: DefensiveRatingValue;
  throwAccuracy: DefensiveRatingValue;
  gloveSkill: DefensiveRatingValue;
  range: DefensiveRatingValue;
  positionConfidence: DefensiveRatingValue;
};

export type DefensiveNotes = {
  strengths: string;
  weaknesses: string;
  bestPosition: string;
  avoidPosition: string;
  backupPosition: string;
  communication: string;
  health: string;
};

export type DefensiveProfile = {
  ratings: DefensiveRatings;
  notes: DefensiveNotes;
};

export type DefensiveSummary = {
  playerId: string;
  inningsByPosition: Partial<Record<DefensivePosition, number>>;
  defensiveInnings: number;
  defensiveChances: number;
  routinePlaysMade: number;
  greatPlays: number;
  misplays: number;
  extraBasesAllowed: number;
  routinePlaySuccessRate: number;
  misplayRate: number;
  greatPlayRate: number;
  extraBasesAllowedPerInning: number;
  bestFitLabel: string;
  evidenceLabel: string;
};

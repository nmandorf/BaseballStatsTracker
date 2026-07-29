import type {
  DefensiveEventType,
  DefensivePosition,
} from "@/types/defense";

export const minimumFemaleDefenders = 3;

export const defensivePositions: DefensivePosition[] = [
  "P",
  "C",
  "1B",
  "2B",
  "SS",
  "3B",
  "LF",
  "LC",
  "RC",
  "RF",
];

export const defensivePositionLabels: Record<
  DefensivePosition,
  string
> = {
  P: "Pitcher",
  C: "Catcher",
  "1B": "First Base",
  "2B": "Second Base",
  SS: "Shortstop",
  "3B": "Third Base",
  LF: "Left Field",
  LC: "Left Center",
  RC: "Right Center",
  RF: "Right Field",
};

export const defensiveEventLabels: Record<
  DefensiveEventType,
  string
> = {
  ROUTINE_OUT: "Routine Out",
  HIT_NO_PLAY: "Hit / No Play",
  MISPLAY: "Misplay",
  GREAT_PLAY: "Great Play",
  EXTRA_BASES_ALLOWED: "Extra Bases",
  DOUBLE_PLAY: "Double Play",
};

export function normalizeDefensivePosition(
  value: string | null | undefined,
): DefensivePosition | null {
  const normalizedValue =
    value?.trim().toUpperCase().replaceAll(/[^A-Z0-9]/g, "") ?? "";

  return defensivePositionAliases[normalizedValue] ?? null;
}

const defensivePositionAliases: Record<
  string,
  DefensivePosition
> = {
  P: "P",
  PITCHER: "P",
  C: "C",
  CATCHER: "C",
  "1B": "1B",
  FIRST: "1B",
  FIRSTBASE: "1B",
  "2B": "2B",
  SECOND: "2B",
  SECONDBASE: "2B",
  SS: "SS",
  SHORT: "SS",
  SHORTSTOP: "SS",
  "3B": "3B",
  THIRD: "3B",
  THIRDBASE: "3B",
  LF: "LF",
  LEFTFIELD: "LF",
  CF: "LC",
  CENTER: "LC",
  CENTERFIELD: "LC",
  LC: "LC",
  LCF: "LC",
  LEFTCENTER: "LC",
  LEFTCENTERFIELD: "LC",
  RC: "RC",
  RCF: "RC",
  RIGHTCENTER: "RC",
  RIGHTCENTERFIELD: "RC",
  RF: "RF",
  RIGHTFIELD: "RF",
};

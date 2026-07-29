import { GamePreparationStatus as PrismaGamePreparationStatus } from "@/generated/prisma/enums";
import { normalizeGameRules } from "@/lib/gameRules";
import type { DefensiveAlignment, DefensivePosition } from "@/types/defense";
import type { GameRules } from "@/types/game";
import type { GamePreparationInput } from "./gamePreparationBackend.ts";

export function mapPreparationStatus(status: GamePreparationInput["status"]) {
  if (status === "GENERATED") {
    return PrismaGamePreparationStatus.GENERATED;
  }

  if (status === "ACCEPTED") {
    return PrismaGamePreparationStatus.ACCEPTED;
  }

  return PrismaGamePreparationStatus.SETUP;
}

export function toRuleData(rules: GameRules) {
  return {
    homeRunLimitEnabled: rules.homeRunLimitEnabled,
    homeRunLimit: rules.homeRunLimit,
    afterHomeRunLimit: homeRunLimitOutcomeToPrisma[rules.afterHomeRunLimit],
    runLimitPerInning: rules.runLimitPerInning,
    mercyRule: rules.mercyRule,
    courtesyRunnersAllowed: rules.courtesyRunnersAllowed,
    walksAllowed: rules.walksAllowed,
    sacFliesTracked: rules.sacFliesTracked,
    errorsTracked: rules.errorsTracked,
    fieldersChoicesTracked: rules.fieldersChoicesTracked,
  };
}

const homeRunLimitOutcomeToPrisma: Record<
  GameRules["afterHomeRunLimit"],
  "OUT" | "SINGLE" | "OTHER"
> = {
  Out: "OUT",
  Single: "SINGLE",
  Other: "OTHER",
};

export function fromRuleData(rules: {
  homeRunLimitEnabled: boolean;
  homeRunLimit: number | null;
  afterHomeRunLimit: "OUT" | "SINGLE" | "OTHER";
  runLimitPerInning: number | null;
  mercyRule: string | null;
  courtesyRunnersAllowed: boolean;
  walksAllowed: boolean;
  sacFliesTracked: boolean;
  errorsTracked: boolean;
  fieldersChoicesTracked: boolean;
}): GameRules {
  return normalizeGameRules({
    ...rules,
    homeRunLimit: rules.homeRunLimit ?? undefined,
    afterHomeRunLimit: homeRunLimitOutcomeFromPrisma[rules.afterHomeRunLimit],
    mercyRule: rules.mercyRule ?? undefined,
  });
}

const homeRunLimitOutcomeFromPrisma: Record<
  "OUT" | "SINGLE" | "OTHER",
  GameRules["afterHomeRunLimit"]
> = {
  OUT: "Out",
  SINGLE: "Single",
  OTHER: "Other",
};

export function toPrismaDefensivePosition(position: DefensivePosition) {
  return ({
    P: "P",
    C: "C",
    "1B": "FIRST_BASE",
    "2B": "SECOND_BASE",
    SS: "SHORTSTOP",
    "3B": "THIRD_BASE",
    LF: "LEFT_FIELD",
    LC: "LEFT_CENTER",
    RC: "RIGHT_CENTER",
    RF: "RIGHT_FIELD",
  } as const)[position];
}

export function fromPrismaDefensivePosition(position: string): DefensivePosition {
  return ({
    P: "P",
    C: "C",
    FIRST_BASE: "1B",
    SECOND_BASE: "2B",
    SHORTSTOP: "SS",
    THIRD_BASE: "3B",
    LEFT_FIELD: "LF",
    LEFT_CENTER: "LC",
    RIGHT_CENTER: "RC",
    RIGHT_FIELD: "RF",
  } as Record<string, DefensivePosition>)[position];
}

export function toPrismaDefensiveHalf(half: DefensiveAlignment["half"]) {
  return half === "Top" ? "TOP" as const : "BOTTOM" as const;
}

export function fromPrismaDefensiveHalf(half: "TOP" | "BOTTOM") {
  return half === "TOP" ? "Top" as const : "Bottom" as const;
}

export function fromPrismaDefensiveAlignment(
  alignment: {
    id: string;
    inning: number;
    half: "TOP" | "BOTTOM";
    updatedAt: Date;
    slots: Array<{
      position: string;
      status: "ASSIGNED" | "VACANT";
      playerId: string | null;
      player: { name: string } | null;
    }>;
  },
  selectedPlayerIds: string[],
): DefensiveAlignment {
  const assignedIds = new Set(
    alignment.slots.flatMap((slot) => slot.playerId ? [slot.playerId] : []),
  );

  return {
    id: alignment.id,
    inning: alignment.inning,
    half: fromPrismaDefensiveHalf(alignment.half),
    slots: Object.fromEntries(alignment.slots.map(fromPrismaDefensiveSlotEntry)),
    benchPlayerIds: selectedPlayerIds.filter((playerId) => !assignedIds.has(playerId)),
    updatedAt: alignment.updatedAt.toISOString(),
  };
}

function fromPrismaDefensiveSlotEntry(slot: {
  position: string;
  status: "ASSIGNED" | "VACANT";
  playerId: string | null;
  player: { name: string } | null;
}) {
  return [
    fromPrismaDefensivePosition(slot.position),
    fromPrismaDefensiveSlot(slot),
  ] as const;
}

function fromPrismaDefensiveSlot(slot: {
  status: "ASSIGNED" | "VACANT";
  playerId: string | null;
  player: { name: string } | null;
}) {
  if (slot.status === "ASSIGNED" && slot.playerId) {
    return {
      status: "ASSIGNED" as const,
      playerId: slot.playerId,
      playerName: slot.player?.name ?? "Player",
    };
  }

  return { status: "VACANT" as const };
}

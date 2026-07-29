import { PlayerGender as PrismaPlayerGender } from "@/generated/prisma/enums";
import { AppError, validationError } from "@/lib/appErrors";
import {
  defensivePositions,
  minimumFemaleDefenders,
} from "@/lib/defenseEngine";
import type { DefensiveAlignment } from "@/types/defense";
import type { GamePreparationInput } from "./gamePreparationBackend.ts";
import {
  fromPrismaDefensiveHalf,
  fromPrismaDefensivePosition,
} from "./gamePreparationMappers.ts";

export type PreparationPlayer = {
  id: string;
  gender: PrismaPlayerGender;
};

export function validatePreparedLineup(
  input: GamePreparationInput,
  order: string[],
  players: PreparationPlayer[],
) {
  if (input.status === "SETUP") return;

  const targetCount = getPreparationTargetCount(input);
  assertEnoughSelectedPlayers(input.selectedPlayerIds, targetCount);
  assertPreparedOrderMatchesSelection(order, input.selectedPlayerIds, targetCount);

  const genderById = getPlayerGenderMap(players);
  assertLineupPlayerGendersKnown(order, genderById);
  assertFemaleLeadoff(order, genderById);
}

export function validateStartingDefense(
  alignment: DefensiveAlignment | null | undefined,
  lineupIds: string[],
  players: PreparationPlayer[],
  isHome: boolean,
) {
  assertStartingDefenseTargetsFirstHalf(alignment, isHome);

  const assignedIds = getAssignedDefensivePlayerIds(alignment);
  assertStartingDefenseAssignments(alignment, lineupIds, assignedIds);
  assertMinimumFemaleDefenders(assignedIds, getPlayerGenderMap(players));
}

export function validatePersistedStartPreparation(
  lineup: Array<{ battingOrderPosition: number | null; player: { gender: PrismaPlayerGender } }>,
  persistedAlignment: { inning: number; half: "TOP" | "BOTTOM"; slots: Array<{ position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null }> } | undefined,
  lineupIds: string[],
  players: PreparationPlayer[],
  isHome: boolean,
) {
  if (!hasCompleteAcceptedLineup(lineup)) {
    throw new AppError("GAME_NOT_STARTABLE", "The accepted batting order is incomplete or no longer league-compliant.", 409);
  }

  if (!hasSequentialLineupPositions(lineup)) {
    throw new AppError("GAME_NOT_STARTABLE", "The accepted batting order has missing positions.", 409);
  }

  validatePersistedStartingDefense(persistedAlignment, lineupIds, players, isHome);
}

function getPreparationTargetCount(input: GamePreparationInput) {
  return input.lineupSize === "Everyone" ? input.selectedPlayerIds.length : Number(input.lineupSize);
}

function assertEnoughSelectedPlayers(selectedPlayerIds: string[], targetCount: number) {
  if (selectedPlayerIds.length < targetCount || targetCount < 9) {
    throw validationError("SCHEDULE_WEEK_INVALID", `Select at least ${targetCount} players for this lineup.`);
  }
}

function assertPreparedOrderMatchesSelection(order: string[], selectedPlayerIds: string[], targetCount: number) {
  if (isPreparedOrderValid(order, selectedPlayerIds, targetCount)) {
    return;
  }

  throw validationError("SCHEDULE_WEEK_INVALID", "The batting order must contain the chosen number of unique selected players.");
}

function isPreparedOrderValid(order: string[], selectedPlayerIds: string[], targetCount: number) {
  const selectedIds = new Set(selectedPlayerIds);
  const orderIds = new Set(order);

  return order.length === targetCount
    && orderIds.size === order.length
    && order.every((playerId) => selectedIds.has(playerId));
}

function getPlayerGenderMap(players: PreparationPlayer[]) {
  return new Map(players.map((player) => [player.id, player.gender]));
}

function assertLineupPlayerGendersKnown(order: string[], genderById: Map<string, PrismaPlayerGender>) {
  if (order.some((playerId) => genderById.get(playerId) === PrismaPlayerGender.UNKNOWN)) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Set every lineup player's gender before accepting the order.");
  }
}

function assertFemaleLeadoff(order: string[], genderById: Map<string, PrismaPlayerGender>) {
  if (genderById.get(order[0]) !== PrismaPlayerGender.FEMALE) {
    throw validationError("SCHEDULE_WEEK_INVALID", "A female player must lead off before this lineup can be accepted.");
  }
}

function assertStartingDefenseTargetsFirstHalf(
  alignment: DefensiveAlignment | null | undefined,
  isHome: boolean,
): asserts alignment is DefensiveAlignment {
  if (!alignment || alignment.inning !== 1 || alignment.half !== getFirstDefensiveHalf(isHome)) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Save a starting defense for the first fielding half before accepting the lineup.");
  }
}

function getFirstDefensiveHalf(isHome: boolean) {
  return isHome ? "Top" as const : "Bottom" as const;
}

function getAssignedDefensivePlayerIds(alignment: DefensiveAlignment) {
  return defensivePositions.flatMap((position) => {
    const slot = alignment.slots[position];
    return slot?.status === "ASSIGNED" ? [slot.playerId] : [];
  });
}

function assertStartingDefenseAssignments(
  alignment: DefensiveAlignment,
  lineupIds: string[],
  assignedIds: string[],
) {
  if (hasValidStartingDefenseAssignments(alignment, lineupIds, assignedIds)) {
    return;
  }

  throw validationError("SCHEDULE_WEEK_INVALID", "Starting defense must use unique lineup players and include a pitcher at every available position.");
}

function hasValidStartingDefenseAssignments(
  alignment: DefensiveAlignment,
  lineupIds: string[],
  assignedIds: string[],
) {
  const lineupIdSet = new Set(lineupIds);
  const requiredAssignedCount = Math.min(defensivePositions.length, lineupIds.length);
  const checks = [
    assignedIds.length === requiredAssignedCount,
    new Set(assignedIds).size === assignedIds.length,
    assignedIds.every((playerId) => lineupIdSet.has(playerId)),
    alignment.slots.P?.status === "ASSIGNED",
  ];

  return checks.every(Boolean);
}

function assertMinimumFemaleDefenders(
  assignedIds: string[],
  genderById: Map<string, PrismaPlayerGender>,
) {
  const femaleDefenders = assignedIds.filter((playerId) => genderById.get(playerId) === PrismaPlayerGender.FEMALE).length;

  if (femaleDefenders < minimumFemaleDefenders) {
    throw validationError("SCHEDULE_WEEK_INVALID", `Assign at least ${minimumFemaleDefenders} female players on defense.`);
  }
}

function hasCompleteAcceptedLineup(
  lineup: Array<{ battingOrderPosition: number | null; player: { gender: PrismaPlayerGender } }>,
) {
  return lineup.length >= 9
    && lineup[0]?.battingOrderPosition === 1
    && lineup[0]?.player.gender === PrismaPlayerGender.FEMALE;
}

function hasSequentialLineupPositions(lineup: Array<{ battingOrderPosition: number | null }>) {
  return lineup.every((row, index) => row.battingOrderPosition === index + 1);
}

function validatePersistedStartingDefense(
  persistedAlignment: { inning: number; half: "TOP" | "BOTTOM"; slots: Array<{ position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null }> } | undefined,
  lineupIds: string[],
  players: PreparationPlayer[],
  isHome: boolean,
) {
  const alignment = toPersistedDefensiveAlignment(persistedAlignment);

  try {
    validateStartingDefense(alignment, lineupIds, players, isHome);
  } catch {
    throw new AppError("GAME_NOT_STARTABLE", "The starting defense is incomplete or uses invalid players.", 409);
  }
}

function toPersistedDefensiveAlignment(
  persistedAlignment: { inning: number; half: "TOP" | "BOTTOM"; slots: Array<{ position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null }> } | undefined,
) {
  if (!persistedAlignment) {
    throw new AppError("GAME_NOT_STARTABLE", "Save a starting defense before starting the game.", 409);
  }

  return {
    id: "persisted",
    inning: persistedAlignment.inning,
    half: fromPrismaDefensiveHalf(persistedAlignment.half),
    slots: Object.fromEntries(persistedAlignment.slots.map(toPersistedDefensiveSlotEntry)),
    benchPlayerIds: [],
    updatedAt: new Date(0).toISOString(),
  } satisfies DefensiveAlignment;
}

function toPersistedDefensiveSlotEntry(slot: { position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null }) {
  return [
    fromPrismaDefensivePosition(slot.position),
    toPersistedDefensiveSlot(slot),
  ] as const;
}

function toPersistedDefensiveSlot(slot: { status: "ASSIGNED" | "VACANT"; playerId: string | null }) {
  return slot.status === "ASSIGNED" && slot.playerId
    ? { status: "ASSIGNED" as const, playerId: slot.playerId, playerName: "Player" }
    : { status: "VACANT" as const };
}

export function getPrismaFirstDefensiveHalf(isHome: boolean) {
  return isHome ? "TOP" as const : "BOTTOM" as const;
}

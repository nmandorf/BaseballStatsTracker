import { Prisma } from "@/generated/prisma/client";
import {
  GamePreparationStatus as PrismaGamePreparationStatus,
  GameStatus as PrismaGameStatus,
} from "@/generated/prisma/enums";
import {
  AppError,
  notFoundError,
  validationError,
} from "@/lib/appErrors";
import { normalizeGameRules } from "@/lib/gameRules";
import { getPrisma } from "@/lib/prisma";
import { getGameStartEligibility } from "@/lib/scheduleRules";
import type { TeamAccount } from "@/lib/teamAccount";
import type {
  DefensiveAlignment,
  DefensivePosition,
  DefensiveSlot,
} from "@/types/defense";
import type { GameRules } from "@/types/game";
import {
  fromPrismaDefensiveAlignment,
  fromRuleData,
  mapPreparationStatus,
  toPrismaDefensiveHalf,
  toPrismaDefensivePosition,
  toRuleData,
} from "./gamePreparationMappers.ts";
import {
  getPrismaFirstDefensiveHalf,
  validatePersistedStartPreparation,
  validatePreparedLineup,
  validateStartingDefense,
  type PreparationPlayer,
} from "./gamePreparationValidation.ts";

export type GamePreparationInput = {
  lineupSize: "9" | "10" | "11" | "Everyone";
  selectedPlayerIds: string[];
  generatedLineupIds: string[];
  acceptedLineupIds: string[];
  gameRules: GameRules;
  status: "SETUP" | "GENERATED" | "ACCEPTED";
  startingDefense?: DefensiveAlignment | null;
};

const validLineupSizes = new Set<GamePreparationInput["lineupSize"]>(["9", "10", "11", "Everyone"]);
const validPreparationStatuses = new Set<GamePreparationInput["status"]>(["SETUP", "GENERATED", "ACCEPTED"]);

type PreparationGame = {
  id: string;
  isHome: boolean;
  status: PrismaGameStatus;
  teamId: string;
};

export async function saveGamePreparation(gameId: string, input: GamePreparationInput, account: TeamAccount) {
  const prisma = getPrisma();
  const game = await loadPreparationGame(prisma, gameId, account);
  validatePreparationInputShape(input);

  const validPlayers = await loadPreparationPlayers(prisma, game, input.selectedPlayerIds);

  const order = getPreparationOrder(input);
  validatePreparedLineup(input, order, validPlayers);
  validateStartingDefenseIfNeeded(input, order, validPlayers, game);

  const rules = normalizeGameRules(input.gameRules);

  await prisma.$transaction((tx) => saveGamePreparationInTransaction(tx, gameId, input, order, rules));
}

export async function loadGamePreparation(gameId: string, account: TeamAccount) {
  const prisma = getPrisma();
  const game = await findGamePreparation(prisma, gameId, account);
  if (!game) throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found.", { gameId });

  const startingAlignment = findStartingDefensiveAlignment(game);
  const selectedPlayerIds = game.lineup.map((row) => row.playerId);
  const orderedIds = getOrderedLineupIds(game.lineup);
  const status = mapLoadedPreparationStatus(game.preparationStatus);

  return {
    gameId: game.id,
    opponent: game.opponent,
    isHome: game.isHome,
    lineupSize: getLineupSize(selectedPlayerIds),
    selectedPlayerIds,
    generatedLineupIds: orderedIds,
    acceptedLineupIds: getAcceptedLoadedLineupIds(status, orderedIds),
    gameRules: getLoadedGameRules(game.rules),
    startingDefense: getLoadedStartingDefense(startingAlignment, selectedPlayerIds),
    status,
    updatedAt: game.updatedAt.toISOString(),
  };
}

function loadPreparationGame(
  prisma: ReturnType<typeof getPrisma>,
  gameId: string,
  account: TeamAccount,
): Promise<PreparationGame> {
  return prisma.game.findFirst({
    where: { id: gameId, team: { ownerUid: account.uid } },
    select: { id: true, status: true, teamId: true, isHome: true },
  }).then((game) => {
    if (!game) throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found.", { gameId });
    if (game.status !== PrismaGameStatus.SCHEDULED) throw new AppError("SCHEDULE_ENTRY_READ_ONLY", "This game's preparation is read-only.", 409);
    return game;
  });
}

function validatePreparationInputShape(input: GamePreparationInput) {
  if (!validLineupSizes.has(input.lineupSize)) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Choose a valid batting lineup size.");
  }

  if (!validPreparationStatuses.has(input.status)) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Game preparation has an invalid status.");
  }

  if (new Set(input.selectedPlayerIds).size !== input.selectedPlayerIds.length) {
    throw validationError("SCHEDULE_WEEK_INVALID", "A player can only be selected once.");
  }
}

async function loadPreparationPlayers(
  prisma: ReturnType<typeof getPrisma>,
  game: PreparationGame,
  selectedPlayerIds: string[],
) {
  const validPlayers = await prisma.player.findMany({
    where: { teamId: game.teamId, id: { in: selectedPlayerIds } },
    select: { id: true, gender: true },
  });

  if (validPlayers.length !== selectedPlayerIds.length) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Selected players must belong to this team.");
  }

  return validPlayers;
}

function getPreparationOrder(input: GamePreparationInput) {
  return input.status === "ACCEPTED" ? input.acceptedLineupIds : input.generatedLineupIds;
}

function validateStartingDefenseIfNeeded(
  input: GamePreparationInput,
  order: string[],
  validPlayers: PreparationPlayer[],
  game: PreparationGame,
) {
  if (input.startingDefense && input.status !== "SETUP") {
    validateStartingDefense(input.startingDefense, order, validPlayers, game.isHome);
  }
}

async function saveGamePreparationInTransaction(
  tx: Prisma.TransactionClient,
  gameId: string,
  input: GamePreparationInput,
  order: string[],
  rules: GameRules,
) {
  await replaceGamePreparationLineup(tx, gameId, input.selectedPlayerIds, order);
  await upsertGamePreparationRules(tx, gameId, rules);
  await updateGamePreparationStatus(tx, gameId, input.status);
  await replaceStartingDefenseIfProvided(tx, gameId, input.startingDefense);
}

async function replaceGamePreparationLineup(
  tx: Prisma.TransactionClient,
  gameId: string,
  selectedPlayerIds: string[],
  order: string[],
) {
  const positionById = new Map(order.map((playerId, index) => [playerId, index + 1]));

  await tx.gameLineup.deleteMany({ where: { gameId } });

  if (selectedPlayerIds.length) {
    await tx.gameLineup.createMany({
      data: selectedPlayerIds.map((playerId) => ({
        gameId,
        playerId,
        battingOrderPosition: positionById.get(playerId) ?? null,
        isActive: true,
      })),
    });
  }
}

async function upsertGamePreparationRules(
  tx: Prisma.TransactionClient,
  gameId: string,
  rules: GameRules,
) {
  await tx.gameRuleSettings.upsert({
    where: { gameId },
    create: { gameId, ...toRuleData(rules) },
    update: toRuleData(rules),
  });
}

async function updateGamePreparationStatus(
  tx: Prisma.TransactionClient,
  gameId: string,
  status: GamePreparationInput["status"],
) {
  await tx.game.update({ where: { id: gameId }, data: { preparationStatus: mapPreparationStatus(status) } });
}

async function replaceStartingDefenseIfProvided(
  tx: Prisma.TransactionClient,
  gameId: string,
  startingDefense: DefensiveAlignment | null | undefined,
) {
  if (!startingDefense) {
    return;
  }

  const half = toPrismaDefensiveHalf(startingDefense.half);
  await tx.defensiveAlignment.deleteMany({ where: { gameId, inning: startingDefense.inning, half } });
  await tx.defensiveAlignment.create({
    data: {
      gameId,
      inning: startingDefense.inning,
      half,
      slots: {
        create: Object.entries(startingDefense.slots).map(toDefensiveSlotCreateData),
      },
    },
  });
}

function toDefensiveSlotCreateData([position, slot]: [string, DefensiveAlignment["slots"][DefensivePosition]]) {
  return {
    position: toPrismaDefensivePosition(position as DefensivePosition),
    status: toPrismaDefensiveSlotStatus(slot),
    playerId: getAssignedDefensiveSlotPlayerId(slot),
  };
}

function toPrismaDefensiveSlotStatus(slot: DefensiveSlot | undefined) {
  return isAssignedDefensiveSlot(slot) ? "ASSIGNED" as const : "VACANT" as const;
}

function getAssignedDefensiveSlotPlayerId(slot: DefensiveSlot | undefined) {
  return isAssignedDefensiveSlot(slot) ? slot.playerId : null;
}

function isAssignedDefensiveSlot(slot: DefensiveSlot | undefined): slot is Extract<DefensiveSlot, { status: "ASSIGNED" }> {
  return slot?.status === "ASSIGNED";
}

function findGamePreparation(
  prisma: ReturnType<typeof getPrisma>,
  gameId: string,
  account: TeamAccount,
) {
  return prisma.game.findFirst({
    where: { id: gameId, team: { ownerUid: account.uid } },
    include: {
      lineup: { orderBy: { battingOrderPosition: "asc" } },
      rules: true,
      defensiveAlignments: { orderBy: [{ inning: "asc" }, { createdAt: "asc" }], include: { slots: { include: { player: { select: { name: true } } } } } },
    },
  });
}

type LoadedGamePreparation = NonNullable<Awaited<ReturnType<typeof findGamePreparation>>>;

function findStartingDefensiveAlignment(game: Pick<LoadedGamePreparation, "defensiveAlignments" | "isHome">) {
  const firstDefensiveHalf = getPrismaFirstDefensiveHalf(game.isHome);
  return game.defensiveAlignments.find((alignment) => (
    alignment.inning === 1 && alignment.half === firstDefensiveHalf
  ));
}

function mapLoadedPreparationStatus(status: PrismaGamePreparationStatus) {
  if (status === PrismaGamePreparationStatus.ACCEPTED || status === PrismaGamePreparationStatus.STARTED) {
    return "ACCEPTED" as const;
  }

  return status === PrismaGamePreparationStatus.GENERATED ? "GENERATED" as const : "SETUP" as const;
}

function getAcceptedLoadedLineupIds(status: GamePreparationInput["status"], orderedIds: string[]) {
  return status === "ACCEPTED" ? orderedIds : [];
}

function getLoadedGameRules(rules: LoadedGamePreparation["rules"]) {
  return rules ? fromRuleData(rules) : normalizeGameRules(undefined);
}

function getLoadedStartingDefense(
  startingAlignment: LoadedGamePreparation["defensiveAlignments"][number] | undefined,
  selectedPlayerIds: string[],
) {
  return startingAlignment ? fromPrismaDefensiveAlignment(startingAlignment, selectedPlayerIds) : null;
}

export async function authorizeScheduledGameStart(gameId: string, account: TeamAccount, now = new Date()) {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(
      (tx) => authorizeScheduledGameStartInTransaction(tx, gameId, account, now),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError("TEAM_GAME_ALREADY_IN_PROGRESS", "Another game start changed at the same time. Refresh the schedule and try again.", 409);
    }
    throw error;
  }
}

async function authorizeScheduledGameStartInTransaction(
  tx: Prisma.TransactionClient,
  gameId: string,
  account: TeamAccount,
  now: Date,
) {
  const game = await loadScheduledStartGame(tx, gameId, account);
  const otherActive = await findOtherActiveGame(tx, game);

  assertGameStartEligibility(game, otherActive, now);
  assertAcceptedPreparationStatus(game.preparationStatus);

  const acceptedLineup = getAcceptedLineupRows(game.lineup);
  const acceptedPlayerIds = acceptedLineup.map((row) => row.playerId);
  const playerGenders = getLineupPlayerGenders(game.lineup);
  const startingAlignment = findStartingDefensiveAlignment(game);

  validatePersistedStartPreparation(acceptedLineup, startingAlignment, acceptedPlayerIds, playerGenders, game.isHome);
  await markScheduledGameStarted(tx, game.id);

  return {
    gameId: game.id,
    startedAt: now.toISOString(),
    preparation: buildStartedGamePreparation(game, startingAlignment, now),
  };
}

async function loadScheduledStartGame(
  tx: Prisma.TransactionClient,
  gameId: string,
  account: TeamAccount,
) {
  const game = await tx.game.findFirst({
    where: { id: gameId, team: { ownerUid: account.uid } },
    include: {
      lineup: { include: { player: { select: { gender: true } } }, orderBy: { battingOrderPosition: "asc" } },
      rules: true,
      defensiveAlignments: { include: { slots: { include: { player: { select: { name: true } } } } }, orderBy: [{ inning: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!game) throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found.", { gameId });

  return game;
}

type ScheduledStartGame = Awaited<ReturnType<typeof loadScheduledStartGame>>;

async function findOtherActiveGame(tx: Prisma.TransactionClient, game: ScheduledStartGame) {
  return tx.game.findFirst({
    where: { teamId: game.teamId, status: PrismaGameStatus.IN_PROGRESS, id: { not: game.id } },
    select: { id: true },
  });
}

function assertGameStartEligibility(
  game: ScheduledStartGame,
  otherActive: { id: string } | null,
  now: Date,
) {
  const eligibility = getGameStartEligibility({
    scheduledStartAt: game.date,
    status: game.status,
    trustedNow: now,
    hasAnotherActiveGame: Boolean(otherActive),
  });

  if (!eligibility.allowed) {
    throw new AppError(eligibility.code, eligibility.message, 409, { eligibleAt: eligibility.eligibleAt, activeGameId: otherActive?.id ?? null });
  }
}

function assertAcceptedPreparationStatus(status: PrismaGamePreparationStatus) {
  if (status !== PrismaGamePreparationStatus.ACCEPTED) {
    throw new AppError("GAME_NOT_STARTABLE", "Accept a valid lineup before starting the game.", 409);
  }
}

function getAcceptedLineupRows(lineup: ScheduledStartGame["lineup"]) {
  return lineup.filter((row) => row.battingOrderPosition !== null);
}

function getLineupPlayerGenders(lineup: ScheduledStartGame["lineup"]) {
  return lineup.map((row) => ({ id: row.playerId, gender: row.player.gender }));
}

async function markScheduledGameStarted(tx: Prisma.TransactionClient, gameId: string) {
  await tx.game.update({
    where: { id: gameId },
    data: { status: PrismaGameStatus.IN_PROGRESS, preparationStatus: PrismaGamePreparationStatus.STARTED },
  });
}

function buildStartedGamePreparation(
  game: {
    id: string;
    opponent: string;
    isHome: boolean;
    updatedAt: Date;
    lineup: Array<{ playerId: string; battingOrderPosition: number | null }>;
    rules: {
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
    } | null;
  },
  startingAlignment: Parameters<typeof fromPrismaDefensiveAlignment>[0] | undefined,
  startedAt: Date,
) {
  const orderedIds = game.lineup
    .filter((row) => row.battingOrderPosition !== null)
    .sort((left, right) => (left.battingOrderPosition ?? 0) - (right.battingOrderPosition ?? 0))
    .map((row) => row.playerId);
  const selectedPlayerIds = game.lineup.map((row) => row.playerId);
  const lineupSize = getLineupSize(selectedPlayerIds);

  return {
    gameId: game.id,
    opponent: game.opponent,
    isHome: game.isHome,
    lineupSize,
    selectedPlayerIds,
    generatedLineupIds: orderedIds,
    acceptedLineupIds: orderedIds,
    gameRules: game.rules ? fromRuleData(game.rules) : normalizeGameRules(undefined),
    startingDefense: startingAlignment ? fromPrismaDefensiveAlignment(startingAlignment, selectedPlayerIds) : null,
    status: "ACCEPTED" as const,
    updatedAt: startedAt.toISOString(),
  };
}

function getOrderedLineupIds(lineup: Array<{ playerId: string; battingOrderPosition: number | null }>) {
  return lineup.filter((row) => row.battingOrderPosition !== null).map((row) => row.playerId);
}

function getLineupSize(selectedPlayerIds: string[]) {
  return selectedPlayerIds.length === 9 || selectedPlayerIds.length === 10 || selectedPlayerIds.length === 11
    ? String(selectedPlayerIds.length) as "9" | "10" | "11"
    : "Everyone" as const;
}

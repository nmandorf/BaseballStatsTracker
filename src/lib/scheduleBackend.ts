import { Prisma } from "@/generated/prisma/client";
import {
  GamePreparationStatus as PrismaGamePreparationStatus,
  GameStatus as PrismaGameStatus,
  PlayerGender as PrismaPlayerGender,
  ScheduleWeekKind as PrismaScheduleWeekKind,
} from "@/generated/prisma/enums";
import { AppError, notFoundError, validationError } from "@/lib/appErrors";
import { defensivePositions, minimumFemaleDefenders } from "@/lib/defenseEngine";
import { createGameHistoryBreakdown, createGameHistoryBreakdownFromPlayerStats } from "@/lib/gameHistoryBreakdown";
import type { GameState } from "@/lib/gameEngine";
import { normalizeGameRules } from "@/lib/gameRules";
import { getPrisma } from "@/lib/prisma";
import { buildFinalGameStateFromPersistedStats } from "@/lib/scheduledGameStatsFallback";
import { allowedGameStartTimes, getGameStartEligibility, validateScheduleInput, zonedGameStart } from "@/lib/scheduleRules";
import type { TeamAccount } from "@/lib/teamAccount";
import type { GameRules } from "@/types/game";
import type { DefensiveAlignment, DefensivePosition, DefensiveSlot } from "@/types/defense";
import type { ScheduleWeekInput, TeamSchedule } from "@/types/schedule";
import type { PlayerStats } from "@/types/stats";

type GameScheduleWeekInput = Extract<ScheduleWeekInput, { kind: "GAME" }>;

const currentSeasonYear = new Date().getFullYear();

export async function loadTeamSchedule(teamId: string, account: TeamAccount): Promise<TeamSchedule> {
  const prisma = getPrisma();
  const team = await prisma.team.findFirst({
    where: { id: teamId, ownerUid: account.uid },
    include: {
      scheduleWeeks: {
        orderBy: { position: "asc" },
        include: {
          game: {
            include: {
              _count: { select: { lineup: true, atBats: true } },
              stats: true,
              teamStats: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw notFoundError("TEAM_NOT_FOUND", "Team not found.", { teamId });
  }

  return {
    teamId: team.id,
    timeZone: team.timeZone,
    setupCompleted: team.scheduleSetupCompleted,
    serverNow: new Date().toISOString(),
    weeks: team.scheduleWeeks.map((week) => {
      if (week.kind === PrismaScheduleWeekKind.BYE || !week.game) {
        return {
          id: week.id,
          kind: "BYE" as const,
          position: week.position,
          localDate: week.localDate,
        };
      }

      return {
        id: week.id,
        kind: "GAME" as const,
        position: week.position,
        localDate: week.localDate,
        gameId: week.game.id,
        opponent: week.game.opponent,
        startTime: formatStartTime(week.game.date, team.timeZone ?? "UTC"),
        scheduledStartAt: week.game.date.toISOString(),
        isHome: week.game.isHome,
        status: week.game.status,
        preparationStatus: week.game.preparationStatus,
        selectedPlayerCount: week.game._count.lineup,
        teamScore: week.game.teamScore,
        opponentScore: week.game.opponentScore,
        result: week.game.result,
        playCount: week.game._count.atBats,
        matchBreakdown: getScheduledGameHistoryBreakdown(week.game),
      };
    }),
  };
}

function getScheduledGameHistoryBreakdown(
  game: {
    stats: Array<Partial<PlayerStats>>;
    teamStats: Partial<PlayerStats> | null;
  },
) {
  return createGameHistoryBreakdown(game.teamStats)
    ?? createGameHistoryBreakdownFromPlayerStats(game.stats);
}

export async function saveTeamSchedule(input: {
  teamId: string;
  timeZone: string;
  weeks: ScheduleWeekInput[];
  account: TeamAccount;
}) {
  const errors = validateScheduleInput(input.weeks, input.timeZone);

  if (errors.length) {
    throw validationError("SCHEDULE_WEEK_INVALID", errors[0], { issueCount: errors.length });
  }

  const prisma = getPrisma();

  await prisma.$transaction((tx) => saveTeamScheduleInTransaction(tx, input));

  return loadTeamSchedule(input.teamId, input.account);
}

type ScheduleSaveTeam = Awaited<ReturnType<typeof loadScheduleSaveTeam>>;
type ExistingScheduleWeek = ScheduleSaveTeam["scheduleWeeks"][number];

async function saveTeamScheduleInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    teamId: string;
    timeZone: string;
    weeks: ScheduleWeekInput[];
    account: TeamAccount;
  },
) {
  const team = await loadScheduleSaveTeam(tx, input);
  const season = await getOrCreateScheduleSeason(tx, team);

  await removeMissingScheduleWeeks(tx, team.scheduleWeeks, input.weeks);
  await upsertRequestedScheduleWeeks(tx, team, season, input);
  await markScheduleSetupComplete(tx, team.id, input.timeZone);
}

async function loadScheduleSaveTeam(
  tx: Prisma.TransactionClient,
  input: { teamId: string; account: TeamAccount },
) {
  const team = await tx.team.findFirst({
    where: { id: input.teamId, ownerUid: input.account.uid },
    include: {
      seasons: { where: { year: currentSeasonYear }, take: 1 },
      scheduleWeeks: { include: { game: { include: { _count: { select: { lineup: true } } } } } },
    },
  });

  if (!team) {
    throw notFoundError("TEAM_NOT_FOUND", "Team not found.", { teamId: input.teamId });
  }

  return team;
}

async function getOrCreateScheduleSeason(tx: Prisma.TransactionClient, team: ScheduleSaveTeam) {
  return team.seasons[0] ?? await tx.season.create({
    data: { teamId: team.id, year: currentSeasonYear, label: `${currentSeasonYear} Season` },
  });
}

async function removeMissingScheduleWeeks(
  tx: Prisma.TransactionClient,
  existingWeeks: ExistingScheduleWeek[],
  requestedWeeks: ScheduleWeekInput[],
) {
  const requestedIds = new Set(requestedWeeks.flatMap((week) => week.id ? [week.id] : []));

  for (const existing of existingWeeks) {
    await parkExistingScheduleWeek(tx, existing);
    await deleteMissingScheduleWeek(tx, existing, requestedIds);
  }
}

async function parkExistingScheduleWeek(tx: Prisma.TransactionClient, existing: ExistingScheduleWeek) {
  await tx.scheduleWeek.update({
    where: { id: existing.id },
    data: { position: existing.position + 10_000 },
  });
}

async function deleteMissingScheduleWeek(
  tx: Prisma.TransactionClient,
  existing: ExistingScheduleWeek,
  requestedIds: Set<string>,
) {
  if (requestedIds.has(existing.id)) {
    return;
  }

  assertEditable(existing.game?.status);
  await tx.scheduleWeek.delete({ where: { id: existing.id } });
  await deleteScheduleGameIfPresent(tx, existing.gameId);
}

async function deleteScheduleGameIfPresent(tx: Prisma.TransactionClient, gameId: string | null) {
  if (gameId) await tx.game.delete({ where: { id: gameId } });
}

async function upsertRequestedScheduleWeeks(
  tx: Prisma.TransactionClient,
  team: ScheduleSaveTeam,
  season: { id: string },
  input: {
    timeZone: string;
    weeks: ScheduleWeekInput[];
  },
) {
  const existingById = new Map(team.scheduleWeeks.map((week) => [week.id, week]));

  for (const [index, requested] of input.weeks.entries()) {
    await upsertRequestedScheduleWeek(tx, team.id, season.id, existingById, requested, index, input.timeZone);
  }
}

async function upsertRequestedScheduleWeek(
  tx: Prisma.TransactionClient,
  teamId: string,
  seasonId: string,
  existingById: Map<string, ExistingScheduleWeek>,
  requested: ScheduleWeekInput,
  index: number,
  timeZone: string,
) {
  const existing = requested.id ? existingById.get(requested.id) : undefined;
  const position = index + 1;

  if (isImmutableScheduleWeek(existing)) {
    await preserveImmutableScheduleWeek(tx, existing, requested, position, timeZone);
    return;
  }

  if (requested.kind === "BYE") {
    await upsertByeWeek(tx, teamId, seasonId, existing, requested, position);
    return;
  }

  await upsertGameWeek(tx, teamId, seasonId, existing, requested, position, timeZone);
}

function isImmutableScheduleWeek(existing: ExistingScheduleWeek | undefined): existing is ExistingScheduleWeek {
  return Boolean(existing && immutableGameStatuses.has(existing.game?.status ?? PrismaGameStatus.SCHEDULED));
}

const immutableGameStatuses = new Set<PrismaGameStatus>([
  PrismaGameStatus.FINAL,
  PrismaGameStatus.CANCELLED,
  PrismaGameStatus.IN_PROGRESS,
]);

async function preserveImmutableScheduleWeek(
  tx: Prisma.TransactionClient,
  existing: ExistingScheduleWeek,
  requested: ScheduleWeekInput,
  position: number,
  timeZone: string,
) {
  assertImmutableEntryUnchanged(existing, requested, position, timeZone);
  await tx.scheduleWeek.update({ where: { id: existing.id }, data: { position } });
}

async function upsertByeWeek(
  tx: Prisma.TransactionClient,
  teamId: string,
  seasonId: string,
  existing: ExistingScheduleWeek | undefined,
  requested: ScheduleWeekInput,
  position: number,
) {
  await removeGameForByeWeek(tx, existing, requested);

  if (existing) {
    await tx.scheduleWeek.update({
      where: { id: existing.id },
      data: { kind: PrismaScheduleWeekKind.BYE, localDate: requested.localDate, position },
    });
    return;
  }

  await tx.scheduleWeek.create({
    data: { teamId, seasonId, position, kind: PrismaScheduleWeekKind.BYE, localDate: requested.localDate },
  });
}

async function removeGameForByeWeek(
  tx: Prisma.TransactionClient,
  existing: ExistingScheduleWeek | undefined,
  requested: ScheduleWeekInput,
) {
  if (!existing?.gameId) {
    return;
  }

  assertCanReplacePreparedGameWithBye(existing, requested);

  await tx.scheduleWeek.update({ where: { id: existing.id }, data: { gameId: null } });
  await tx.game.delete({ where: { id: existing.gameId } });
}

function assertCanReplacePreparedGameWithBye(
  existing: ExistingScheduleWeek,
  requested: ScheduleWeekInput,
) {
  if (!existing.game?._count.lineup || requested.discardPreparation) {
    return;
  }

  throw validationError("SCHEDULE_WEEK_INVALID", "Confirm before replacing a prepared game with a bye.");
}

async function upsertGameWeek(
  tx: Prisma.TransactionClient,
  teamId: string,
  seasonId: string,
  existing: ExistingScheduleWeek | undefined,
  requested: GameScheduleWeekInput,
  position: number,
  timeZone: string,
) {
  const scheduledStartAt = getRequestedGameStart(requested, position, timeZone);

  if (existing?.gameId) {
    await updateExistingGameWeek(tx, existing, requested, position, scheduledStartAt);
    return;
  }

  await createGameWeek(tx, teamId, seasonId, existing, requested, position, scheduledStartAt);
}

function getRequestedGameStart(requested: GameScheduleWeekInput, position: number, timeZone: string) {
  const scheduledStartAt = zonedGameStart(requested.localDate, requested.startTime, timeZone);

  if (!scheduledStartAt) throw validationError("SCHEDULE_WEEK_INVALID", `Week ${position} has an invalid start time.`);

  return scheduledStartAt;
}

async function updateExistingGameWeek(
  tx: Prisma.TransactionClient,
  existing: ExistingScheduleWeek,
  requested: GameScheduleWeekInput,
  position: number,
  scheduledStartAt: Date,
) {
  await tx.game.update({
    where: { id: existing.gameId ?? "" },
    data: { opponent: requested.opponent.trim(), date: scheduledStartAt, isHome: requested.isHome },
  });
  await tx.scheduleWeek.update({
    where: { id: existing.id },
    data: { kind: PrismaScheduleWeekKind.GAME, localDate: requested.localDate, position },
  });
}

async function createGameWeek(
  tx: Prisma.TransactionClient,
  teamId: string,
  seasonId: string,
  existing: ExistingScheduleWeek | undefined,
  requested: GameScheduleWeekInput,
  position: number,
  scheduledStartAt: Date,
) {
  const game = await tx.game.create({
    data: { teamId, seasonId, opponent: requested.opponent.trim(), date: scheduledStartAt, isHome: requested.isHome },
  });

  if (existing) {
    await tx.scheduleWeek.update({
      where: { id: existing.id },
      data: { kind: PrismaScheduleWeekKind.GAME, localDate: requested.localDate, position, gameId: game.id },
    });
    return;
  }

  await tx.scheduleWeek.create({
    data: { teamId, seasonId, position, kind: PrismaScheduleWeekKind.GAME, localDate: requested.localDate, gameId: game.id },
  });
}

async function markScheduleSetupComplete(tx: Prisma.TransactionClient, teamId: string, timeZone: string) {
  await tx.team.update({
    where: { id: teamId },
    data: { timeZone, scheduleSetupCompleted: true },
  });
}

export async function cancelScheduledGame(gameId: string, account: TeamAccount) {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({ where: { id: gameId, team: { ownerUid: account.uid } } });
  if (!game) throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found.", { gameId });
  if (game.status !== PrismaGameStatus.SCHEDULED) throw new AppError("SCHEDULE_ENTRY_READ_ONLY", "Only upcoming games can be cancelled.", 409);
  await prisma.game.update({ where: { id: game.id }, data: { status: PrismaGameStatus.CANCELLED } });
  return { gameId, status: "CANCELLED" as const };
}

export async function loadScheduledGameSnapshot(gameId: string, account: TeamAccount) {
  const savedGame = await findScheduledGameSnapshot(gameId, account);

  if (!savedGame) {
    throw notFoundError("TEAM_NOT_FOUND", "Game not found.", { gameId });
  }

  const snapshot = getGameStateSnapshot(savedGame.snapshot);

  if (snapshot?.status === "FINAL") {
    return { state: snapshot, status: savedGame.status };
  }

  const gameDetail = await findScheduledGameDetail(gameId, account);
  return {
    state: gameDetail ? buildFinalGameStateFromPersistedStats(gameDetail) : null,
    status: savedGame.status,
  };
}

async function findScheduledGameSnapshot(gameId: string, account: TeamAccount) {
  const prisma = getPrisma();
  return prisma.game.findFirst({
    where: { id: gameId, team: { ownerUid: account.uid } },
    select: { snapshot: true, status: true },
  });
}

async function findScheduledGameDetail(gameId: string, account: TeamAccount) {
  const prisma = getPrisma();
  return prisma.game.findFirst({
    where: { id: gameId, team: { ownerUid: account.uid } },
    include: {
      atBats: {
        orderBy: { createdAt: "asc" },
        include: {
          batter: { select: { name: true } },
          runnerAdvancements: {
            include: { player: { select: { name: true } } },
          },
        },
      },
      lineup: {
        orderBy: [{ battingOrderPosition: "asc" }, { createdAt: "asc" }],
        include: {
          player: {
            include: {
              seasonStats: {
                where: { season: currentSeasonYear },
                take: 1,
              },
            },
          },
        },
      },
      rules: true,
      stats: true,
    },
  });
}

function getGameStateSnapshot(snapshot: Prisma.JsonValue | null): GameState | null {
  return isGameStateSnapshot(snapshot) ? snapshot as unknown as GameState : null;
}

function isGameStateSnapshot(snapshot: Prisma.JsonValue | null) {
  return isRecord(snapshot)
    && typeof snapshot.status === "string"
    && Array.isArray(snapshot.lineup)
    && isRecord(snapshot.statsByPlayerId)
    && Array.isArray(snapshot.plays);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

type PreparationPlayer = { id: string; gender: PrismaPlayerGender };

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

function getLoadedGameRules(rules: Parameters<typeof fromRuleData>[0] | null) {
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

function validatePreparedLineup(
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

function validateStartingDefense(
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

function validatePersistedStartPreparation(
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

function getPrismaFirstDefensiveHalf(isHome: boolean) {
  return isHome ? "TOP" as const : "BOTTOM" as const;
}

function assertEditable(status: PrismaGameStatus | undefined) {
  if (status === PrismaGameStatus.FINAL || status === PrismaGameStatus.CANCELLED || status === PrismaGameStatus.IN_PROGRESS) {
    throw new AppError("SCHEDULE_ENTRY_READ_ONLY", "Started, completed, and cancelled schedule entries cannot be removed.", 409);
  }
}

function assertImmutableEntryUnchanged(
  existing: { id: string; position: number; kind: PrismaScheduleWeekKind; localDate: string; game: { opponent: string; date: Date; isHome: boolean } | null },
  requested: ScheduleWeekInput,
  position: number,
  timeZone: string,
) {
  const unchanged = isSameImmutableBase(existing, requested, position)
    && isSameImmutableScheduleGame(existing, requested, timeZone);

  if (!unchanged) throw new AppError("SCHEDULE_ENTRY_READ_ONLY", "Started, completed, and cancelled entries are read-only.", 409);
}

function isSameImmutableBase(
  existing: { position: number; kind: PrismaScheduleWeekKind; localDate: string },
  requested: ScheduleWeekInput,
  position: number,
) {
  return existing.position === position
    && existing.localDate === requested.localDate
    && existing.kind === requested.kind;
}

function isSameImmutableScheduleGame(
  existing: { game: { opponent: string; date: Date; isHome: boolean } | null },
  requested: ScheduleWeekInput,
  timeZone: string,
) {
  if (requested.kind === "BYE") {
    return true;
  }

  return Boolean(existing.game && isSameImmutableGameDetails(existing.game, requested, timeZone));
}

function isSameImmutableGameDetails(
  game: { opponent: string; date: Date; isHome: boolean },
  requested: GameScheduleWeekInput,
  timeZone: string,
) {
  return [
    game.opponent === requested.opponent.trim(),
    game.isHome === requested.isHome,
    isSameRequestedGameStart(game.date, requested, timeZone),
  ].every(Boolean);
}

function isSameRequestedGameStart(date: Date, requested: GameScheduleWeekInput, timeZone: string) {
  const requestedStart = zonedGameStart(requested.localDate, requested.startTime, timeZone);
  return date.getTime() === requestedStart?.getTime();
}

function formatStartTime(date: Date, timeZone: string) {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(date);
  const startTime = `${hour}:00`;
  return allowedGameStartTimes.includes(startTime as never) ? startTime as "19:00" | "20:00" | "21:00" : "19:00";
}

function mapPreparationStatus(status: GamePreparationInput["status"]) {
  if (status === "GENERATED") return PrismaGamePreparationStatus.GENERATED;
  if (status === "ACCEPTED") return PrismaGamePreparationStatus.ACCEPTED;
  return PrismaGamePreparationStatus.SETUP;
}

function toRuleData(rules: GameRules) {
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

const homeRunLimitOutcomeToPrisma: Record<GameRules["afterHomeRunLimit"], "OUT" | "SINGLE" | "OTHER"> = {
  Out: "OUT",
  Single: "SINGLE",
  Other: "OTHER",
};

function fromRuleData(rules: {
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

const homeRunLimitOutcomeFromPrisma: Record<"OUT" | "SINGLE" | "OTHER", GameRules["afterHomeRunLimit"]> = {
  OUT: "Out",
  SINGLE: "Single",
  OTHER: "Other",
};

function toPrismaDefensivePosition(position: DefensivePosition) {
  return ({ P: "P", C: "C", "1B": "FIRST_BASE", "2B": "SECOND_BASE", SS: "SHORTSTOP", "3B": "THIRD_BASE", LF: "LEFT_FIELD", LC: "LEFT_CENTER", RC: "RIGHT_CENTER", RF: "RIGHT_FIELD" } as const)[position];
}

function fromPrismaDefensivePosition(position: string): DefensivePosition {
  return ({ P: "P", C: "C", FIRST_BASE: "1B", SECOND_BASE: "2B", SHORTSTOP: "SS", THIRD_BASE: "3B", LEFT_FIELD: "LF", LEFT_CENTER: "LC", RIGHT_CENTER: "RC", RIGHT_FIELD: "RF" } as Record<string, DefensivePosition>)[position];
}

function toPrismaDefensiveHalf(half: DefensiveAlignment["half"]) {
  return half === "Top" ? "TOP" as const : "BOTTOM" as const;
}

function fromPrismaDefensiveHalf(half: "TOP" | "BOTTOM") {
  return half === "TOP" ? "Top" as const : "Bottom" as const;
}

function fromPrismaDefensiveAlignment(alignment: {
  id: string;
  inning: number;
  half: "TOP" | "BOTTOM";
  updatedAt: Date;
  slots: Array<{ position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null; player: { name: string } | null }>;
}, selectedPlayerIds: string[]): DefensiveAlignment {
  const assignedIds = getPrismaAssignedDefensivePlayerIds(alignment.slots);
  return {
    id: alignment.id,
    inning: alignment.inning,
    half: fromPrismaDefensiveHalf(alignment.half),
    slots: Object.fromEntries(alignment.slots.map(fromPrismaDefensiveSlotEntry)),
    benchPlayerIds: selectedPlayerIds.filter((playerId) => !assignedIds.has(playerId)),
    updatedAt: alignment.updatedAt.toISOString(),
  };
}

function getPrismaAssignedDefensivePlayerIds(slots: Array<{ playerId: string | null }>) {
  return new Set(slots.flatMap((slot) => slot.playerId ? [slot.playerId] : []));
}

function fromPrismaDefensiveSlotEntry(slot: { position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null; player: { name: string } | null }) {
  return [
    fromPrismaDefensivePosition(slot.position),
    fromPrismaDefensiveSlot(slot),
  ] as const;
}

function fromPrismaDefensiveSlot(slot: { status: "ASSIGNED" | "VACANT"; playerId: string | null; player: { name: string } | null }) {
  if (isAssignedPrismaDefensiveSlot(slot)) {
    return {
      status: "ASSIGNED" as const,
      playerId: slot.playerId,
      playerName: getPrismaDefensivePlayerName(slot.player),
    };
  }

  return { status: "VACANT" as const };
}

function isAssignedPrismaDefensiveSlot(
  slot: { status: "ASSIGNED" | "VACANT"; playerId: string | null },
): slot is { status: "ASSIGNED"; playerId: string } {
  return slot.status === "ASSIGNED" && Boolean(slot.playerId);
}

function getPrismaDefensivePlayerName(player: { name: string } | null) {
  return player?.name ?? "Player";
}

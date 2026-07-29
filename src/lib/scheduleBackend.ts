import { Prisma } from "@/generated/prisma/client";
import {
  GameStatus as PrismaGameStatus,
  ScheduleWeekKind as PrismaScheduleWeekKind,
} from "@/generated/prisma/enums";
import { AppError, notFoundError, validationError } from "@/lib/appErrors";
import { getPrisma } from "@/lib/prisma";
import {
  allowedGameStartTimes,
  validateScheduleInput,
  zonedGameStart,
} from "@/lib/scheduleRules";
import type { TeamAccount } from "@/lib/teamAccount";
import type { ScheduleWeekInput, TeamSchedule } from "@/types/schedule";

export {
  authorizeScheduledGameStart,
  loadGamePreparation,
  saveGamePreparation,
} from "./gamePreparationBackend.ts";
export type { GamePreparationInput } from "./gamePreparationBackend.ts";

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
            include: { _count: { select: { lineup: true, atBats: true } } },
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
      };
    }),
  };
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
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({
    where: { id: gameId, team: { ownerUid: account.uid } },
    select: { snapshot: true, status: true },
  });
  if (!game) throw notFoundError("TEAM_NOT_FOUND", "Game not found.", { gameId });
  return { state: game.snapshot, status: game.status };
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

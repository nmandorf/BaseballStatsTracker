import { Prisma } from "@/generated/prisma/client";
import {
  GamePreparationStatus as PrismaGamePreparationStatus,
  GameStatus as PrismaGameStatus,
  PlayerGender as PrismaPlayerGender,
  ScheduleWeekKind as PrismaScheduleWeekKind,
} from "@/generated/prisma/enums";
import { AppError, notFoundError, validationError } from "@/lib/appErrors";
import { defensivePositions, minimumFemaleDefenders } from "@/lib/defenseEngine";
import { normalizeGameRules } from "@/lib/gameRules";
import { getPrisma } from "@/lib/prisma";
import { allowedGameStartTimes, getGameStartEligibility, validateScheduleInput, zonedGameStart } from "@/lib/scheduleRules";
import type { TeamAccount } from "@/lib/teamAccount";
import type { GameRules } from "@/types/game";
import type { DefensiveAlignment, DefensivePosition } from "@/types/defense";
import type { ScheduleWeekInput, TeamSchedule } from "@/types/schedule";

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

  await prisma.$transaction(async (tx) => {
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

    const season = team.seasons[0] ?? await tx.season.create({
      data: { teamId: team.id, year: currentSeasonYear, label: `${currentSeasonYear} Season` },
    });
    const existingById = new Map(team.scheduleWeeks.map((week) => [week.id, week]));
    const requestedIds = new Set(input.weeks.flatMap((week) => week.id ? [week.id] : []));

    for (const existing of team.scheduleWeeks) {
      await tx.scheduleWeek.update({
        where: { id: existing.id },
        data: { position: existing.position + 10_000 },
      });

      if (!requestedIds.has(existing.id)) {
        assertEditable(existing.game?.status);
        await tx.scheduleWeek.delete({ where: { id: existing.id } });
        if (existing.gameId) await tx.game.delete({ where: { id: existing.gameId } });
      }
    }

    for (const [index, requested] of input.weeks.entries()) {
      const existing = requested.id ? existingById.get(requested.id) : undefined;

      if (
        existing?.game?.status === PrismaGameStatus.FINAL ||
        existing?.game?.status === PrismaGameStatus.CANCELLED ||
        existing?.game?.status === PrismaGameStatus.IN_PROGRESS
      ) {
        assertImmutableEntryUnchanged(existing, requested, index + 1, input.timeZone);
        await tx.scheduleWeek.update({ where: { id: existing.id }, data: { position: index + 1 } });
        continue;
      }

      if (requested.kind === "BYE") {
        if (existing?.gameId) {
          if (existing.game?._count.lineup && !requested.discardPreparation) {
            throw validationError("SCHEDULE_WEEK_INVALID", "Confirm before replacing a prepared game with a bye.");
          }
          await tx.scheduleWeek.update({ where: { id: existing.id }, data: { gameId: null } });
          await tx.game.delete({ where: { id: existing.gameId } });
        }

        if (existing) {
          await tx.scheduleWeek.update({
            where: { id: existing.id },
            data: { kind: PrismaScheduleWeekKind.BYE, localDate: requested.localDate, position: index + 1 },
          });
        } else {
          await tx.scheduleWeek.create({
            data: { teamId: team.id, seasonId: season.id, position: index + 1, kind: PrismaScheduleWeekKind.BYE, localDate: requested.localDate },
          });
        }
        continue;
      }

      const scheduledStartAt = zonedGameStart(requested.localDate, requested.startTime, input.timeZone);
      if (!scheduledStartAt) throw validationError("SCHEDULE_WEEK_INVALID", `Week ${index + 1} has an invalid start time.`);

      if (existing?.gameId) {
        await tx.game.update({
          where: { id: existing.gameId },
          data: { opponent: requested.opponent.trim(), date: scheduledStartAt, isHome: requested.isHome },
        });
        await tx.scheduleWeek.update({
          where: { id: existing.id },
          data: { kind: PrismaScheduleWeekKind.GAME, localDate: requested.localDate, position: index + 1 },
        });
      } else {
        const game = await tx.game.create({
          data: { teamId: team.id, seasonId: season.id, opponent: requested.opponent.trim(), date: scheduledStartAt, isHome: requested.isHome },
        });

        if (existing) {
          await tx.scheduleWeek.update({
            where: { id: existing.id },
            data: { kind: PrismaScheduleWeekKind.GAME, localDate: requested.localDate, position: index + 1, gameId: game.id },
          });
        } else {
          await tx.scheduleWeek.create({
            data: { teamId: team.id, seasonId: season.id, position: index + 1, kind: PrismaScheduleWeekKind.GAME, localDate: requested.localDate, gameId: game.id },
          });
        }
      }
    }

    await tx.team.update({
      where: { id: team.id },
      data: { timeZone: input.timeZone, scheduleSetupCompleted: true },
    });
  });

  return loadTeamSchedule(input.teamId, input.account);
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

export type GamePreparationInput = {
  lineupSize: "9" | "10" | "11" | "Everyone";
  selectedPlayerIds: string[];
  generatedLineupIds: string[];
  acceptedLineupIds: string[];
  gameRules: GameRules;
  status: "SETUP" | "GENERATED" | "ACCEPTED";
  startingDefense?: DefensiveAlignment | null;
};

export async function saveGamePreparation(gameId: string, input: GamePreparationInput, account: TeamAccount) {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({ where: { id: gameId, team: { ownerUid: account.uid } }, select: { id: true, status: true, teamId: true, isHome: true } });
  if (!game) throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found.", { gameId });
  if (game.status !== PrismaGameStatus.SCHEDULED) throw new AppError("SCHEDULE_ENTRY_READ_ONLY", "This game's preparation is read-only.", 409);

  if (!(["9", "10", "11", "Everyone"] as const).includes(input.lineupSize)) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Choose a valid batting lineup size.");
  }
  if (!(["SETUP", "GENERATED", "ACCEPTED"] as const).includes(input.status)) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Game preparation has an invalid status.");
  }
  if (new Set(input.selectedPlayerIds).size !== input.selectedPlayerIds.length) {
    throw validationError("SCHEDULE_WEEK_INVALID", "A player can only be selected once.");
  }

  const validPlayers = await prisma.player.findMany({
    where: { teamId: game.teamId, id: { in: input.selectedPlayerIds } },
    select: { id: true, gender: true },
  });
  if (validPlayers.length !== input.selectedPlayerIds.length) throw validationError("SCHEDULE_WEEK_INVALID", "Selected players must belong to this team.");

  const order = input.status === "ACCEPTED" ? input.acceptedLineupIds : input.generatedLineupIds;
  validatePreparedLineup(input, order, validPlayers);
  if (input.startingDefense && input.status !== "SETUP") {
    validateStartingDefense(input.startingDefense, order, validPlayers, game.isHome);
  }
  const positionById = new Map(order.map((playerId, index) => [playerId, index + 1]));
  const rules = normalizeGameRules(input.gameRules);

  await prisma.$transaction(async (tx) => {
    await tx.gameLineup.deleteMany({ where: { gameId } });
    if (input.selectedPlayerIds.length) {
      await tx.gameLineup.createMany({
        data: input.selectedPlayerIds.map((playerId) => ({ gameId, playerId, battingOrderPosition: positionById.get(playerId) ?? null, isActive: true })),
      });
    }
    await tx.gameRuleSettings.upsert({
      where: { gameId },
      create: { gameId, ...toRuleData(rules) },
      update: toRuleData(rules),
    });
    await tx.game.update({ where: { id: gameId }, data: { preparationStatus: mapPreparationStatus(input.status) } });
    if (input.startingDefense) {
      const half = input.startingDefense.half === "Top" ? "TOP" as const : "BOTTOM" as const;
      await tx.defensiveAlignment.deleteMany({ where: { gameId, inning: input.startingDefense.inning, half } });
      await tx.defensiveAlignment.create({
        data: {
          gameId,
          inning: input.startingDefense.inning,
          half,
          slots: {
            create: Object.entries(input.startingDefense.slots).map(([position, slot]) => ({
              position: toPrismaDefensivePosition(position as DefensivePosition),
              status: slot?.status === "ASSIGNED" ? "ASSIGNED" as const : "VACANT" as const,
              playerId: slot?.status === "ASSIGNED" ? slot.playerId : null,
            })),
          },
        },
      });
    }
  });
}

export async function loadGamePreparation(gameId: string, account: TeamAccount) {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({
    where: { id: gameId, team: { ownerUid: account.uid } },
    include: {
      lineup: { orderBy: { battingOrderPosition: "asc" } },
      rules: true,
      defensiveAlignments: { orderBy: [{ inning: "asc" }, { createdAt: "asc" }], include: { slots: { include: { player: { select: { name: true } } } } } },
    },
  });
  if (!game) throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found.", { gameId });
  const firstDefensiveHalf = getPrismaFirstDefensiveHalf(game.isHome);
  const startingAlignment = game.defensiveAlignments.find((alignment) => (
    alignment.inning === 1 && alignment.half === firstDefensiveHalf
  ));
  const selectedPlayerIds = game.lineup.map((row) => row.playerId);
  const orderedIds = getOrderedLineupIds(game.lineup);
  const lineupSize = getLineupSize(selectedPlayerIds);
  const status = game.preparationStatus === PrismaGamePreparationStatus.ACCEPTED || game.preparationStatus === PrismaGamePreparationStatus.STARTED
    ? "ACCEPTED" as const
    : game.preparationStatus === PrismaGamePreparationStatus.GENERATED
      ? "GENERATED" as const
      : "SETUP" as const;

  return {
    gameId: game.id,
    opponent: game.opponent,
    isHome: game.isHome,
    lineupSize,
    selectedPlayerIds,
    generatedLineupIds: orderedIds,
    acceptedLineupIds: status === "ACCEPTED" ? orderedIds : [],
    gameRules: game.rules ? fromRuleData(game.rules) : normalizeGameRules(undefined),
    startingDefense: startingAlignment ? fromPrismaDefensiveAlignment(startingAlignment, selectedPlayerIds) : null,
    status,
    updatedAt: game.updatedAt.toISOString(),
  };
}

export async function authorizeScheduledGameStart(gameId: string, account: TeamAccount, now = new Date()) {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
    const game = await tx.game.findFirst({
      where: { id: gameId, team: { ownerUid: account.uid } },
      include: {
        lineup: { include: { player: { select: { gender: true } } }, orderBy: { battingOrderPosition: "asc" } },
        rules: true,
        defensiveAlignments: { include: { slots: { include: { player: { select: { name: true } } } } }, orderBy: [{ inning: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!game) throw notFoundError("TEAM_NOT_FOUND", "Scheduled game not found.", { gameId });

    const otherActive = await tx.game.findFirst({
      where: { teamId: game.teamId, status: PrismaGameStatus.IN_PROGRESS, id: { not: game.id } },
      select: { id: true },
    });
    const eligibility = getGameStartEligibility({
      scheduledStartAt: game.date,
      status: game.status,
      trustedNow: now,
      hasAnotherActiveGame: Boolean(otherActive),
    });

    if (!eligibility.allowed) throw new AppError(eligibility.code, eligibility.message, 409, { eligibleAt: eligibility.eligibleAt, activeGameId: otherActive?.id ?? null });
    const acceptedLineup = game.lineup.filter((row) => row.battingOrderPosition !== null);
    const acceptedPlayerIds = acceptedLineup.map((row) => row.playerId);
    const playerGenders = game.lineup.map((row) => ({ id: row.playerId, gender: row.player.gender }));
    if (game.preparationStatus !== PrismaGamePreparationStatus.ACCEPTED) {
      throw new AppError("GAME_NOT_STARTABLE", "Accept a valid lineup before starting the game.", 409);
    }
    const firstDefensiveHalf = getPrismaFirstDefensiveHalf(game.isHome);
    const startingAlignment = game.defensiveAlignments.find((alignment) => (
      alignment.inning === 1 && alignment.half === firstDefensiveHalf
    ));
    validatePersistedStartPreparation(acceptedLineup, startingAlignment, acceptedPlayerIds, playerGenders, game.isHome);

    await tx.game.update({
      where: { id: game.id },
      data: { status: PrismaGameStatus.IN_PROGRESS, preparationStatus: PrismaGamePreparationStatus.STARTED },
    });
    return {
      gameId: game.id,
      startedAt: now.toISOString(),
      preparation: buildStartedGamePreparation(game, startingAlignment, now),
    };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError("TEAM_GAME_ALREADY_IN_PROGRESS", "Another game start changed at the same time. Refresh the schedule and try again.", 409);
    }
    throw error;
  }
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
  players: Array<{ id: string; gender: PrismaPlayerGender }>,
) {
  if (input.status === "SETUP") return;
  const selectedIds = new Set(input.selectedPlayerIds);
  const targetCount = input.lineupSize === "Everyone" ? input.selectedPlayerIds.length : Number(input.lineupSize);
  if (input.selectedPlayerIds.length < targetCount || targetCount < 9) {
    throw validationError("SCHEDULE_WEEK_INVALID", `Select at least ${targetCount} players for this lineup.`);
  }
  if (order.length !== targetCount || new Set(order).size !== order.length || order.some((playerId) => !selectedIds.has(playerId))) {
    throw validationError("SCHEDULE_WEEK_INVALID", "The batting order must contain the chosen number of unique selected players.");
  }
  const genderById = new Map(players.map((player) => [player.id, player.gender]));
  if (order.some((playerId) => genderById.get(playerId) === PrismaPlayerGender.UNKNOWN)) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Set every lineup player's gender before accepting the order.");
  }
  if (genderById.get(order[0]) !== PrismaPlayerGender.FEMALE) {
    throw validationError("SCHEDULE_WEEK_INVALID", "A female player must lead off before this lineup can be accepted.");
  }
}

function validateStartingDefense(
  alignment: DefensiveAlignment | null | undefined,
  lineupIds: string[],
  players: Array<{ id: string; gender: PrismaPlayerGender }>,
  isHome: boolean,
) {
  if (!alignment || alignment.inning !== 1 || alignment.half !== (isHome ? "Top" : "Bottom")) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Save a starting defense for the first fielding half before accepting the lineup.");
  }
  const lineupIdSet = new Set(lineupIds);
  const assignedIds = defensivePositions.flatMap((position) => {
    const slot = alignment.slots[position];
    return slot?.status === "ASSIGNED" ? [slot.playerId] : [];
  });
  const requiredAssignedCount = Math.min(defensivePositions.length, lineupIds.length);
  if (
    assignedIds.length !== requiredAssignedCount ||
    new Set(assignedIds).size !== assignedIds.length ||
    assignedIds.some((playerId) => !lineupIdSet.has(playerId)) ||
    alignment.slots.P?.status !== "ASSIGNED"
  ) {
    throw validationError("SCHEDULE_WEEK_INVALID", "Starting defense must use unique lineup players and include a pitcher at every available position.");
  }
  const genderById = new Map(players.map((player) => [player.id, player.gender]));
  const femaleDefenders = assignedIds.filter((playerId) => genderById.get(playerId) === PrismaPlayerGender.FEMALE).length;
  if (femaleDefenders < minimumFemaleDefenders) {
    throw validationError("SCHEDULE_WEEK_INVALID", `Assign at least ${minimumFemaleDefenders} female players on defense.`);
  }
}

function validatePersistedStartPreparation(
  lineup: Array<{ battingOrderPosition: number | null; player: { gender: PrismaPlayerGender } }>,
  persistedAlignment: { inning: number; half: "TOP" | "BOTTOM"; slots: Array<{ position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null }> } | undefined,
  lineupIds: string[],
  players: Array<{ id: string; gender: PrismaPlayerGender }>,
  isHome: boolean,
) {
  if (lineup.length < 9 || lineup[0]?.battingOrderPosition !== 1 || lineup[0]?.player.gender !== PrismaPlayerGender.FEMALE) {
    throw new AppError("GAME_NOT_STARTABLE", "The accepted batting order is incomplete or no longer league-compliant.", 409);
  }
  const positions = lineup.map((row) => row.battingOrderPosition);
  if (positions.some((position, index) => position !== index + 1)) {
    throw new AppError("GAME_NOT_STARTABLE", "The accepted batting order has missing positions.", 409);
  }
  if (!persistedAlignment) {
    throw new AppError("GAME_NOT_STARTABLE", "Save a starting defense before starting the game.", 409);
  }
  const alignment = {
    id: "persisted",
    inning: persistedAlignment.inning,
    half: persistedAlignment.half === "TOP" ? "Top" as const : "Bottom" as const,
    slots: Object.fromEntries(persistedAlignment.slots.map((slot) => [fromPrismaDefensivePosition(slot.position), slot.status === "ASSIGNED" && slot.playerId ? { status: "ASSIGNED" as const, playerId: slot.playerId, playerName: "Player" } : { status: "VACANT" as const }])),
    benchPlayerIds: [],
    updatedAt: new Date(0).toISOString(),
  } satisfies DefensiveAlignment;
  try {
    validateStartingDefense(alignment, lineupIds, players, isHome);
  } catch {
    throw new AppError("GAME_NOT_STARTABLE", "The starting defense is incomplete or uses invalid players.", 409);
  }
}

function getPrismaFirstDefensiveHalf(isHome: boolean) {
  return isHome ? "TOP" as const : "BOTTOM" as const;
}

function assertEditable(status: PrismaGameStatus | undefined) {
  if (status === PrismaGameStatus.FINAL || status === PrismaGameStatus.CANCELLED || status === PrismaGameStatus.IN_PROGRESS) {
    throw new AppError("SCHEDULE_ENTRY_READ_ONLY", "Started, completed, and cancelled schedule entries cannot be removed.", 409);
  }
}

function assertImmutableEntryUnchanged(existing: { id: string; position: number; kind: PrismaScheduleWeekKind; localDate: string; game: { opponent: string; date: Date; isHome: boolean } | null }, requested: ScheduleWeekInput, position: number, timeZone: string) {
  const sameBase = existing.position === position && existing.localDate === requested.localDate && existing.kind === requested.kind;
  const sameGame = requested.kind === "GAME" && existing.game
    ? existing.game.opponent === requested.opponent.trim() && existing.game.isHome === requested.isHome && existing.game.date.getTime() === zonedGameStart(requested.localDate, requested.startTime, timeZone)?.getTime()
    : requested.kind === "BYE";
  if (!sameBase || !sameGame) throw new AppError("SCHEDULE_ENTRY_READ_ONLY", "Started, completed, and cancelled entries are read-only.", 409);
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
    afterHomeRunLimit: rules.afterHomeRunLimit === "Single" ? "SINGLE" as const : rules.afterHomeRunLimit === "Other" ? "OTHER" as const : "OUT" as const,
    runLimitPerInning: rules.runLimitPerInning,
    mercyRule: rules.mercyRule,
    courtesyRunnersAllowed: rules.courtesyRunnersAllowed,
    walksAllowed: rules.walksAllowed,
    sacFliesTracked: rules.sacFliesTracked,
    errorsTracked: rules.errorsTracked,
    fieldersChoicesTracked: rules.fieldersChoicesTracked,
  };
}

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
    afterHomeRunLimit: rules.afterHomeRunLimit === "SINGLE" ? "Single" : rules.afterHomeRunLimit === "OTHER" ? "Other" : "Out",
    mercyRule: rules.mercyRule ?? undefined,
  });
}

function toPrismaDefensivePosition(position: DefensivePosition) {
  return ({ P: "P", C: "C", "1B": "FIRST_BASE", "2B": "SECOND_BASE", SS: "SHORTSTOP", "3B": "THIRD_BASE", LF: "LEFT_FIELD", LC: "LEFT_CENTER", RC: "RIGHT_CENTER", RF: "RIGHT_FIELD" } as const)[position];
}

function fromPrismaDefensivePosition(position: string): DefensivePosition {
  return ({ P: "P", C: "C", FIRST_BASE: "1B", SECOND_BASE: "2B", SHORTSTOP: "SS", THIRD_BASE: "3B", LEFT_FIELD: "LF", LEFT_CENTER: "LC", RIGHT_CENTER: "RC", RIGHT_FIELD: "RF" } as Record<string, DefensivePosition>)[position];
}

function fromPrismaDefensiveAlignment(alignment: {
  id: string;
  inning: number;
  half: "TOP" | "BOTTOM";
  updatedAt: Date;
  slots: Array<{ position: string; status: "ASSIGNED" | "VACANT"; playerId: string | null; player: { name: string } | null }>;
}, selectedPlayerIds: string[]): DefensiveAlignment {
  const assignedIds = new Set(alignment.slots.flatMap((slot) => slot.playerId ? [slot.playerId] : []));
  return {
    id: alignment.id,
    inning: alignment.inning,
    half: alignment.half === "TOP" ? "Top" : "Bottom",
    slots: Object.fromEntries(alignment.slots.map((slot) => [fromPrismaDefensivePosition(slot.position), slot.status === "ASSIGNED" && slot.playerId ? { status: "ASSIGNED" as const, playerId: slot.playerId, playerName: slot.player?.name ?? "Player" } : { status: "VACANT" as const }])),
    benchPlayerIds: selectedPlayerIds.filter((playerId) => !assignedIds.has(playerId)),
    updatedAt: alignment.updatedAt.toISOString(),
  };
}

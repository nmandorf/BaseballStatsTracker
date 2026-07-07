import { getNextScheduleWeeks, gameStartLeadTimeMs } from "@/lib/scheduleRules";
import type { ScheduleWeek, TeamSchedule } from "@/types/schedule";

type GameScheduleWeek = Extract<ScheduleWeek, { kind: "GAME" }>;
type PreparationStatus = GameScheduleWeek["preparationStatus"];

export type HomeGameDayState = {
  byeDate: string | null;
  canStart: boolean;
  eligibleAt: number;
  game: GameScheduleWeek | null;
  nowMs: number;
  preparationLabel: string;
  statusLabel: string;
  statusTone: "hold" | "ready";
};

const preparationLabels: Record<PreparationStatus, string> = {
  ACCEPTED: "Lineup accepted",
  GENERATED: "Lineup generated",
  SETUP: "Lineup not ready",
  STARTED: "Game started",
};

export function getHomeGameDayState(schedule: TeamSchedule, now: Date): HomeGameDayState {
  const { next, nextGame } = getNextScheduleWeeks(schedule.weeks, now, schedule.timeZone ?? "UTC");
  const game = getNextGame(next, nextGame);
  const eligibleAt = getGameStartEligibleAt(game);
  const nowMs = now.getTime();

  return {
    byeDate: getByeDate(next),
    canStart: canStartScheduledGame(game, nowMs, eligibleAt),
    eligibleAt,
    game,
    nowMs,
    preparationLabel: getPreparationLabel(game),
    statusLabel: getStatusLabel(next, game),
    statusTone: getStatusTone(game),
  };
}

export function formatScheduleDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatScheduleTime(time: string) {
  return `${Number(time.slice(0, 2)) - 12}:00 PM`;
}

function getNextGame(next: ScheduleWeek | null, nextGame: ScheduleWeek | null): GameScheduleWeek | null {
  return [next, nextGame].find(isGameScheduleWeek) ?? null;
}

function isGameScheduleWeek(week: ScheduleWeek | null): week is GameScheduleWeek {
  return week !== null && week.kind === "GAME";
}

function getGameStartEligibleAt(game: GameScheduleWeek | null) {
  return game
    ? Date.parse(game.scheduledStartAt) - gameStartLeadTimeMs
    : Number.POSITIVE_INFINITY;
}

function canStartScheduledGame(game: GameScheduleWeek | null, nowMs: number, eligibleAt: number) {
  return Boolean(game && game.status === "SCHEDULED" && nowMs >= eligibleAt);
}

function getByeDate(next: ScheduleWeek | null) {
  return next?.kind === "BYE" ? next.localDate : null;
}

function getStatusLabel(next: ScheduleWeek | null, game: GameScheduleWeek | null) {
  if (next?.kind === "BYE") {
    return "Bye week";
  }

  return game ? "Next game" : "Schedule complete";
}

function getPreparationLabel(game: GameScheduleWeek | null) {
  return game ? preparationLabels[game.preparationStatus] : "";
}

function getStatusTone(game: GameScheduleWeek | null): HomeGameDayState["statusTone"] {
  return game ? "ready" : "hold";
}

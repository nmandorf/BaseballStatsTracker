import type {
  AllowedGameStartTime,
  GameStartEligibility,
  ScheduleGameStatus,
  ScheduleWeek,
  ScheduleWeekInput,
} from "@/types/schedule";

export const allowedGameStartTimes: AllowedGameStartTime[] = ["19:00", "20:00", "21:00"];
export const gameStartLeadTimeMs = 5 * 60 * 1000;
export const commonTeamTimeZones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona Time" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "UTC", label: "UTC" },
] as const;

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return Boolean(timeZone.trim());
  } catch {
    return false;
  }
}

export function getDetectedTimeZone() {
  if (typeof Intl === "undefined") {
    return null;
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return typeof timeZone === "string" && isValidTimeZone(timeZone) ? timeZone : null;
}

export function zonedGameStart(localDate: string, startTime: AllowedGameStartTime, timeZone: string) {
  if (!isValidGameStartInput(localDate, startTime, timeZone)) {
    return null;
  }

  const start = parseGameStartInput(localDate, startTime);
  const intendedUtcShape = Date.UTC(start.year, start.month - 1, start.day, start.hour, 0, 0);
  const candidate = resolveZonedUtcCandidate(intendedUtcShape, timeZone);
  const resolved = getZonedParts(new Date(candidate), timeZone);

  return representsRequestedGameStart(resolved, start) ? new Date(candidate) : null;
}

export function validateScheduleInput(weeks: ScheduleWeekInput[], timeZone: string) {
  const errors: string[] = [];

  if (!isValidTimeZone(timeZone)) {
    errors.push("Select a valid team timezone.");
  }

  if (!weeks.length) {
    errors.push("Add at least one schedule week.");
  }

  if (!weeks.some((week) => week.kind === "GAME")) {
    errors.push("Add at least one playable game.");
  }

  weeks.forEach((week, index) => {
    errors.push(...getScheduleWeekErrors(week, index, timeZone));
  });

  return errors;
}

export function getGameStartEligibility(input: {
  scheduledStartAt: Date;
  status: ScheduleGameStatus;
  trustedNow: Date | null;
  hasAnotherActiveGame: boolean;
}): GameStartEligibility {
  const eligibleAt = new Date(input.scheduledStartAt.getTime() - gameStartLeadTimeMs).toISOString();
  const failures = [
    getUnverifiedGameStartFailure(input, eligibleAt),
    getGameStatusStartFailure(input),
    getActiveGameStartFailure(input, eligibleAt),
    getEarlyGameStartFailure(input, eligibleAt),
  ];
  const failure = failures.find(Boolean);

  return failure ?? { allowed: true, eligibleAt };
}

function isValidGameStartInput(localDate: string, startTime: AllowedGameStartTime, timeZone: string) {
  return isCalendarDate(localDate)
    && allowedGameStartTimes.includes(startTime)
    && isValidTimeZone(timeZone);
}

function parseGameStartInput(localDate: string, startTime: AllowedGameStartTime) {
  const [year, month, day] = localDate.split("-").map(Number);

  return {
    year,
    month,
    day,
    hour: Number(startTime.slice(0, 2)),
  };
}

function resolveZonedUtcCandidate(intendedUtcShape: number, timeZone: string) {
  let candidate = intendedUtcShape;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(new Date(candidate), timeZone);
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    candidate -= representedAsUtc - intendedUtcShape;
  }

  return candidate;
}

function representsRequestedGameStart(
  resolved: { year: number; month: number; day: number; hour: number; minute: number },
  requested: { year: number; month: number; day: number; hour: number },
) {
  return [
    resolved.year === requested.year,
    resolved.month === requested.month,
    resolved.day === requested.day,
    resolved.hour === requested.hour,
    resolved.minute === 0,
  ].every(Boolean);
}

function getScheduleWeekErrors(week: ScheduleWeekInput, index: number, timeZone: string) {
  const label = `Week ${index + 1}`;
  const errors = getBaseScheduleWeekErrors(week, label);

  if (week.kind === "GAME") {
    errors.push(...getScheduleGameErrors(week, label, timeZone));
  }

  return errors;
}

function getBaseScheduleWeekErrors(week: ScheduleWeekInput, label: string) {
  return isCalendarDate(week.localDate) ? [] : [`${label} needs a valid date.`];
}

function getScheduleGameErrors(
  week: Extract<ScheduleWeekInput, { kind: "GAME" }>,
  label: string,
  timeZone: string,
) {
  return [
    ...getOpponentErrors(week, label),
    ...getStartTimeErrors(week, label),
    ...getZonedStartErrors(week, label, timeZone),
  ];
}

function getOpponentErrors(week: Extract<ScheduleWeekInput, { kind: "GAME" }>, label: string) {
  return week.opponent.trim() ? [] : [`${label} needs an opponent.`];
}

function getStartTimeErrors(week: Extract<ScheduleWeekInput, { kind: "GAME" }>, label: string) {
  return allowedGameStartTimes.includes(week.startTime) ? [] : [`${label} needs a supported start time.`];
}

function getZonedStartErrors(
  week: Extract<ScheduleWeekInput, { kind: "GAME" }>,
  label: string,
  timeZone: string,
) {
  return zonedGameStart(week.localDate, week.startTime, timeZone) ? [] : [`${label} could not be scheduled in ${timeZone}.`];
}

type GameStartInput = Parameters<typeof getGameStartEligibility>[0];

function getUnverifiedGameStartFailure(input: GameStartInput, eligibleAt: string): GameStartEligibility | null {
  return input.trustedNow ? null : {
    allowed: false,
    code: "GAME_START_TIME_UNVERIFIED",
    message: "Connect to the internet so game time can be verified.",
    eligibleAt,
  };
}

function getGameStatusStartFailure(input: GameStartInput): GameStartEligibility | null {
  return input.status === "SCHEDULED" ? null : {
    allowed: false,
    code: "GAME_NOT_STARTABLE",
    message: "This game cannot be started from its current status.",
    eligibleAt: null,
  };
}

function getActiveGameStartFailure(input: GameStartInput, eligibleAt: string): GameStartEligibility | null {
  return input.hasAnotherActiveGame ? {
    allowed: false,
    code: "TEAM_GAME_ALREADY_IN_PROGRESS",
    message: "Finish the active game before starting another one.",
    eligibleAt,
  } : null;
}

function getEarlyGameStartFailure(input: GameStartInput, eligibleAt: string): GameStartEligibility | null {
  return input.trustedNow && input.trustedNow.getTime() < Date.parse(eligibleAt) ? {
    allowed: false,
    code: "GAME_START_TOO_EARLY",
    message: "This game unlocks five minutes before its scheduled start.",
    eligibleAt,
  } : null;
}

export function getNextScheduleWeeks(weeks: ScheduleWeek[], now: Date, timeZone = "UTC") {
  const today = getCalendarDateInTimeZone(now, timeZone);
  const upcoming = weeks.filter((week) => {
    if (week.kind === "BYE") return week.localDate >= today;
    return week.status === "SCHEDULED";
  });

  return {
    next: upcoming[0] ?? null,
    nextGame: upcoming.find((week) => week.kind === "GAME") ?? null,
  };
}

function getCalendarDateInTimeZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

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
  if (!isCalendarDate(localDate) || !allowedGameStartTimes.includes(startTime) || !isValidTimeZone(timeZone)) {
    return null;
  }

  const [year, month, day] = localDate.split("-").map(Number);
  const hour = Number(startTime.slice(0, 2));
  const intendedUtcShape = Date.UTC(year, month - 1, day, hour, 0, 0);
  let candidate = intendedUtcShape;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(new Date(candidate), timeZone);
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    candidate -= representedAsUtc - intendedUtcShape;
  }

  const resolved = getZonedParts(new Date(candidate), timeZone);

  if (
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day ||
    resolved.hour !== hour ||
    resolved.minute !== 0
  ) {
    return null;
  }

  return new Date(candidate);
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
    if (!isCalendarDate(week.localDate)) {
      errors.push(`Week ${index + 1} needs a valid date.`);
    }

    if (week.kind === "GAME") {
      if (!week.opponent.trim()) {
        errors.push(`Week ${index + 1} needs an opponent.`);
      }

      if (!allowedGameStartTimes.includes(week.startTime)) {
        errors.push(`Week ${index + 1} needs a supported start time.`);
      }

      if (!zonedGameStart(week.localDate, week.startTime, timeZone)) {
        errors.push(`Week ${index + 1} could not be scheduled in ${timeZone}.`);
      }
    }
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

  if (!input.trustedNow) {
    return {
      allowed: false,
      code: "GAME_START_TIME_UNVERIFIED",
      message: "Connect to the internet so game time can be verified.",
      eligibleAt,
    };
  }

  if (input.status !== "SCHEDULED") {
    return {
      allowed: false,
      code: "GAME_NOT_STARTABLE",
      message: "This game cannot be started from its current status.",
      eligibleAt: null,
    };
  }

  if (input.hasAnotherActiveGame) {
    return {
      allowed: false,
      code: "TEAM_GAME_ALREADY_IN_PROGRESS",
      message: "Finish the active game before starting another one.",
      eligibleAt,
    };
  }

  if (input.trustedNow.getTime() < Date.parse(eligibleAt)) {
    return {
      allowed: false,
      code: "GAME_START_TOO_EARLY",
      message: "This game unlocks five minutes before its scheduled start.",
      eligibleAt,
    };
  }

  return { allowed: true, eligibleAt };
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

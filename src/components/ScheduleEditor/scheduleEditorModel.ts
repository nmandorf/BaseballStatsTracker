import { getDetectedTimeZone } from "@/lib/scheduleRules";
import { getVerifiedTeamAccountHeaders } from "@/lib/teamStorage";
import type { AllowedGameStartTime, ScheduleWeekInput, TeamSchedule } from "@/types/schedule";

export type EditableWeek = {
  id?: string;
  key: string;
  kind: "GAME" | "BYE";
  localDate: string;
  opponent: string;
  startTime: AllowedGameStartTime;
  isHome: boolean;
  discardPreparation?: boolean;
  immutable?: boolean;
  gameId?: string;
  gameStatus?: "SCHEDULED" | "IN_PROGRESS" | "FINAL" | "CANCELLED";
};

export type WeekKind = EditableWeek["kind"];
export type ScheduleEditorStateSetters = {
  setTimeZone: (timeZone: string) => void;
  setWeeks: (weeks: EditableWeek[]) => void;
};

const immutableGameStatuses = new Set(["IN_PROGRESS", "FINAL", "CANCELLED"]);

export function createBlankGame(index: number): EditableWeek {
  return { key: `new-${index}`, kind: "GAME", localDate: "", opponent: "", startTime: "19:00", isHome: true };
}

export function hydrateScheduleEditor(schedule: TeamSchedule | null, setters: ScheduleEditorStateSetters) {
  if (!schedule) {
    return;
  }

  queueMicrotask(() => applyScheduleToEditor(schedule, setters));
}

function applyScheduleToEditor(
  schedule: TeamSchedule,
  { setTimeZone, setWeeks }: ScheduleEditorStateSetters,
) {
  setTimeZone(schedule.timeZone ?? getDetectedTimeZone() ?? "");

  if (schedule.weeks.length) {
    setWeeks(schedule.weeks.map(toEditableWeek));
  }
}

function toEditableWeek(week: TeamSchedule["weeks"][number]): EditableWeek {
  return {
    ...getEditableWeekDetails(week),
    key: week.id,
    immutable: week.kind === "GAME" && immutableGameStatuses.has(week.status),
  };
}

function getEditableWeekDetails(week: TeamSchedule["weeks"][number]): Omit<EditableWeek, "key" | "immutable"> {
  if (week.kind === "GAME") {
    return {
      gameId: week.gameId,
      gameStatus: week.status,
      id: week.id,
      isHome: week.isHome,
      kind: "GAME",
      localDate: week.localDate,
      opponent: week.opponent,
      startTime: week.startTime,
    };
  }

  return {
    id: week.id,
    isHome: true,
    kind: "BYE",
    localDate: week.localDate,
    opponent: "",
    startTime: "19:00",
  };
}

export function getSafeWeekCount(nextCount: number) {
  return Math.max(1, Math.floor(nextCount || 1));
}

export function canUseWeekCount(safeCount: number, immutableCount: number, currentCount: number) {
  if (safeCount < immutableCount) {
    return false;
  }

  return safeCount >= currentCount || window.confirm(`Remove ${currentCount - safeCount} future schedule row(s)?`);
}

export function resizeScheduleWeeks(current: EditableWeek[], safeCount: number) {
  if (safeCount >= current.length) {
    return Array.from({ length: safeCount }, (_, index) => current[index] ?? createBlankGame(index));
  }

  let rowsStillToRemove = current.length - safeCount;
  return current.filter((week, index) => {
    const editableWeeksAfter = current.slice(index + 1).filter((laterWeek) => !laterWeek.immutable).length;
    const shouldKeep = week.immutable || rowsStillToRemove === 0 || editableWeeksAfter >= rowsStillToRemove;

    if (shouldKeep) {
      return true;
    }

    rowsStillToRemove -= 1;
    return false;
  });
}

export function canChangeWeekKind(week: EditableWeek | undefined) {
  return Boolean(week && !week.immutable);
}

export function requiresGameToByeConfirmation(week: EditableWeek | undefined, nextKind: WeekKind) {
  return Boolean(week?.kind === "GAME" && week.id && nextKind === "BYE");
}

export function confirmGameToByeChange() {
  return window.confirm("Changing this game to a bye removes its saved game preparation. Continue?");
}

export function getWeekKindUpdate(kind: WeekKind): Partial<EditableWeek> {
  if (kind === "GAME") {
    return { isHome: true, kind: "GAME", opponent: "", startTime: "19:00" };
  }

  return { discardPreparation: true, kind: "BYE" };
}

export function toScheduleWeekInputs(weeks: EditableWeek[]): ScheduleWeekInput[] {
  return weeks.map((week) => {
    if (week.kind === "GAME") {
      return {
        id: week.id,
        isHome: week.isHome,
        kind: "GAME",
        localDate: week.localDate,
        opponent: week.opponent,
        startTime: week.startTime,
      };
    }

    return {
      discardPreparation: week.discardPreparation,
      id: week.id,
      kind: "BYE",
      localDate: week.localDate,
    };
  });
}

export function getScheduleEditorErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function cancelScheduledGame(gameId: string) {
  const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
    method: "PATCH",
    headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ action: "cancel" }),
  });

  if (response.ok) {
    return null;
  }

  const payload = await response.json() as { error?: { message?: string } };
  return payload.error?.message ?? "Unable to cancel game.";
}

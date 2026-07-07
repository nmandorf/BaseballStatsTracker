"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check } from "lucide-react";
import { allowedGameStartTimes, commonTeamTimeZones, getDetectedTimeZone, isValidTimeZone } from "@/lib/scheduleRules";
import { saveSchedule, useTeamSchedule } from "@/lib/scheduleClient";
import { getVerifiedTeamAccountHeaders } from "@/lib/teamStorage";
import type { AllowedGameStartTime, ScheduleWeekInput, TeamSchedule } from "@/types/schedule";

type EditableWeek = {
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

type WeekKind = EditableWeek["kind"];
type ScheduleEditorStateSetters = {
  setTimeZone: (timeZone: string) => void;
  setWeeks: (weeks: EditableWeek[]) => void;
};

export function ScheduleEditor({
  teamId,
  onSaved,
}: {
  teamId: string;
  onSaved?: (schedule: TeamSchedule) => void;
}) {
  const { schedule, isLoading, error: loadError, reload } = useTeamSchedule(teamId);
  const [timeZone, setTimeZone] = useState("");
  const [weeks, setWeeks] = useState<EditableWeek[]>([createBlankGame(0)]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const immutableCount = useMemo(() => weeks.filter((week) => week.immutable).length, [weeks]);

  useEffect(() => {
    hydrateScheduleEditor(schedule, { setTimeZone, setWeeks });
  }, [schedule]);

  function setWeekCount(nextCount: number) {
    const safeCount = getSafeWeekCount(nextCount);
    if (!canUseWeekCount(safeCount, immutableCount, weeks.length)) return;
    setWeeks((current) => resizeScheduleWeeks(current, safeCount));
  }

  function updateWeek(index: number, update: Partial<EditableWeek>) {
    setWeeks((current) => current.map((week, weekIndex) => weekIndex === index ? { ...week, ...update } as EditableWeek : week));
  }

  function changeKind(index: number, kind: WeekKind) {
    const current = weeks[index];
    if (!canChangeWeekKind(current)) return;
    if (requiresGameToByeConfirmation(current, kind) && !confirmGameToByeChange()) return;
    updateWeek(index, getWeekKindUpdate(kind));
  }

  function submit() {
    if (!isValidTimeZone(timeZone) || isSaving) return;
    void saveScheduleFromEditor({
      onSaved,
      reload,
      setIsSaving,
      setSaveError,
      teamId,
      timeZone,
      weeks,
    });
  }

  async function cancelGame(gameId: string) {
    if (!window.confirm("Cancel this game and keep it in schedule history?")) return;
    setSaveError(null);
    const error = await cancelScheduledGame(gameId);
    if (error) setSaveError(error);
    if (!error) await reload();
  }

  if (isLoading) return <ScheduleLoadingState />;

  return (
    <div className="grid gap-4">
      <ScheduleSettingsCard timeZone={timeZone} weekCount={weeks.length} onSetTimeZone={setTimeZone} onSetWeekCount={setWeekCount} />
      <ScheduleWeekList weeks={weeks} onCancelGame={cancelGame} onChangeKind={changeKind} onUpdateWeek={updateWeek} />
      <ScheduleEditorMessages error={saveError ?? loadError} isTimeZoneValid={isValidTimeZone(timeZone)} />
      <SaveScheduleButton hasExistingWeeks={Boolean(schedule?.weeks.length)} isSaving={isSaving} isTimeZoneValid={isValidTimeZone(timeZone)} onSubmit={submit} />
    </div>
  );
}

async function saveScheduleFromEditor({
  onSaved,
  reload,
  setIsSaving,
  setSaveError,
  teamId,
  timeZone,
  weeks,
}: {
  onSaved?: (schedule: TeamSchedule) => void;
  reload: () => Promise<void> | void;
  setIsSaving: (isSaving: boolean) => void;
  setSaveError: (error: string | null) => void;
  teamId: string;
  timeZone: string;
  weeks: EditableWeek[];
}) {
    setIsSaving(true);
    setSaveError(null);

    try {
      const savedSchedule = await saveSchedule(teamId, timeZone, toScheduleWeekInputs(weeks));
      await reload();
      onSaved?.(savedSchedule);
    } catch (caught) {
      setSaveError(getScheduleEditorErrorMessage(caught, "Unable to save schedule."));
    } finally {
      setIsSaving(false);
    }
}

function createBlankGame(index: number): EditableWeek {
  return { key: `new-${index}`, kind: "GAME", localDate: "", opponent: "", startTime: "19:00", isHome: true };
}

function hydrateScheduleEditor(
  schedule: TeamSchedule | null,
  setters: ScheduleEditorStateSetters,
) {
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
    immutable: isImmutableScheduleWeek(week),
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

function isImmutableScheduleWeek(week: TeamSchedule["weeks"][number]) {
  return week.kind === "GAME" && immutableGameStatuses.has(week.status);
}

const immutableGameStatuses = new Set(["IN_PROGRESS", "FINAL", "CANCELLED"]);

function getSafeWeekCount(nextCount: number) {
  return Math.max(1, Math.floor(nextCount || 1));
}

function canUseWeekCount(safeCount: number, immutableCount: number, currentCount: number) {
  if (safeCount < immutableCount) {
    return false;
  }

  return safeCount >= currentCount || window.confirm(`Remove ${currentCount - safeCount} future schedule row(s)?`);
}

function resizeScheduleWeeks(current: EditableWeek[], safeCount: number) {
  if (safeCount >= current.length) {
    return growScheduleWeeks(current, safeCount);
  }

  return shrinkScheduleWeeks(current, safeCount);
}

function growScheduleWeeks(current: EditableWeek[], safeCount: number) {
  return Array.from({ length: safeCount }, (_, index) => current[index] ?? createBlankGame(index));
}

function shrinkScheduleWeeks(current: EditableWeek[], safeCount: number) {
  let rowsStillToRemove = current.length - safeCount;

  return current.filter((week, index) => {
    if (shouldKeepScheduleWeek(week, current, index, rowsStillToRemove)) {
      return true;
    }

    rowsStillToRemove -= 1;
    return false;
  });
}

function shouldKeepScheduleWeek(
  week: EditableWeek,
  weeks: EditableWeek[],
  index: number,
  rowsStillToRemove: number,
) {
  return week.immutable || rowsStillToRemove === 0 || countEditableWeeksAfter(weeks, index) >= rowsStillToRemove;
}

function countEditableWeeksAfter(weeks: EditableWeek[], index: number) {
  return weeks.slice(index + 1).filter((laterWeek) => !laterWeek.immutable).length;
}

function canChangeWeekKind(week: EditableWeek | undefined) {
  return Boolean(week && !week.immutable);
}

function requiresGameToByeConfirmation(week: EditableWeek | undefined, nextKind: WeekKind) {
  return Boolean(week?.kind === "GAME" && week.id && nextKind === "BYE");
}

function confirmGameToByeChange() {
  return window.confirm("Changing this game to a bye removes its saved game preparation. Continue?");
}

function getWeekKindUpdate(kind: WeekKind): Partial<EditableWeek> {
  if (kind === "GAME") {
    return { isHome: true, kind: "GAME", opponent: "", startTime: "19:00" };
  }

  return { discardPreparation: true, kind: "BYE" };
}

function toScheduleWeekInputs(weeks: EditableWeek[]): ScheduleWeekInput[] {
  return weeks.map(toScheduleWeekInput);
}

function toScheduleWeekInput(week: EditableWeek): ScheduleWeekInput {
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
}

function getScheduleEditorErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function cancelScheduledGame(gameId: string) {
  const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
    method: "PATCH",
    headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ action: "cancel" }),
  });

  if (response.ok) {
    return null;
  }

  return getCancelGameErrorMessage(response);
}

async function getCancelGameErrorMessage(response: Response) {
  const payload = await response.json() as { error?: { message?: string } };
  return payload.error?.message ?? "Unable to cancel game.";
}

function ScheduleLoadingState() {
  return (
    <div className="rounded-lg bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
      Loading schedule…
    </div>
  );
}

function ScheduleSettingsCard({
  timeZone,
  weekCount,
  onSetTimeZone,
  onSetWeekCount,
}: {
  timeZone: string;
  weekCount: number;
  onSetTimeZone: (timeZone: string) => void;
  onSetWeekCount: (weekCount: number) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-2">
      <ScheduleWeekCountField onSetWeekCount={onSetWeekCount} weekCount={weekCount} />
      <ScheduleTimeZoneField onSetTimeZone={onSetTimeZone} timeZone={timeZone} />
    </div>
  );
}

function ScheduleWeekCountField({
  weekCount,
  onSetWeekCount,
}: {
  weekCount: number;
  onSetWeekCount: (weekCount: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">
      Number of schedule weeks
      <input className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" min={1} onChange={(event) => onSetWeekCount(Number(event.target.value))} type="number" value={weekCount} />
    </label>
  );
}

function ScheduleTimeZoneField({
  timeZone,
  onSetTimeZone,
}: {
  timeZone: string;
  onSetTimeZone: (timeZone: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">
      Team timezone
      <select className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" onChange={(event) => onSetTimeZone(event.target.value)} value={timeZone}>
        <option disabled value="">Select timezone</option>
        <DetectedTimeZoneOption timeZone={timeZone} />
        {commonTeamTimeZones.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function DetectedTimeZoneOption({ timeZone }: { timeZone: string }) {
  if (isCommonTimeZone(timeZone) || !isValidTimeZone(timeZone)) {
    return null;
  }

  return <option value={timeZone}>{timeZone.replaceAll("_", " ")}</option>;
}

function isCommonTimeZone(timeZone: string) {
  return commonTeamTimeZones.some((option) => option.value === timeZone);
}

function ScheduleWeekList({
  weeks,
  onCancelGame,
  onChangeKind,
  onUpdateWeek,
}: {
  weeks: EditableWeek[];
  onCancelGame: (gameId: string) => void;
  onChangeKind: (index: number, kind: WeekKind) => void;
  onUpdateWeek: (index: number, update: Partial<EditableWeek>) => void;
}) {
  return weeks.map((week, index) => (
    <ScheduleWeekCard
      index={index}
      key={week.key}
      week={week}
      onCancelGame={onCancelGame}
      onChangeKind={onChangeKind}
      onUpdateWeek={onUpdateWeek}
    />
  ));
}

function ScheduleWeekCard({
  index,
  week,
  onCancelGame,
  onChangeKind,
  onUpdateWeek,
}: {
  index: number;
  week: EditableWeek;
  onCancelGame: (gameId: string) => void;
  onChangeKind: (index: number, kind: WeekKind) => void;
  onUpdateWeek: (index: number, update: Partial<EditableWeek>) => void;
}) {
  const updateWeek = (update: Partial<EditableWeek>) => onUpdateWeek(index, update);

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <ScheduleWeekHeader index={index} status={week.gameStatus} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ScheduleWeekTypeField index={index} week={week} onChangeKind={onChangeKind} />
        <ScheduleDateField onUpdateWeek={updateWeek} week={week} />
        <ScheduleWeekDetails onCancelGame={onCancelGame} onUpdateWeek={updateWeek} week={week} />
      </div>
    </article>
  );
}

function ScheduleWeekHeader({
  index,
  status,
}: {
  index: number;
  status: EditableWeek["gameStatus"];
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-bold text-foreground">Week {index + 1}</p>
      {status ? <span className="text-xs font-bold text-[var(--muted-foreground)]">{formatGameStatus(status)}</span> : null}
    </div>
  );
}

function ScheduleWeekTypeField({
  index,
  week,
  onChangeKind,
}: {
  index: number;
  week: EditableWeek;
  onChangeKind: (index: number, kind: WeekKind) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">Type
      <select className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => onChangeKind(index, event.target.value as WeekKind)} value={week.kind}>
        <option value="GAME">Game</option><option value="BYE">Bye</option>
      </select>
    </label>
  );
}

function ScheduleDateField({
  week,
  onUpdateWeek,
}: {
  week: EditableWeek;
  onUpdateWeek: (update: Partial<EditableWeek>) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-foreground">Date
      <input className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => onUpdateWeek({ localDate: event.target.value })} type="date" value={week.localDate} />
    </label>
  );
}

function ScheduleWeekDetails({
  week,
  onCancelGame,
  onUpdateWeek,
}: {
  week: EditableWeek;
  onCancelGame: (gameId: string) => void;
  onUpdateWeek: (update: Partial<EditableWeek>) => void;
}) {
  if (week.kind === "BYE") {
    return <ByeWeekNote />;
  }

  return <GameWeekFields onCancelGame={onCancelGame} onUpdateWeek={onUpdateWeek} week={week} />;
}

function ByeWeekNote() {
  return (
    <p className="rounded-lg bg-[var(--surface)] p-3 text-sm font-semibold text-[var(--muted-foreground)] sm:col-span-2">
      No opponent or start time is needed for a bye.
    </p>
  );
}

function GameWeekFields({
  week,
  onCancelGame,
  onUpdateWeek,
}: {
  week: EditableWeek;
  onCancelGame: (gameId: string) => void;
  onUpdateWeek: (update: Partial<EditableWeek>) => void;
}) {
  return (
    <>
      <label className="grid gap-1 text-sm font-bold text-foreground">Opponent
        <input className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => onUpdateWeek({ opponent: event.target.value })} value={week.opponent} />
      </label>
      <label className="grid gap-1 text-sm font-bold text-foreground">Start time
        <select className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => onUpdateWeek({ startTime: event.target.value as AllowedGameStartTime })} value={week.startTime}>
          {allowedGameStartTimes.map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
        </select>
      </label>
      <HomeAwayButtons isHome={week.isHome} isLocked={Boolean(week.immutable)} onUpdateWeek={onUpdateWeek} />
      <WeekGameActions gameId={week.gameId} status={week.gameStatus} onCancelGame={onCancelGame} />
    </>
  );
}

function HomeAwayButtons({
  isHome,
  isLocked,
  onUpdateWeek,
}: {
  isHome: boolean;
  isLocked: boolean;
  onUpdateWeek: (update: Partial<EditableWeek>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:col-span-2">
      {[true, false].map((nextIsHome) => (
        <HomeAwayButton active={isHome === nextIsHome} disabled={isLocked} isHome={nextIsHome} key={String(nextIsHome)} onUpdateWeek={onUpdateWeek} />
      ))}
    </div>
  );
}

function HomeAwayButton({
  active,
  disabled,
  isHome,
  onUpdateWeek,
}: {
  active: boolean;
  disabled: boolean;
  isHome: boolean;
  onUpdateWeek: (update: Partial<EditableWeek>) => void;
}) {
  return (
    <button aria-pressed={active} className={`btn-base min-h-11 ${active ? "btn-choice-selected" : "btn-choice"}`} disabled={disabled} onClick={() => onUpdateWeek({ isHome })} type="button">
      {isHome ? "Home" : "Away"}
    </button>
  );
}

function WeekGameActions({
  gameId,
  status,
  onCancelGame,
}: {
  gameId: string | undefined;
  status: EditableWeek["gameStatus"];
  onCancelGame: (gameId: string) => void;
}) {
  if (!gameId) {
    return null;
  }

  if (status === "FINAL") {
    return <Link className="btn-base btn-secondary min-h-11 px-3 text-sm sm:col-span-2" href={`/stats/games/${gameId}`}>View game statistics</Link>;
  }

  if (status === "SCHEDULED") {
    return <button className="btn-base btn-danger-secondary min-h-11 px-3 text-sm sm:col-span-2" onClick={() => onCancelGame(gameId)} type="button">Cancel Game</button>;
  }

  return null;
}

function ScheduleEditorMessages({
  error,
  isTimeZoneValid,
}: {
  error: string | null;
  isTimeZoneValid: boolean;
}) {
  return (
    <>
      {error ? <p className="rounded-lg bg-[var(--danger-soft)] p-3 text-sm font-bold text-[var(--danger)]">{error}</p> : null}
      {!isTimeZoneValid ? <p className="text-sm font-bold text-[var(--warning)]">Select a timezone before saving.</p> : null}
    </>
  );
}

function SaveScheduleButton({
  hasExistingWeeks,
  isSaving,
  isTimeZoneValid,
  onSubmit,
}: {
  hasExistingWeeks: boolean;
  isSaving: boolean;
  isTimeZoneValid: boolean;
  onSubmit: () => void;
}) {
  return (
    <button className="btn-base btn-primary min-h-12 px-4" disabled={!isTimeZoneValid || isSaving} onClick={onSubmit} type="button">
      {hasExistingWeeks ? <Check className="size-4" /> : <CalendarPlus className="size-4" />}
      {isSaving ? "Saving Schedule…" : "Save Schedule"}
    </button>
  );
}

function formatGameStatus(status: NonNullable<EditableWeek["gameStatus"]>) {
  return gameStatusLabels[status];
}

const gameStatusLabels: Record<NonNullable<EditableWeek["gameStatus"]>, string> = {
  CANCELLED: "Cancelled",
  FINAL: "Completed",
  IN_PROGRESS: "In progress",
  SCHEDULED: "Upcoming",
};

function formatTime(time: string) { return `${Number(time.slice(0, 2)) - 12}:00 PM`; }

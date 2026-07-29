"use client";

import Link from "next/link";
import { CalendarPlus, Check } from "lucide-react";
import { allowedGameStartTimes, commonTeamTimeZones, isValidTimeZone } from "@/lib/scheduleRules";
import type { AllowedGameStartTime } from "@/types/schedule";
import type { EditableWeek, WeekKind } from "./scheduleEditorModel";

type ScheduleEditorViewProps = {
  error: string | null;
  hasExistingWeeks: boolean;
  isSaving: boolean;
  onCancelGame: (gameId: string) => void;
  onChangeKind: (index: number, kind: WeekKind) => void;
  onSetTimeZone: (timeZone: string) => void;
  onSetWeekCount: (weekCount: number) => void;
  onSubmit: () => void;
  onUpdateWeek: (index: number, update: Partial<EditableWeek>) => void;
  timeZone: string;
  weeks: EditableWeek[];
};

export function ScheduleEditorView({ error, hasExistingWeeks, isSaving, onCancelGame, onChangeKind, onSetTimeZone, onSetWeekCount, onSubmit, onUpdateWeek, timeZone, weeks }: ScheduleEditorViewProps) {
  const isTimeZoneValid = isValidTimeZone(timeZone);
  return (
    <div className="grid gap-4">
      <ScheduleSettingsCard timeZone={timeZone} weekCount={weeks.length} onSetTimeZone={onSetTimeZone} onSetWeekCount={onSetWeekCount} />
      <ScheduleWeekList weeks={weeks} onCancelGame={onCancelGame} onChangeKind={onChangeKind} onUpdateWeek={onUpdateWeek} />
      <ScheduleEditorMessages error={error} isTimeZoneValid={isTimeZoneValid} />
      <SaveScheduleButton hasExistingWeeks={hasExistingWeeks} isSaving={isSaving} isTimeZoneValid={isTimeZoneValid} onSubmit={onSubmit} />
    </div>
  );
}

export function ScheduleLoadingState() {
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

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
    if (!schedule) return;
    queueMicrotask(() => {
      setTimeZone(schedule.timeZone ?? getDetectedTimeZone() ?? "");
      if (!schedule.weeks.length) return;
      setWeeks(schedule.weeks.map((week) => ({
        ...(week.kind === "GAME" ? {
          id: week.id,
          kind: "GAME" as const,
          localDate: week.localDate,
          opponent: week.opponent,
          startTime: week.startTime,
          isHome: week.isHome,
          gameId: week.gameId,
          gameStatus: week.status,
        } : {
          id: week.id,
          kind: "BYE" as const,
          localDate: week.localDate,
          opponent: "",
          startTime: "19:00" as const,
          isHome: true,
        }),
        key: week.id,
        immutable: week.kind === "GAME" && (week.status === "IN_PROGRESS" || week.status === "FINAL" || week.status === "CANCELLED"),
      })));
    });
  }, [schedule]);

  function setWeekCount(nextCount: number) {
    const safeCount = Math.max(1, Math.floor(nextCount || 1));
    if (safeCount < immutableCount) return;
    if (safeCount < weeks.length && !window.confirm(`Remove ${weeks.length - safeCount} future schedule row(s)?`)) return;
    setWeeks((current) => {
      if (safeCount >= current.length) {
        return Array.from({ length: safeCount }, (_, index) => current[index] ?? createBlankGame(index));
      }

      let rowsStillToRemove = current.length - safeCount;
      return current.filter((week, index) => {
        if (week.immutable || rowsStillToRemove === 0) return true;
        const editableRowsAfter = current.slice(index + 1).filter((laterWeek) => !laterWeek.immutable).length;
        if (editableRowsAfter >= rowsStillToRemove) return true;
        rowsStillToRemove -= 1;
        return false;
      });
    });
  }

  function updateWeek(index: number, update: Partial<EditableWeek>) {
    setWeeks((current) => current.map((week, weekIndex) => weekIndex === index ? { ...week, ...update } as EditableWeek : week));
  }

  function changeKind(index: number, kind: "GAME" | "BYE") {
    const current = weeks[index];
    if (!current || current.immutable) return;
    if (current.kind === "GAME" && current.id && !window.confirm("Changing this game to a bye removes its saved game preparation. Continue?")) return;
    updateWeek(index, kind === "GAME"
      ? { kind: "GAME", opponent: "", startTime: "19:00", isHome: true }
      : { kind: "BYE", discardPreparation: true });
  }

  async function submit() {
    if (!isValidTimeZone(timeZone) || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const inputs: ScheduleWeekInput[] = weeks.map((week) => week.kind === "GAME" ? {
        id: week.id,
        kind: "GAME",
        localDate: week.localDate,
        opponent: week.opponent,
        startTime: week.startTime,
        isHome: week.isHome,
      } : {
        id: week.id,
        kind: "BYE",
        localDate: week.localDate,
        discardPreparation: week.discardPreparation,
      });
      const savedSchedule = await saveSchedule(teamId, timeZone, inputs);
      await reload();
      onSaved?.(savedSchedule);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Unable to save schedule.");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelGame(gameId: string) {
    if (!window.confirm("Cancel this game and keep it in schedule history?")) return;
    setSaveError(null);
    const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
      method: "PATCH",
      headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action: "cancel" }),
    });
    if (!response.ok) {
      const payload = await response.json() as { error?: { message?: string } };
      setSaveError(payload.error?.message ?? "Unable to cancel game.");
      return;
    }
    await reload();
  }

  if (isLoading) return <div className="rounded-lg bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">Loading schedule…</div>;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-foreground">
          Number of schedule weeks
          <input className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" min={1} onChange={(event) => setWeekCount(Number(event.target.value))} type="number" value={weeks.length} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-foreground">
          Team timezone
          <select className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" onChange={(event) => setTimeZone(event.target.value)} value={timeZone}>
            <option disabled value="">Select timezone</option>
            {!commonTeamTimeZones.some((option) => option.value === timeZone) && isValidTimeZone(timeZone)
              ? <option value={timeZone}>{timeZone.replaceAll("_", " ")}</option>
              : null}
            {commonTeamTimeZones.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {weeks.map((week, index) => (
        <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4" key={week.key}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-foreground">Week {index + 1}</p>
            {week.gameStatus ? <span className="text-xs font-bold text-[var(--muted-foreground)]">{week.gameStatus === "FINAL" ? "Completed" : week.gameStatus === "CANCELLED" ? "Cancelled" : week.gameStatus === "IN_PROGRESS" ? "In progress" : "Upcoming"}</span> : null}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-foreground">Type
              <select className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => changeKind(index, event.target.value as "GAME" | "BYE")} value={week.kind}>
                <option value="GAME">Game</option><option value="BYE">Bye</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-foreground">Date
              <input className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => updateWeek(index, { localDate: event.target.value })} type="date" value={week.localDate} />
            </label>
            {week.kind === "GAME" ? <>
              <label className="grid gap-1 text-sm font-bold text-foreground">Opponent
                <input className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => updateWeek(index, { opponent: event.target.value })} value={week.opponent} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-foreground">Start time
                <select className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3" disabled={week.immutable} onChange={(event) => updateWeek(index, { startTime: event.target.value as "19:00" | "20:00" | "21:00" })} value={week.startTime}>
                  {allowedGameStartTimes.map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                {[true, false].map((isHome) => <button aria-pressed={week.isHome === isHome} className={`btn-base min-h-11 ${week.isHome === isHome ? "btn-choice-selected" : "btn-choice"}`} disabled={week.immutable} key={String(isHome)} onClick={() => updateWeek(index, { isHome })} type="button">{isHome ? "Home" : "Away"}</button>)}
              </div>
              {week.gameStatus === "FINAL" && week.gameId ? <Link className="btn-base btn-secondary min-h-11 px-3 text-sm sm:col-span-2" href={`/stats/games/${week.gameId}`}>View game statistics</Link> : null}
              {week.gameStatus === "SCHEDULED" && week.gameId ? <button className="btn-base btn-danger-secondary min-h-11 px-3 text-sm sm:col-span-2" onClick={() => void cancelGame(week.gameId!)} type="button">Cancel Game</button> : null}
            </> : <p className="rounded-lg bg-[var(--surface)] p-3 text-sm font-semibold text-[var(--muted-foreground)] sm:col-span-2">No opponent or start time is needed for a bye.</p>}
          </div>
        </article>
      ))}

      {loadError || saveError ? <p className="rounded-lg bg-[var(--danger-soft)] p-3 text-sm font-bold text-[var(--danger)]">{saveError ?? loadError}</p> : null}
      {!isValidTimeZone(timeZone) ? <p className="text-sm font-bold text-[var(--warning)]">Select a timezone before saving.</p> : null}
      <button className="btn-base btn-primary min-h-12 px-4" disabled={!isValidTimeZone(timeZone) || isSaving} onClick={submit} type="button">
        {schedule?.weeks.length ? <Check className="size-4" /> : <CalendarPlus className="size-4" />}
        {isSaving ? "Saving Schedule…" : "Save Schedule"}
      </button>
    </div>
  );
}

function createBlankGame(index: number): EditableWeek {
  return { key: `new-${index}`, kind: "GAME", localDate: "", opponent: "", startTime: "19:00", isHome: true };
}

function formatTime(time: string) { return `${Number(time.slice(0, 2)) - 12}:00 PM`; }

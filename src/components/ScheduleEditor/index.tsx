"use client";

import { useEffect, useMemo, useState } from "react";
import { isValidTimeZone } from "@/lib/scheduleRules";
import { saveSchedule, useTeamSchedule } from "@/lib/scheduleClient";
import type { TeamSchedule } from "@/types/schedule";
import {
  canChangeWeekKind,
  cancelScheduledGame,
  canUseWeekCount,
  confirmGameToByeChange,
  createBlankGame,
  getSafeWeekCount,
  getScheduleEditorErrorMessage,
  getWeekKindUpdate,
  hydrateScheduleEditor,
  requiresGameToByeConfirmation,
  resizeScheduleWeeks,
  toScheduleWeekInputs,
  type EditableWeek,
  type WeekKind,
} from "./scheduleEditorModel";
import { ScheduleEditorView, ScheduleLoadingState } from "./ScheduleEditorView";

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
    <ScheduleEditorView
      error={saveError ?? loadError}
      hasExistingWeeks={Boolean(schedule?.weeks.length)}
      isSaving={isSaving}
      onCancelGame={cancelGame}
      onChangeKind={changeKind}
      onSetTimeZone={setTimeZone}
      onSetWeekCount={setWeekCount}
      onSubmit={submit}
      onUpdateWeek={updateWeek}
      timeZone={timeZone}
      weeks={weeks}
    />
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

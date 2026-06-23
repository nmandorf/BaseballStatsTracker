"use client";

import { useCallback, useEffect, useState } from "react";
import { getVerifiedTeamAccountHeaders } from "./teamStorage.ts";
import type { ScheduleWeekInput, TeamSchedule } from "@/types/schedule";

const selectedGameStorageKey = "baseball-tracker:selected-scheduled-game:v1";
const selectedGameEvent = "baseball-tracker:selected-scheduled-game-updated";

export function useTeamSchedule(teamId: string | null) {
  const [schedule, setSchedule] = useState<TeamSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(teamId));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!teamId) {
      setSchedule(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/team/${encodeURIComponent(teamId)}/schedule`, {
        cache: "no-store",
        headers: await getVerifiedTeamAccountHeaders(),
      });
      const payload = await response.json() as { schedule?: TeamSchedule; error?: { message?: string } };
      if (!response.ok || !payload.schedule) throw new Error(payload.error?.message ?? "Unable to load schedule.");
      setSchedule(payload.schedule);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load schedule.");
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    queueMicrotask(() => { void reload(); });
  }, [reload]);
  return { schedule, isLoading, error, reload };
}

export async function saveSchedule(teamId: string, timeZone: string, weeks: ScheduleWeekInput[]) {
  const response = await fetch(`/api/team/${encodeURIComponent(teamId)}/schedule`, {
    method: "PUT",
    headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ timeZone, weeks }),
  });
  const payload = await response.json() as { schedule?: TeamSchedule; error?: { message?: string } };
  if (!response.ok || !payload.schedule) throw new Error(payload.error?.message ?? "Unable to save schedule.");
  return payload.schedule;
}

export function loadSelectedScheduledGameId(teamId: string) {
  if (typeof window === "undefined") return null;
  try {
    const selections = JSON.parse(window.localStorage.getItem(selectedGameStorageKey) ?? "{}") as Record<string, string>;
    return selections[teamId] ?? null;
  } catch {
    return null;
  }
}

export function saveSelectedScheduledGameId(teamId: string, gameId: string) {
  if (typeof window === "undefined") return;
  let selections: Record<string, string> = {};
  try { selections = JSON.parse(window.localStorage.getItem(selectedGameStorageKey) ?? "{}"); } catch { /* replace malformed state */ }
  window.localStorage.setItem(selectedGameStorageKey, JSON.stringify({ ...selections, [teamId]: gameId }));
  window.dispatchEvent(new Event(selectedGameEvent));
}

export function subscribeSelectedScheduledGame(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(selectedGameEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(selectedGameEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

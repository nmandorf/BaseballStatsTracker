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
      clearScheduleState(setSchedule, setIsLoading);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setSchedule(await fetchTeamSchedule(teamId));
    } catch (caught) {
      setError(getScheduleClientErrorMessage(caught, "Unable to load schedule."));
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
  return parseScheduleResponse(response, "Unable to save schedule.");
}

export function loadSelectedScheduledGameId(teamId: string) {
  if (typeof window === "undefined") return null;
  try {
    return getStoredSelectedGameId(teamId);
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

function clearScheduleState(
  setSchedule: (schedule: TeamSchedule | null) => void,
  setIsLoading: (isLoading: boolean) => void,
) {
  setSchedule(null);
  setIsLoading(false);
}

async function fetchTeamSchedule(teamId: string) {
  const response = await fetch(`/api/team/${encodeURIComponent(teamId)}/schedule`, {
    cache: "no-store",
    headers: await getVerifiedTeamAccountHeaders(),
  });

  return parseScheduleResponse(response, "Unable to load schedule.");
}

async function parseScheduleResponse(response: Response, fallbackMessage: string) {
  const payload = await response.json() as { schedule?: TeamSchedule; error?: { message?: string } };

  if (!hasScheduleResponsePayload(response, payload)) {
    throw new Error(payload.error?.message ?? fallbackMessage);
  }

  return payload.schedule;
}

function hasScheduleResponsePayload(
  response: Response,
  payload: { schedule?: TeamSchedule },
): payload is { schedule: TeamSchedule } {
  return response.ok && Boolean(payload.schedule);
}

function getScheduleClientErrorMessage(caught: unknown, fallbackMessage: string) {
  return caught instanceof Error ? caught.message : fallbackMessage;
}

function getStoredSelectedGameId(teamId: string) {
  const selections = JSON.parse(window.localStorage.getItem(selectedGameStorageKey) ?? "{}") as Record<string, string>;
  return selections[teamId] ?? null;
}

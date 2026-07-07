import type { GameStatus as PrismaGameStatus } from "@/generated/prisma/enums";
import type { GameState } from "./gameEngine.ts";

export function canSaveScheduledGameSnapshot(
  savedGameStatus: PrismaGameStatus,
  incomingState: Pick<GameState, "defensiveEvents" | "plays" | "status">,
  savedSnapshot?: unknown,
) {
  if (isActiveSavedGame(savedGameStatus)) {
    return isLiveIncomingState(incomingState.status);
  }

  if (!canCompareFinalSnapshots(savedGameStatus, incomingState.status)) {
    return false;
  }

  const incomingActionCount = getSavedActionCount(incomingState);
  const savedActionCount = getSnapshotActionCount(savedSnapshot);

  if (hasMoreSavedActions(incomingActionCount, savedActionCount)) {
    return true;
  }

  return hasSameSavedActions(incomingActionCount, savedActionCount, incomingState, savedSnapshot);
}

function isActiveSavedGame(savedGameStatus: PrismaGameStatus) {
  return savedGameStatus === "IN_PROGRESS";
}

function isLiveIncomingState(status: Pick<GameState, "status">["status"]) {
  return status === "IN_PROGRESS" || status === "FINAL";
}

function canCompareFinalSnapshots(
  savedGameStatus: PrismaGameStatus,
  incomingStatus: Pick<GameState, "status">["status"],
) {
  return savedGameStatus === "FINAL" && incomingStatus === "FINAL";
}

function hasMoreSavedActions(incomingActionCount: number, savedActionCount: number) {
  return incomingActionCount > savedActionCount;
}

function hasSameSavedActions(
  incomingActionCount: number,
  savedActionCount: number,
  incomingState: Pick<GameState, "defensiveEvents" | "plays">,
  savedSnapshot?: unknown,
) {
  return incomingActionCount === savedActionCount
    && getActionSignature(incomingState) === getSnapshotActionSignature(savedSnapshot);
}

function getSavedActionCount(state: Pick<GameState, "defensiveEvents" | "plays">) {
  return state.plays.length + (Array.isArray(state.defensiveEvents) ? state.defensiveEvents.length : 0);
}

function getSnapshotActionCount(snapshot?: unknown) {
  const { defensiveEvents, plays } = getSnapshotActions(snapshot);
  return plays.length + defensiveEvents.length;
}

function getActionSignature(state: Pick<GameState, "defensiveEvents" | "plays">) {
  return [
    ...state.plays.map((play) => `play:${play.id}`),
    ...(Array.isArray(state.defensiveEvents)
      ? state.defensiveEvents.map((event) => `defense:${event.id}`)
      : []),
  ].join("|");
}

function getSnapshotActionSignature(snapshot?: unknown) {
  const { defensiveEvents, plays } = getSnapshotActions(snapshot);

  return [
    ...plays.map((play) => `play:${getSnapshotActionId(play)}`),
    ...defensiveEvents.map((event) => `defense:${getSnapshotActionId(event)}`),
  ].join("|");
}

function getSnapshotActions(snapshot?: unknown) {
  if (!isSnapshotRecord(snapshot)) {
    return { plays: [], defensiveEvents: [] };
  }

  return {
    plays: getSnapshotArray(snapshot, "plays"),
    defensiveEvents: getSnapshotArray(snapshot, "defensiveEvents"),
  };
}

function getSnapshotActionId(action: unknown) {
  if (!isSnapshotRecord(action)) {
    return "";
  }

  return typeof action.id === "string" ? action.id : "";
}

function isSnapshotRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSnapshotArray(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return Array.isArray(value) ? value : [];
}

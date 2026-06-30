import type { GameStatus as PrismaGameStatus } from "@/generated/prisma/enums";
import type { GameState } from "./gameEngine.ts";

export function canSaveScheduledGameSnapshot(
  savedGameStatus: PrismaGameStatus,
  incomingState: Pick<GameState, "defensiveEvents" | "plays" | "status">,
  savedSnapshot?: unknown,
) {
  if (savedGameStatus === "IN_PROGRESS") {
    return incomingState.status === "IN_PROGRESS" || incomingState.status === "FINAL";
  }

  if (savedGameStatus !== "FINAL" || incomingState.status !== "FINAL") {
    return false;
  }

  const incomingActionCount = getSavedActionCount(incomingState);
  const savedActionCount = getSnapshotActionCount(savedSnapshot);

  if (incomingActionCount > savedActionCount) {
    return true;
  }

  return incomingActionCount === savedActionCount &&
    getActionSignature(incomingState) === getSnapshotActionSignature(savedSnapshot);
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
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { plays: [], defensiveEvents: [] };
  }

  return {
    plays: "plays" in snapshot && Array.isArray(snapshot.plays) ? snapshot.plays : [],
    defensiveEvents: "defensiveEvents" in snapshot && Array.isArray(snapshot.defensiveEvents)
      ? snapshot.defensiveEvents
      : [],
  };
}

function getSnapshotActionId(action: unknown) {
  return action && typeof action === "object" && "id" in action && typeof action.id === "string"
    ? action.id
    : "";
}

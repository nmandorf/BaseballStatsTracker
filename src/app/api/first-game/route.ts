import {
  ensureStarterTeam,
  loadFirstGameSnapshotFromPrisma,
  resetFirstGameSnapshotInPrisma,
  saveFirstGameSnapshotToPrisma,
} from "@/lib/prismaBackend";
import { apiErrorResponse, validationError } from "@/lib/appErrors";
import { readVerifiedTeamAccountFromRequest } from "@/lib/teamAccount";
import type { GameState } from "@/lib/gameEngine";
import type { ActiveTeam } from "@/types/player";

export const runtime = "nodejs";

type FirstGameSyncPayload = {
  state: GameState;
  team?: ActiveTeam;
};

export async function GET(request: Request) {
  try {
    const account = await readVerifiedTeamAccountFromRequest(request);
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId") ?? undefined;
    const { team, season } = await ensureStarterTeam(undefined, account);
    const state = await loadFirstGameSnapshotFromPrisma(
      season.year,
      teamId ?? team.id,
      account,
    );

    return Response.json({
      team: {
        id: team.id,
        name: team.name,
      },
      season: {
        id: season.id,
        year: season.year,
        label: season.label,
      },
      state,
    });
  } catch (error) {
    return firstGameError(error);
  }
}

export async function POST(request: Request) {
  try {
    const account = await readVerifiedTeamAccountFromRequest(request);
    const payload = await parseJson(request);
    const { state, team } = parseFirstGameSyncPayload(payload);
    const saved = await saveFirstGameSnapshotToPrisma(state, { team, account });

    return Response.json(saved, { status: 201 });
  } catch (error) {
    return firstGameError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const account = await readVerifiedTeamAccountFromRequest(request);
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId") ?? undefined;
    const reset = await resetFirstGameSnapshotInPrisma(undefined, teamId, account);

    return Response.json(reset);
  } catch (error) {
    return firstGameError(error);
  }
}

async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw validationError("INVALID_JSON", "Request body must be valid JSON.");
  }
}

function parseFirstGameSyncPayload(payload: unknown): FirstGameSyncPayload {
  const state = isRecord(payload) && "state" in payload ? payload.state : payload;
  const team = isRecord(payload) && "state" in payload && isActiveTeam(payload.team) ? payload.team : undefined;

  if (!isGameState(state)) {
    throw validationError("FIRST_GAME_STATE_INVALID", "First game state is required.", { field: "state" });
  }

  return { state, team };
}

function isGameState(value: unknown): value is GameState {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    Array.isArray(value.lineup) &&
    typeof value.currentBatterIndex === "number" &&
    typeof value.inning === "number" &&
    typeof value.outs === "number" &&
    typeof value.teamScore === "number" &&
    typeof value.opponentScore === "number" &&
    isRecord(value.bases) &&
    isRecord(value.statsByPlayerId) &&
    Array.isArray(value.plays) &&
    Array.isArray(value.history)
  );
}

function isActiveTeam(value: unknown): value is ActiveTeam {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.players)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstGameError(error: unknown) {
  return apiErrorResponse(error, {
    code: "BACKEND_UNAVAILABLE",
    message: "Unable to sync first game.",
  });
}

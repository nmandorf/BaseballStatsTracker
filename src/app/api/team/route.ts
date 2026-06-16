import {
  createTeamInBackend,
  listTeamsFromBackend,
  loadTeamFromBackend,
  upsertActiveTeamInBackend,
} from "@/lib/teamBackend";
import { apiErrorResponse } from "@/lib/appErrors";
import type { ActiveTeam } from "@/types/player";

export const runtime = "nodejs";

type TeamPayload = {
  name?: unknown;
  team?: ActiveTeam;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const shouldListTeams = url.searchParams.get("list") === "1";

    if (shouldListTeams) {
      const teams = await listTeamsFromBackend();

      return Response.json({ teams });
    }

    const team = await loadTeamFromBackend(url.searchParams.get("teamId") ?? undefined);

    return Response.json({ team });
  } catch (error) {
    return backendError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TeamPayload;
    const team = payload.team
      ? await upsertActiveTeamInBackend(payload.team)
      : await createTeamInBackend(String(payload.name ?? ""));

    return Response.json({ team }, { status: 201 });
  } catch (error) {
    return backendError(error);
  }
}

function backendError(error: unknown) {
  return apiErrorResponse(error, {
    code: "BACKEND_UNAVAILABLE",
    message: "Unable to load or save team.",
  });
}

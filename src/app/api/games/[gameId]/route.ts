import { apiErrorResponse } from "@/lib/appErrors";
import { cancelScheduledGame, loadScheduledGameSnapshot } from "@/lib/scheduleBackend";
import { readVerifiedTeamAccountFromRequest } from "@/lib/teamAccount";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await context.params;
    return Response.json(await loadScheduledGameSnapshot(gameId, await readVerifiedTeamAccountFromRequest(request)));
  } catch (error) {
    return apiErrorResponse(error, { code: "BACKEND_UNAVAILABLE", message: "Unable to load game history." });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await context.params;
    const payload = await request.json() as { action?: unknown };
    if (payload.action !== "cancel") return Response.json({ error: { code: "SCHEDULE_WEEK_INVALID", message: "Unsupported game action." } }, { status: 400 });
    return Response.json(await cancelScheduledGame(gameId, await readVerifiedTeamAccountFromRequest(request)));
  } catch (error) {
    return apiErrorResponse(error, { code: "BACKEND_UNAVAILABLE", message: "Unable to update scheduled game." });
  }
}

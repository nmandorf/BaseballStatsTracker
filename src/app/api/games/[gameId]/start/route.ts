import { apiErrorResponse } from "@/lib/appErrors";
import { authorizeScheduledGameStart } from "@/lib/scheduleBackend";
import { readVerifiedTeamAccountFromRequest } from "@/lib/teamAccount";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await context.params;
    const started = await authorizeScheduledGameStart(gameId, await readVerifiedTeamAccountFromRequest(request));
    return Response.json(started);
  } catch (error) {
    return apiErrorResponse(error, { code: "BACKEND_UNAVAILABLE", message: "Unable to verify game start time." });
  }
}

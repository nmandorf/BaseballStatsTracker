import { apiErrorResponse, validationError } from "@/lib/appErrors";
import { loadGamePreparation, saveGamePreparation, type GamePreparationInput } from "@/lib/scheduleBackend";
import { readVerifiedTeamAccountFromRequest } from "@/lib/teamAccount";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await context.params;
    return Response.json({ preparation: await loadGamePreparation(gameId, await readVerifiedTeamAccountFromRequest(request)) });
  } catch (error) {
    return apiErrorResponse(error, { code: "BACKEND_UNAVAILABLE", message: "Unable to load game preparation." });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await context.params;
    const payload = (await request.json()) as GamePreparationInput;
    if (!payload || !Array.isArray(payload.selectedPlayerIds) || !payload.gameRules) {
      throw validationError("SCHEDULE_WEEK_INVALID", "Game preparation is required.");
    }
    await saveGamePreparation(gameId, payload, await readVerifiedTeamAccountFromRequest(request));
    return Response.json({ saved: true });
  } catch (error) {
    return apiErrorResponse(error, { code: "BACKEND_UNAVAILABLE", message: "Unable to save game preparation." });
  }
}

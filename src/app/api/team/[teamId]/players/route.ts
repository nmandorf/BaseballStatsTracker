import { addPlayerToTeamInBackend } from "@/lib/teamBackend";
import { apiErrorResponse, validationError } from "@/lib/appErrors";
import type { PlayerProfileInput } from "@/types/player";

export const runtime = "nodejs";

type AddPlayerPayload = {
  input?: PlayerProfileInput;
  seedOrder?: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const payload = (await request.json()) as AddPlayerPayload;

    if (!payload.input) {
      throw validationError("PLAYER_INPUT_REQUIRED", "Player input is required.", { field: "input" });
    }

    const team = await addPlayerToTeamInBackend(teamId, payload.input, payload.seedOrder);

    return Response.json({ team }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, {
      code: "BACKEND_UNAVAILABLE",
      message: "Unable to save player.",
    });
  }
}

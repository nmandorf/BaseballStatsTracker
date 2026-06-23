import { apiErrorResponse } from "@/lib/appErrors";
import { deleteTeamFromBackend } from "@/lib/teamBackend";
import { readVerifiedTeamAccountFromRequest } from "@/lib/teamAccount";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const account = await readVerifiedTeamAccountFromRequest(request);
    const { teamId } = await context.params;
    const deletedTeam = await deleteTeamFromBackend(teamId, account);

    return Response.json({ deletedTeam });
  } catch (error) {
    return apiErrorResponse(error, {
      code: "BACKEND_UNAVAILABLE",
      message: "Unable to delete team.",
    });
  }
}

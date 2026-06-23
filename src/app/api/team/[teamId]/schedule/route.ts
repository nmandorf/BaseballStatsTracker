import { apiErrorResponse, validationError } from "@/lib/appErrors";
import { loadTeamSchedule, saveTeamSchedule } from "@/lib/scheduleBackend";
import { readVerifiedTeamAccountFromRequest } from "@/lib/teamAccount";
import type { ScheduleWeekInput } from "@/types/schedule";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await context.params;
    const schedule = await loadTeamSchedule(teamId, await readVerifiedTeamAccountFromRequest(request));
    return Response.json({ schedule });
  } catch (error) {
    return scheduleError(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await context.params;
    const payload = (await request.json()) as { timeZone?: unknown; weeks?: unknown };
    if (typeof payload.timeZone !== "string" || !Array.isArray(payload.weeks)) {
      throw validationError("SCHEDULE_WEEK_INVALID", "Timezone and schedule weeks are required.");
    }
    const schedule = await saveTeamSchedule({
      teamId,
      timeZone: payload.timeZone,
      weeks: payload.weeks as ScheduleWeekInput[],
      account: await readVerifiedTeamAccountFromRequest(request),
    });
    return Response.json({ schedule });
  } catch (error) {
    return scheduleError(error);
  }
}

function scheduleError(error: unknown) {
  return apiErrorResponse(error, { code: "BACKEND_UNAVAILABLE", message: "Unable to load or save the team schedule." });
}

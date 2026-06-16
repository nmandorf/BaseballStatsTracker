import { getQuickScoresSchedule } from "@/lib/quickscoresSchedule";

export async function GET() {
  const schedule = await getQuickScoresSchedule();

  return Response.json(schedule);
}

import type { Metadata } from "next";
import { FinalGameStatsPage } from "@/pages/FinalGameStats";

export const metadata: Metadata = {
  title: "Final Game Stats | Baseball Stat Tracker",
  description: "Completed game final stats for Baseball Stat Tracker.",
};

export default async function FinalGameStatsRoute({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return <FinalGameStatsPage gameId={gameId} />;
}

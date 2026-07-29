"use client";

import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { FinalGameBoxScore } from "@/components/FinalGameBoxScore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatTile } from "@/components/StatTile";
import { StatsPlayerTable } from "@/components/StatsPlayerTable";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import { getPlayerGameStats, getTeamGameTotals, type GameState } from "@/lib/gameEngine";
import { calculateStats, formatRate } from "@/lib/statCalculations";

type FinalGameStatsViewProps = {
  gameState: GameState;
  teamName: string;
  onReset?: () => void;
  finishHref?: string;
  finishLabel?: string;
};

export function FinalGameStatsView({
  gameState,
  teamName,
  onReset,
  finishHref = "/stats",
  finishLabel = "Back to Season Stats",
}: FinalGameStatsViewProps) {
  const router = useRouter();
  const teamTotals = getTeamGameTotals(gameState);
  const playerRows = gameState.lineup.map((player) => {
    const stats = getPlayerGameStats(gameState, player.id);

    return {
      player,
      stats,
      calculated: calculateStats(stats),
    };
  });

  function finishGame() {
    saveFirstGameState(gameState);
    router.push(finishHref);
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <ScreenHeader
          description="The game is final. These totals come from this completed game only."
          eyebrow="Final"
          icon={Trophy}
          status="Final Game Stats"
          title={`${teamName} ${gameState.teamScore} - ${gameState.opponent} ${gameState.opponentScore}`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <StatTile helper="Final score" label="Runs" tone="accent" value={String(teamTotals.runs)} />
          <StatTile helper={`${gameState.plays.length} saved`} label="Plays" value={String(gameState.plays.length)} />
          <StatTile helper={`${teamTotals.hits} hits`} label="AVG" tone="success" value={formatRate(teamTotals.battingAverage)} />
          <StatTile helper={`OPS ${formatRate(teamTotals.ops)}`} label="OBP" value={formatRate(teamTotals.onBasePercentage)} />
        </div>

        <div className="mt-4 grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <FinalGameBoxScore
            finishLabel={finishLabel}
            gameState={gameState}
            onFinish={finishGame}
            onReset={onReset}
            teamTotals={teamTotals}
          />
          <StatsPlayerTable className="order-2 min-w-0 lg:order-1" label="Player Game Stats" rows={playerRows} />
        </div>
      </div>
    </section>
  );
}

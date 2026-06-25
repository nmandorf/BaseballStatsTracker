"use client";

import { StatTile } from "@/components/StatTile";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import {
  getCompletedGameHistory,
  getTeamSeasonTotals,
} from "@/lib/gameEngine";
import { calculateStats, formatPercent, formatRate } from "@/lib/statCalculations";
import { useBackendSyncedActiveTeam } from "@/lib/teamStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { useCompletedGameStates } from "@/lib/useCompletedGameStates";
import { GameHistoryCard, StatsPlayerTable, type StatsPlayerRow } from "@/sections/StatsEntrySection";

export function SeasonStatsSection() {
  const activeTeam = useBackendSyncedActiveTeam();
  const completedGameStates = useCompletedGameStates();
  const { schedule } = useTeamSchedule(activeTeam?.id ?? null);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before reviewing season stats." />;
  }

  const seasonRows: StatsPlayerRow[] = activeTeam.players.map((player) => {
    const stats = player.seasonStats;

    return {
      player,
      stats,
      calculated: calculateStats(stats),
    };
  });
  const seasonTotals = getTeamSeasonTotals(activeTeam.players);
  const localGameHistory = getCompletedGameHistory(completedGameStates);
  const localGameIds = new Set(localGameHistory.map((game) => game.id));
  const backendGameHistory = (schedule?.weeks ?? []).flatMap((week) => (
    week.kind === "GAME" && week.status === "FINAL" && !localGameIds.has(week.gameId)
      ? [{
          id: week.gameId,
          opponent: week.opponent,
          endedAt: week.scheduledStartAt,
          teamScore: week.teamScore,
          opponentScore: week.opponentScore,
          result: week.result === "WIN" ? "Win" as const : week.result === "LOSS" ? "Loss" as const : "Tie" as const,
          playCount: week.playCount,
          href: `/stats/games/${week.gameId}`,
        }]
      : []
  ));
  const gameHistory = [...localGameHistory, ...backendGameHistory];

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">Season stats for {activeTeam.name}</h1>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatTile helper="Season total" label="Runs" tone="accent" value={String(seasonTotals.runs)} />
          <StatTile helper={`${seasonTotals.hits} hits`} label="AVG" tone="success" value={formatRate(seasonTotals.battingAverage)} />
          <StatTile helper={`OPS ${formatRate(seasonTotals.ops)}`} label="OBP" value={formatRate(seasonTotals.onBasePercentage)} />
          <StatTile helper={`${seasonTotals.outs} outs`} label="Out%" value={formatPercent(seasonTotals.outs / Math.max(1, seasonTotals.plateAppearances))} />
        </div>

        <div className="mt-4 grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <StatsPlayerTable label="Season Player Stats" rows={seasonRows} />
          <GameHistoryCard games={gameHistory} />
        </div>
      </div>
    </section>
  );
}

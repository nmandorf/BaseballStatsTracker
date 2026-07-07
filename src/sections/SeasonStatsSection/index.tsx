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
import type { TeamSchedule } from "@/types/schedule";

type FinalScheduleGameWeek = Extract<TeamSchedule["weeks"][number], { kind: "GAME" }> & { status: "FINAL" };

export function SeasonStatsSection() {
  const activeTeam = useBackendSyncedActiveTeam();
  const completedGameStates = useCompletedGameStates();
  const { schedule } = useTeamSchedule(activeTeam?.id ?? null);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before reviewing season stats." />;
  }

  const seasonRows = getSeasonRows(activeTeam.players);
  const seasonTotals = getTeamSeasonTotals(activeTeam.players);
  const localGameHistory = getCompletedGameHistory(completedGameStates);
  const gameHistory = [
    ...localGameHistory,
    ...getBackendGameHistory(schedule, new Set(localGameHistory.map((game) => game.id))),
  ];

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

function getSeasonRows(players: Array<StatsPlayerRow["player"]>): StatsPlayerRow[] {
  return players.map((player) => {
    const stats = player.seasonStats;

    return {
      calculated: calculateStats(stats),
      player,
      stats,
    };
  });
}

function getBackendGameHistory(schedule: TeamSchedule | null, localGameIds: Set<string>) {
  return (schedule?.weeks ?? []).flatMap((week) => getBackendGameHistoryItem(week, localGameIds));
}

function getBackendGameHistoryItem(
  week: TeamSchedule["weeks"][number],
  localGameIds: Set<string>,
) {
  if (!isMissingFinalBackendGame(week, localGameIds)) {
    return [];
  }

  return [{
    endedAt: week.scheduledStartAt,
    href: `/stats/games/${week.gameId}`,
    id: week.gameId,
    opponent: week.opponent,
    opponentScore: week.opponentScore,
    playCount: week.playCount,
    result: getGameHistoryResult(week.result),
    teamScore: week.teamScore,
  }];
}

function isMissingFinalBackendGame(
  week: TeamSchedule["weeks"][number],
  localGameIds: Set<string>,
): week is FinalScheduleGameWeek {
  return week.kind === "GAME" && week.status === "FINAL" && !localGameIds.has(week.gameId);
}

function getGameHistoryResult(result: "WIN" | "LOSS" | "TIE" | null) {
  return result ? gameHistoryResultLabels[result] : "Tie";
}

const gameHistoryResultLabels = {
  LOSS: "Loss",
  TIE: "Tie",
  WIN: "Win",
} as const;

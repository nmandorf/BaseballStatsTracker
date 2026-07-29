"use client";

export { FinalGameStatsView } from "@/components/FinalGameStatsView";
export { GameHistoryCard } from "@/components/GameHistoryCard";
export { StatsPlayerTable, type StatsPlayerRow } from "@/components/StatsPlayerTable";

import { FinalGameStatsView } from "@/components/FinalGameStatsView";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { getCurrentTeamPhase, type GameState } from "@/lib/gameEngine";
import { resetFirstGameState } from "@/lib/firstGameStorage";
import { usePregameSetup } from "@/lib/pregameSetupStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { useActiveTeam } from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { LiveStatsEntry } from "@/sections/StatsEntrySection/LiveStatsEntry";
import {
  DefensiveHalfPrompt,
  PregameStatsEntryPrompt,
} from "@/sections/StatsEntrySection/StatsEntryUnavailableStates";
import type { ScheduleWeek } from "@/types/schedule";

export function StatsEntrySection() {
  const activeTeam = useActiveTeam();
  const gameState = useFirstGameState();
  const setup = usePregameSetup();
  const { schedule } = useTeamSchedule(activeTeam?.id ?? null);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before entering stats." />;
  }

  const scheduledGame = findScheduledStatsGame(schedule?.weeks ?? [], setup.gameId);

  return (
    <StatsEntryState
      gameState={gameState}
      scheduledGame={scheduledGame}
      teamName={activeTeam.name}
    />
  );
}

function StatsEntryState({
  gameState,
  scheduledGame,
  teamName,
}: {
  gameState: GameState;
  scheduledGame: Extract<ScheduleWeek, { kind: "GAME" }> | null;
  teamName: string;
}) {
  if (gameState.status === "PREGAME" || !gameState.lineup.length) {
    return (
      <PregameStatsEntryPrompt
        eligibleAt={getStatsEntryEligibleAt(scheduledGame)}
        teamName={teamName}
      />
    );
  }

  if (gameState.status === "FINAL") {
    return (
      <FinalGameStatsView
        finishHref="/"
        finishLabel="Finish Game"
        gameState={gameState}
        onReset={resetFirstGameState}
        teamName={teamName}
      />
    );
  }

  if (getCurrentTeamPhase(gameState) === "FIELDING") {
    return <DefensiveHalfPrompt gameState={gameState} teamName={teamName} />;
  }

  return <LiveStatsEntry gameState={gameState} teamName={teamName} />;
}

function findScheduledStatsGame(weeks: ScheduleWeek[], gameId: string | null) {
  return weeks.find((week): week is Extract<ScheduleWeek, { kind: "GAME" }> => (
    week.kind === "GAME" && week.gameId === gameId
  )) ?? null;
}

function getStatsEntryEligibleAt(
  scheduledGame: Extract<ScheduleWeek, { kind: "GAME" }> | null,
) {
  return scheduledGame
    ? new Date(Date.parse(scheduledGame.scheduledStartAt) - 5 * 60_000).toLocaleString()
    : null;
}

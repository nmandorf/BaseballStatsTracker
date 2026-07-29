"use client";

import { useEffect, useMemo } from "react";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import {
  buildPregamePlayerPool,
  generateLineupIds,
  getLineupTargetCount,
  resolveSuggestedLineupIds,
  savePregameSetup,
  selectScheduledGameForPregame,
  usePregameSetup,
  type LineupSizeOption,
} from "@/lib/pregameSetupStorage";
import { validateLineupPlayerPool } from "@/lib/lineupRules";
import { useBackendSyncedActiveTeam } from "@/lib/teamStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import type { ActiveTeam } from "@/types/player";
import type { ScheduleWeek } from "@/types/schedule";
import { ActivePlayersCard, GameDetailsCard, GameSetupStats, LeagueRulesCard } from "./GameSetupCards";

type PregameSetup = ReturnType<typeof usePregameSetup>;
type ScheduledGame = Extract<ScheduleWeek, { kind: "GAME" }>;

export function GameSetupSection() {
  const activeTeam = useBackendSyncedActiveTeam();
  const setup = usePregameSetup();
  const { schedule, isLoading: isScheduleLoading } = useTeamSchedule(activeTeam?.id ?? null);
  const scheduledGames = useMemo(
    () => getScheduledGames(schedule?.weeks ?? []),
    [schedule],
  );
  const selectedGame = getSelectedScheduledGame(scheduledGames, setup.gameId);
  const lineupTarget = getLineupTargetCount(setup.lineupSize, setup.selectedPlayerIds.length);
  const players = getActivePlayers(activeTeam);
  const selectedPlayerPool = useMemo(
    () => buildPregamePlayerPool(setup, activeTeam),
    [activeTeam, setup],
  );
  const lineupValidation = validateLineupPlayerPool(selectedPlayerPool);
  const canGenerateLineup = canGeneratePregameLineup(setup, lineupValidation);
  const suggestedLineup = resolveSuggestedLineupIds(setup, activeTeam);
  const canReviewLineup = canReviewSuggestedLineup(suggestedLineup);

  useEffect(() => {
    if (!activeTeam || !shouldAutoSelectScheduledGame(scheduledGames, selectedGame)) return;
    selectScheduledGameForPregame(activeTeam.id, scheduledGames[0], activeTeam);
  }, [activeTeam, scheduledGames, selectedGame]);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before setting up a game." />;
  }

  function togglePlayer(playerId: string) {
    savePregameSetup({
      ...setup,
      selectedPlayerIds: toggleSelectedPlayerId(setup.selectedPlayerIds, playerId),
      generatedLineupIds: [],
      acceptedLineupIds: [],
      startingDefense: null,
      status: "SETUP",
    });
  }

  function updateLineupSize(lineupSize: LineupSizeOption) {
    savePregameSetup({
      ...setup,
      lineupSize,
      generatedLineupIds: [],
      acceptedLineupIds: [],
      startingDefense: null,
      status: "SETUP",
    });
  }

  function generateLineup() {
    const generatedLineupIds = generateLineupIds(setup, activeTeam);

    savePregameSetup({
      ...setup,
      generatedLineupIds,
      acceptedLineupIds: [],
      status: "GENERATED",
    });
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <GameSetupStats setup={setup} lineupTarget={lineupTarget} playerCount={players.length} />

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <GameDetailsCard
            activeTeam={activeTeam}
            canGenerateLineup={canGenerateLineup}
            canReviewLineup={canReviewLineup}
            isScheduleLoading={isScheduleLoading}
            onGenerateLineup={generateLineup}
            onUpdateLineupSize={updateLineupSize}
            scheduledGames={scheduledGames}
            selectedGame={selectedGame}
            setup={setup}
            warnings={lineupValidation.warnings}
          />

          <ActivePlayersCard
            onTogglePlayer={togglePlayer}
            players={players}
            selectedPlayerIds={setup.selectedPlayerIds}
            setup={setup}
            suggestedLineup={suggestedLineup}
          />
        </div>

        <LeagueRulesCard rules={setup.gameRules} />
      </div>
    </section>
  );
}

function getScheduledGames(weeks: ScheduleWeek[]) {
  return weeks.filter(isScheduledGame);
}

function isScheduledGame(week: ScheduleWeek): week is ScheduledGame {
  return week.kind === "GAME" && week.status === "SCHEDULED";
}

function getSelectedScheduledGame(scheduledGames: ScheduledGame[], gameId: string | null) {
  return scheduledGames.find((game) => game.gameId === gameId) ?? null;
}

function getActivePlayers(activeTeam: ActiveTeam | null) {
  return activeTeam?.players.filter((player) => player.isActive) ?? [];
}

function canGeneratePregameLineup(
  setup: PregameSetup,
  lineupValidation: ReturnType<typeof validateLineupPlayerPool>,
) {
  return setup.selectedPlayerIds.length > 0 && lineupValidation.isLeagueCompliant;
}

function canReviewSuggestedLineup(suggestedLineup: ReturnType<typeof resolveSuggestedLineupIds>) {
  return Boolean(suggestedLineup.lineupIds.length || suggestedLineup.canGenerate);
}

function shouldAutoSelectScheduledGame(
  scheduledGames: ScheduledGame[],
  selectedGame: ScheduledGame | null,
) {
  return Boolean(scheduledGames.length && !selectedGame);
}

function toggleSelectedPlayerId(selectedPlayerIds: string[], playerId: string) {
  return selectedPlayerIds.includes(playerId)
    ? selectedPlayerIds.filter((id) => id !== playerId)
    : [...selectedPlayerIds, playerId];
}

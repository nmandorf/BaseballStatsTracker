"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BattingOrderSummaryTiles } from "@/components/BattingOrderSummaryTiles";
import { FullGameDefenseCard } from "@/components/FullGameDefenseCard";
import { RankingPriorityCard } from "@/components/RankingPriorityCard";
import { StartingDefenseCard } from "@/components/StartingDefenseCard";
import { SuggestedLineupCard } from "@/components/SuggestedLineupCard";
import { TeamSetupGate } from "@/components/TeamSetupGate";
import { formatCountdown } from "@/lib/countdownFormatting";
import { createDefensiveLineupPdf } from "@/lib/defensiveLineupPdf";
import { buildFullGameDefensiveLineupPlan } from "@/lib/defensiveLineupPlanner";
import { getLiveGameHref } from "@/lib/gameEngine";
import { createDefaultDefensiveAlignment, getDefensiveAlignmentIssues, getFirstDefensiveHalf } from "@/lib/defenseEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import {
  isLineupGenderOptimized,
  recommendBattingOrder,
  validateLineupGenderRules,
  validateLineupPlayerPool,
  type LineupRecommendationOptions,
  type LineupRankingPriority,
  type RecommendedLineupRow,
} from "@/lib/lineupRules";
import {
  buildPregamePlayerPool,
  generateLineupIds,
  isStartingDefenseSavedForFirstFieldingHalf,
  resolveSuggestedLineupIds,
  savePregameSetup,
  type PregameSetup,
  usePregameSetup,
} from "@/lib/pregameSetupStorage";
import { useBackendSyncedActiveTeam } from "@/lib/teamStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { gameStartLeadTimeMs } from "@/lib/scheduleRules";
import { startAcceptedGame } from "@/lib/startAcceptedGame";
import type { DefensiveAlignment } from "@/types/defense";
import type { ActiveTeam, Player } from "@/types/player";
import type { ScheduleWeek, TeamSchedule } from "@/types/schedule";

export function BattingOrderSection() {
  const router = useRouter();
  const activeTeam = useBackendSyncedActiveTeam();
  const setup = usePregameSetup();
  const { schedule } = useTeamSchedule(getActiveTeamId(activeTeam));
  const [now, setNow] = useState(() => Date.now());
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<LineupRankingPriority>("OBP");
  const [priorityOverrideActive, setPriorityOverrideActive] = useState(false);
  const [draftStartingDefense, setDraftStartingDefense] = useState<{
    key: string;
    alignment: DefensiveAlignment;
  } | null>(null);

  const rankingOptions = { rankingPriority: selectedPriority };
  const pregamePlayerPool = buildPregamePlayerPool(setup, activeTeam);
  const suggestedLineup = resolveSuggestedLineupIds(setup, activeTeam, {
    ...rankingOptions,
    useSavedGeneratedLineup: !priorityOverrideActive,
  });
  const playerPoolValidation = validateLineupPlayerPool(pregamePlayerPool);
  const lineup = resolveLineupRows({
    generatedLineupIds: suggestedLineup.lineupIds,
    manualOrderIds,
    pregamePlayerPool,
    rankingOptions,
  });
  const lineupPlayers = lineup.map((row) => row.player);
  const firstDefensiveHalf = getFirstDefensiveHalf(setup.isHome);
  const defenseDraftKey = getDefenseDraftKey(setup, firstDefensiveHalf, lineupPlayers);
  const currentDraftStartingDefense = getCurrentDraftStartingDefense(draftStartingDefense, defenseDraftKey);
  const savedDefenseAlignment = resolveStartingDefenseAlignment(lineupPlayers, setup.startingDefense, firstDefensiveHalf);
  const defenseAlignment = getDefenseAlignment(currentDraftStartingDefense, savedDefenseAlignment);
  const defenseIssues = getDefenseIssues(defenseAlignment, lineupPlayers);
  const startingDefenseSaved = isStartingDefenseSavedForFirstFieldingHalf(
    setup.startingDefense,
    defenseAlignment,
    firstDefensiveHalf,
  );
  const fullGameDefensePlan = getFullGameDefensePlan(lineupPlayers, firstDefensiveHalf, defenseAlignment, defenseIssues);
  const lineupValidation = validateLineupGenderRules(lineup.map((row) => row.player));
  const lineupGenderOptimized = isLineupGenderOptimized(lineup.map((row) => row.player));
  const acceptedMatchesLineup = doesAcceptedLineupMatch(setup, lineup);
  const selectedScheduledGame = getSelectedScheduledGame(schedule, setup.gameId);
  const startEligibleAt = getStartEligibleAt(selectedScheduledGame);
  const lineupReady = isLineupReady({
    acceptedMatchesLineup,
    defenseIssues,
    lineupGenderOptimized,
    lineupValidation,
    startingDefenseSaved,
  });
  const fullGameDefenseEmptyReason = getFullGameDefenseEmptyReason(defenseIssues);
  const canStartGame = canStartScheduledGame({
    isStarting,
    lineupReady,
    now,
    selectedScheduledGame,
    startEligibleAt,
  });
  const lineupWarnings = getLineupWarnings({
    lineup,
    lineupValidation,
    playerPoolValidation,
    suggestedWarnings: suggestedLineup.warnings,
  });
  const acceptIsPrimaryAction = !acceptedMatchesLineup;
  const startIsPrimaryAction = acceptedMatchesLineup;
  const startGameLabel = getStartGameLabel(selectedScheduledGame, now, startEligibleAt);
  const defenseStatusLabel = getDefenseStatusLabel(canStartGame, defenseIssues, startingDefenseSaved);

  useEffect(() => {
    const clientBase = Date.now();
    const serverBase = schedule ? Date.parse(schedule.serverNow) : clientBase;
    const timer = window.setInterval(() => setNow(serverBase + Date.now() - clientBase), 1_000);
    return () => window.clearInterval(timer);
  }, [schedule]);

  if (!activeTeam) {
    return <TeamSetupGate title="Create your team before reviewing the batting order." />;
  }

  function movePlayer(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= lineup.length) {
      return;
    }

    setManualOrderIds(() => {
      const copy = lineup.map((row) => row.player.id);
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  function generateLatestLineup() {
    if (!playerPoolValidation.isLeagueCompliant) {
      return;
    }

    const nextGeneratedLineupIds = generateLineupIds(setup, activeTeam, rankingOptions);

    setManualOrderIds(null);
    setPriorityOverrideActive(false);
    savePregameSetup({
      ...setup,
      generatedLineupIds: nextGeneratedLineupIds,
      acceptedLineupIds: [],
      startingDefense: null,
      status: "GENERATED",
    });
  }

  function selectRankingPriority(priority: LineupRankingPriority) {
    setSelectedPriority(priority);
    setPriorityOverrideActive(true);
    setManualOrderIds(null);
  }

  function acceptLineup() {
    if (!lineup.length || !lineupGenderOptimized) {
      return;
    }

    savePregameSetup({
      ...setup,
      generatedLineupIds: lineup.map((row) => row.player.id),
      acceptedLineupIds: lineup.map((row) => row.player.id),
      startingDefense: startingDefenseSaved ? defenseAlignment : null,
      status: "ACCEPTED",
    });
  }

  function saveStartingDefense() {
    if (!defenseAlignment || defenseIssues.length) {
      return;
    }

    savePregameSetup({
      ...setup,
      startingDefense: defenseAlignment,
    });
    setDraftStartingDefense(null);
  }

  async function startGame() {
    if (!activeTeam) {
      return;
    }

    if (!canStartGame) {
      return;
    }

    setIsStarting(true);
    setStartError(null);
    try {
      const startedGame = await startAcceptedGame({
        activeTeam,
        defenseAlignment,
        lineupPlayers,
        setup,
      });

      saveFirstGameState(startedGame.gameState);
      savePregameSetup(startedGame.acceptedSetup);
      router.push(getLiveGameHref(startedGame.gameState));
    } catch (caught) {
      setStartError(getStartGameErrorMessage(caught));
    } finally {
      setIsStarting(false);
    }
  }

  function downloadDefensiveLineupPdf() {
    if (!fullGameDefensePlan) {
      return;
    }

    const pdf = createDefensiveLineupPdf(fullGameDefensePlan);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");

    link.href = url;
    link.download = "defensive-lineup.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">Batting order and starting defense</h1>
        <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <BattingOrderSummaryTiles lineup={lineup} selectedPriority={selectedPriority} />
          <SuggestedLineupCard
            acceptedMatchesLineup={acceptedMatchesLineup}
            acceptIsPrimaryAction={acceptIsPrimaryAction}
            canGenerateLineup={playerPoolValidation.isLeagueCompliant}
            canStartGame={canStartGame}
            isStarting={isStarting}
            lineupGenderOptimized={lineupGenderOptimized}
            lineup={lineup}
            lineupWarnings={lineupWarnings}
            onAcceptLineup={acceptLineup}
            onGenerateLineup={generateLatestLineup}
            onMovePlayer={movePlayer}
            onResetLineup={() => setManualOrderIds(null)}
            onStartGame={startGame}
            selectedScheduledGameExists={Boolean(selectedScheduledGame)}
            startError={startError}
            startGameLabel={startGameLabel}
            startIsPrimaryAction={startIsPrimaryAction}
            suggestedLineupEmptyReason={suggestedLineup.emptyReason}
          />
          <StartingDefenseCard
            canStartGame={canStartGame}
            defenseAlignment={defenseAlignment}
            defenseIssues={defenseIssues}
            defenseStatusLabel={defenseStatusLabel}
            firstDefensiveHalf={firstDefensiveHalf}
            lineupPlayers={lineupPlayers}
            onDefenseChange={(alignment) => setDraftStartingDefense({ key: defenseDraftKey, alignment })}
            onSaveStartingDefense={saveStartingDefense}
            startingDefenseSaved={startingDefenseSaved}
          />
          <FullGameDefenseCard
            emptyReason={fullGameDefenseEmptyReason}
            fullGameDefensePlan={fullGameDefensePlan}
            onDownloadPdf={downloadDefensiveLineupPdf}
          />
          <RankingPriorityCard
            onSelectPriority={selectRankingPriority}
            selectedPriority={selectedPriority}
          />
        </div>
      </div>
    </section>
  );
}

function getStartGameErrorMessage(caught: unknown) {
  if (caught instanceof Error) {
    return caught.message;
  }

  return "Unable to start this game.";
}

function getActiveTeamId(activeTeam: ActiveTeam | null) {
  if (!activeTeam) {
    return null;
  }

  return activeTeam.id;
}

function getDefenseAlignment(
  currentDraftStartingDefense: DefensiveAlignment | null,
  savedDefenseAlignment: DefensiveAlignment | null,
) {
  if (currentDraftStartingDefense) {
    return currentDraftStartingDefense;
  }

  return savedDefenseAlignment;
}

function getDefenseIssues(defenseAlignment: DefensiveAlignment | null, lineupPlayers: Player[]) {
  if (!defenseAlignment) {
    return [];
  }

  return getDefensiveAlignmentIssues(defenseAlignment, lineupPlayers);
}

function isLineupReady({
  acceptedMatchesLineup,
  defenseIssues,
  lineupGenderOptimized,
  lineupValidation,
  startingDefenseSaved,
}: {
  acceptedMatchesLineup: boolean;
  defenseIssues: unknown[];
  lineupGenderOptimized: boolean;
  lineupValidation: ReturnType<typeof validateLineupGenderRules>;
  startingDefenseSaved: boolean;
}) {
  return [
    acceptedMatchesLineup,
    lineupValidation.isLeagueCompliant,
    lineupGenderOptimized,
    startingDefenseSaved,
    defenseIssues.length === 0,
  ].every(Boolean);
}

function getFullGameDefenseEmptyReason(defenseIssues: unknown[]) {
  if (defenseIssues.length) {
    return "Fix the starting defense to build the full-game grid.";
  }

  return "Generate a batting order to build the defensive grid.";
}

function canStartScheduledGame({
  isStarting,
  lineupReady,
  now,
  selectedScheduledGame,
  startEligibleAt,
}: {
  isStarting: boolean;
  lineupReady: boolean;
  now: number;
  selectedScheduledGame: ScheduleWeek | undefined;
  startEligibleAt: number;
}) {
  return [
    lineupReady,
    Boolean(selectedScheduledGame),
    now >= startEligibleAt,
    !isStarting,
  ].every(Boolean);
}

function getLineupWarnings({
  lineup,
  lineupValidation,
  playerPoolValidation,
  suggestedWarnings,
}: {
  lineup: RecommendedLineupRow[];
  lineupValidation: ReturnType<typeof validateLineupGenderRules>;
  playerPoolValidation: ReturnType<typeof validateLineupPlayerPool>;
  suggestedWarnings: string[];
}) {
  return [
    ...suggestedWarnings,
    ...playerPoolValidation.warnings,
    ...getLineupValidationWarnings(lineup, lineupValidation),
  ].filter((warning, index, warnings) => warnings.indexOf(warning) === index);
}

function getLineupValidationWarnings(
  lineup: RecommendedLineupRow[],
  lineupValidation: ReturnType<typeof validateLineupGenderRules>,
) {
  if (!lineup.length) {
    return [];
  }

  return lineupValidation.warnings;
}

function resolveStartingDefenseAlignment(
  lineupPlayers: RecommendedLineupRow["player"][],
  startingDefense: DefensiveAlignment | null,
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
) {
  if (!lineupPlayers.length) {
    return null;
  }

  return canReuseStartingDefense(startingDefense, lineupPlayers, firstDefensiveHalf)
    ? startingDefense
    : createDefaultDefensiveAlignment(lineupPlayers, firstDefensiveHalf.inning, firstDefensiveHalf.half);
}

function canReuseStartingDefense(
  startingDefense: DefensiveAlignment | null,
  lineupPlayers: RecommendedLineupRow["player"][],
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
) {
  if (!startingDefense) {
    return false;
  }

  if (startingDefense.inning !== firstDefensiveHalf.inning) {
    return false;
  }

  if (startingDefense.half !== firstDefensiveHalf.half) {
    return false;
  }

  return defenseUsesOnlyLineupPlayers(startingDefense, lineupPlayers);
}

function defenseUsesOnlyLineupPlayers(
  alignment: DefensiveAlignment,
  lineupPlayers: RecommendedLineupRow["player"][],
) {
  const activeLineupIds = new Set(lineupPlayers.map((player) => player.id));

  return Object.values(alignment.slots).every((slot) => (
    !slot ||
    slot.status === "VACANT" ||
    activeLineupIds.has(slot.playerId)
  ));
}

function resolveLineupRows(input: {
  generatedLineupIds: string[];
  manualOrderIds: string[] | null;
  pregamePlayerPool: Player[];
  rankingOptions: LineupRecommendationOptions;
}) {
  const recommendedRowsById = new Map(
    recommendBattingOrder(input.pregamePlayerPool, input.rankingOptions).map((row) => [row.player.id, row]),
  );
  const recommendedLineup = mapLineupRows(input.generatedLineupIds, recommendedRowsById);

  if (!input.manualOrderIds) {
    return recommendedLineup;
  }

  return mapLineupRows(input.manualOrderIds, new Map(recommendedLineup.map((row) => [row.player.id, row])));
}

function mapLineupRows(lineupIds: string[], rowsByPlayerId: Map<string, RecommendedLineupRow>) {
  return lineupIds
    .map((playerId) => rowsByPlayerId.get(playerId))
    .filter((row): row is RecommendedLineupRow => Boolean(row));
}

function getDefenseDraftKey(
  setup: PregameSetup,
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
  lineupPlayers: Player[],
) {
  return [
    setup.gameId ?? "unscheduled",
    firstDefensiveHalf.inning,
    firstDefensiveHalf.half,
    lineupPlayers.map((player) => player.id).join("|"),
  ].join("|");
}

function getCurrentDraftStartingDefense(
  draftStartingDefense: { key: string; alignment: DefensiveAlignment } | null,
  defenseDraftKey: string,
) {
  return draftStartingDefense?.key === defenseDraftKey
    ? draftStartingDefense.alignment
    : null;
}

function getFullGameDefensePlan(
  lineupPlayers: Player[],
  firstDefensiveHalf: ReturnType<typeof getFirstDefensiveHalf>,
  defenseAlignment: DefensiveAlignment | null,
  defenseIssues: unknown[],
) {
  if (!defenseAlignment || defenseIssues.length) {
    return null;
  }

  return buildFullGameDefensiveLineupPlan({
    players: lineupPlayers,
    firstInning: firstDefensiveHalf.inning,
    half: firstDefensiveHalf.half,
    startingAlignment: defenseAlignment,
  });
}

function doesAcceptedLineupMatch(setup: PregameSetup, lineup: RecommendedLineupRow[]) {
  return (
    lineup.length > 0 &&
    setup.acceptedLineupIds.length === lineup.length &&
    setup.acceptedLineupIds.every((playerId, index) => playerId === lineup[index]?.player.id)
  );
}

function getSelectedScheduledGame(schedule: TeamSchedule | null | undefined, gameId: string | null) {
  return schedule?.weeks.find((week) => week.kind === "GAME" && week.gameId === gameId);
}

function getStartEligibleAt(selectedScheduledGame: ScheduleWeek | undefined) {
  return selectedScheduledGame?.kind === "GAME"
    ? Date.parse(selectedScheduledGame.scheduledStartAt) - gameStartLeadTimeMs
    : Number.POSITIVE_INFINITY;
}

function getStartGameLabel(selectedScheduledGame: ScheduleWeek | undefined, now: number, startEligibleAt: number) {
  if (!selectedScheduledGame) {
    return "Start Game";
  }

  if (now < startEligibleAt) {
    return `Locked · ${formatCountdown(startEligibleAt - now)}`;
  }

  return "Start Game";
}

function getDefenseStatusLabel(
  canStartGame: boolean,
  defenseIssues: unknown[],
  startingDefenseSaved: boolean,
) {
  if (canStartGame) {
    return "Ready";
  }

  if (defenseIssues.length) {
    return "Fix defense";
  }

  return startingDefenseSaved ? "Saved" : "Save defense";
}

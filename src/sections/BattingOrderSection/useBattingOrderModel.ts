import { useEffect, useState } from "react";
import { getFirstDefensiveHalf } from "@/lib/defenseEngine";
import {
  isLineupGenderOptimized,
  validateLineupGenderRules,
  validateLineupPlayerPool,
  type LineupRankingPriority,
} from "@/lib/lineupRules";
import {
  buildPregamePlayerPool,
  isStartingDefenseSavedForFirstFieldingHalf,
  resolveSuggestedLineupIds,
  usePregameSetup,
} from "@/lib/pregameSetupStorage";
import { useTeamSchedule } from "@/lib/scheduleClient";
import { useBackendSyncedActiveTeam } from "@/lib/teamStorage";
import type { DefensiveAlignment } from "@/types/defense";
import {
  canStartScheduledGame,
  doesAcceptedLineupMatch,
  getActiveTeamId,
  getCurrentDraftStartingDefense,
  getDefenseAlignment,
  getDefenseDraftKey,
  getDefenseIssues,
  getDefenseStatusLabel,
  getFullGameDefenseEmptyReason,
  getFullGameDefensePlan,
  getLineupWarnings,
  getSelectedScheduledGame,
  getStartEligibleAt,
  getStartGameLabel,
  isLineupReady,
  resolveLineupRows,
  resolveStartingDefenseAlignment,
} from "./battingOrderDecisions";

export function useBattingOrderModel() {
  const activeTeam = useBackendSyncedActiveTeam();
  const setup = usePregameSetup();
  const { schedule } = useTeamSchedule(getActiveTeamId(activeTeam));
  const [now, setNow] = useState(() => Date.now());
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
  const [selectedPriority, setSelectedPriority] =
    useState<LineupRankingPriority>("OBP");
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
  const defenseDraftKey = getDefenseDraftKey(
    setup,
    firstDefensiveHalf,
    lineupPlayers,
  );
  const currentDraftStartingDefense = getCurrentDraftStartingDefense(
    draftStartingDefense,
    defenseDraftKey,
  );
  const savedDefenseAlignment = resolveStartingDefenseAlignment(
    lineupPlayers,
    setup.startingDefense,
    firstDefensiveHalf,
  );
  const defenseAlignment = getDefenseAlignment(
    currentDraftStartingDefense,
    savedDefenseAlignment,
  );
  const defenseIssues = getDefenseIssues(defenseAlignment, lineupPlayers);
  const startingDefenseSaved = isStartingDefenseSavedForFirstFieldingHalf(
    setup.startingDefense,
    defenseAlignment,
    firstDefensiveHalf,
  );
  const fullGameDefensePlan = getFullGameDefensePlan(
    lineupPlayers,
    firstDefensiveHalf,
    defenseAlignment,
    defenseIssues,
  );
  const lineupValidation = validateLineupGenderRules(lineupPlayers);
  const lineupGenderOptimized = isLineupGenderOptimized(lineupPlayers);
  const acceptedMatchesLineup = doesAcceptedLineupMatch(setup, lineup);
  const selectedScheduledGame = getSelectedScheduledGame(
    schedule,
    setup.gameId,
  );
  const startEligibleAt = getStartEligibleAt(selectedScheduledGame);
  const lineupReady = isLineupReady({
    acceptedMatchesLineup,
    defenseIssues,
    lineupGenderOptimized,
    lineupValidation,
    startingDefenseSaved,
  });
  const canStartGame = canStartScheduledGame({
    isStarting,
    lineupReady,
    now,
    selectedScheduledGame,
    startEligibleAt,
  });

  useEffect(() => {
    const clientBase = Date.now();
    const serverBase = schedule ? Date.parse(schedule.serverNow) : clientBase;
    const timer = window.setInterval(
      () => setNow(serverBase + Date.now() - clientBase),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [schedule]);

  return {
    acceptedMatchesLineup,
    activeTeam,
    canStartGame,
    defenseAlignment,
    defenseDraftKey,
    defenseIssues,
    defenseStatusLabel: getDefenseStatusLabel(
      canStartGame,
      defenseIssues,
      startingDefenseSaved,
    ),
    firstDefensiveHalf,
    fullGameDefenseEmptyReason: getFullGameDefenseEmptyReason(defenseIssues),
    fullGameDefensePlan,
    isStarting,
    lineup,
    lineupGenderOptimized,
    lineupPlayers,
    lineupWarnings: getLineupWarnings({
      lineup,
      lineupValidation,
      playerPoolValidation,
      suggestedWarnings: suggestedLineup.warnings,
    }),
    playerPoolValidation,
    rankingOptions,
    selectedPriority,
    selectedScheduledGame,
    setup,
    startError,
    startGameLabel: getStartGameLabel(
      selectedScheduledGame,
      now,
      startEligibleAt,
    ),
    startingDefenseSaved,
    suggestedLineup,
    setDraftStartingDefense,
    setIsStarting,
    setManualOrderIds,
    setPriorityOverrideActive,
    setSelectedPriority,
    setStartError,
  };
}

export type BattingOrderModel = ReturnType<typeof useBattingOrderModel>;

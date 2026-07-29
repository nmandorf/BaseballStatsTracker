import { useRouter } from "next/navigation";
import { createDefensiveLineupPdf } from "@/lib/defensiveLineupPdf";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import { getLiveGameHref } from "@/lib/gameEngine";
import { generateLineupIds, savePregameSetup } from "@/lib/pregameSetupStorage";
import { startAcceptedGame } from "@/lib/startAcceptedGame";
import type { DefensiveAlignment } from "@/types/defense";
import type { LineupRankingPriority } from "@/lib/lineupRules";
import { getStartGameErrorMessage } from "./battingOrderDecisions";
import type { BattingOrderModel } from "./useBattingOrderModel";

export function useBattingOrderActions(model: BattingOrderModel) {
  const router = useRouter();

  function movePlayer(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= model.lineup.length) {
      return;
    }

    model.setManualOrderIds(() => {
      const nextOrderIds = model.lineup.map((row) => row.player.id);
      [nextOrderIds[index], nextOrderIds[nextIndex]] = [
        nextOrderIds[nextIndex],
        nextOrderIds[index],
      ];
      return nextOrderIds;
    });
  }

  function generateLatestLineup() {
    if (!model.playerPoolValidation.isLeagueCompliant) {
      return;
    }

    const generatedLineupIds = generateLineupIds(
      model.setup,
      model.activeTeam,
      model.rankingOptions,
    );

    model.setManualOrderIds(null);
    model.setPriorityOverrideActive(false);
    savePregameSetup({
      ...model.setup,
      generatedLineupIds,
      acceptedLineupIds: [],
      startingDefense: null,
      status: "GENERATED",
    });
  }

  function selectRankingPriority(priority: LineupRankingPriority) {
    model.setSelectedPriority(priority);
    model.setPriorityOverrideActive(true);
    model.setManualOrderIds(null);
  }

  function acceptLineup() {
    if (!model.lineup.length || !model.lineupGenderOptimized) {
      return;
    }

    const lineupIds = model.lineup.map((row) => row.player.id);
    savePregameSetup({
      ...model.setup,
      generatedLineupIds: lineupIds,
      acceptedLineupIds: lineupIds,
      startingDefense: model.startingDefenseSaved
        ? model.defenseAlignment
        : null,
      status: "ACCEPTED",
    });
  }

  function changeDefense(alignment: DefensiveAlignment) {
    model.setDraftStartingDefense({
      key: model.defenseDraftKey,
      alignment,
    });
  }

  function saveStartingDefense() {
    if (!model.defenseAlignment || model.defenseIssues.length) {
      return;
    }

    savePregameSetup({
      ...model.setup,
      startingDefense: model.defenseAlignment,
    });
    model.setDraftStartingDefense(null);
  }

  async function startGame() {
    if (!model.activeTeam || !model.canStartGame) {
      return;
    }

    model.setIsStarting(true);
    model.setStartError(null);
    try {
      const startedGame = await startAcceptedGame({
        activeTeam: model.activeTeam,
        defenseAlignment: model.defenseAlignment,
        lineupPlayers: model.lineupPlayers,
        setup: model.setup,
      });

      saveFirstGameState(startedGame.gameState);
      savePregameSetup(startedGame.acceptedSetup);
      router.push(getLiveGameHref(startedGame.gameState));
    } catch (caught) {
      model.setStartError(getStartGameErrorMessage(caught));
    } finally {
      model.setIsStarting(false);
    }
  }

  function downloadDefensiveLineupPdf() {
    if (!model.fullGameDefensePlan) {
      return;
    }

    const pdf = createDefensiveLineupPdf(model.fullGameDefensePlan);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");

    link.href = url;
    link.download = "defensive-lineup.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return {
    acceptLineup,
    changeDefense,
    downloadDefensiveLineupPdf,
    generateLatestLineup,
    movePlayer,
    resetLineup: () => model.setManualOrderIds(null),
    saveStartingDefense,
    selectRankingPriority,
    startGame,
  };
}

export type BattingOrderActions = ReturnType<typeof useBattingOrderActions>;

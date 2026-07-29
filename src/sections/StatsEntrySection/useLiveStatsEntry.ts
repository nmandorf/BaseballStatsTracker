"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDefaultMovements,
  defaultRbiCredit,
  endGame,
  getCurrentBatter,
  getLatestCorrectablePlay,
  getLiveGameHref,
  getPlayerGameStats,
  getPlayerSeasonStats,
  getResultLockReason,
  getStateBeforeLatestPlayCorrection,
  occupiedBaseEntries,
  previewPlay,
  replaceLatestSavedPlay,
  savePlay,
  undoLastPlay,
  type GameState,
  type MovementSelections,
  type PinchRunnerSelections,
} from "@/lib/gameEngine";
import { saveFirstGameState } from "@/lib/firstGameStorage";
import { calculateStats } from "@/lib/statCalculations";
import {
  addPinchRunner,
  getCurrentPlayValidationError,
  getLastResultByBatter,
  getPinchRunnerOptions,
  getPreviewDetails,
  getSavableResult,
  movementSelectionsFromPlay,
  pinchRunnerSelectionsFromPlay,
  removePinchRunner,
} from "@/sections/StatsEntrySection/liveEntryDecisions";
import type { BatterResult, OutType, ScoredPlay } from "@/types/game";
import type { Player } from "@/types/player";
import type { BaseLabel, UiRunnerDestination } from "@/types/runner";

export function useLiveStatsEntry(gameState: GameState, teamName: string) {
  const router = useRouter();
  const [selectedResult, setSelectedResult] = useState<BatterResult | null>(null);
  const [selectedOutType, setSelectedOutType] = useState<OutType | undefined>();
  const [isOutTypeModalOpen, setIsOutTypeModalOpen] = useState(false);
  const [movements, setMovements] = useState<MovementSelections>({});
  const [rbiCredit, setRbiCredit] = useState(false);
  const [pinchRunners, setPinchRunners] = useState<PinchRunnerSelections>({});
  const [pinchBase, setPinchBase] = useState<BaseLabel | null>(null);
  const [editingPlayId, setEditingPlayId] = useState<string | null>(null);

  const correctablePlay = getLatestCorrectablePlay(gameState);
  const correctionState = useMemo(
    () => (editingPlayId ? getStateBeforeLatestPlayCorrection(gameState, editingPlayId) : null),
    [editingPlayId, gameState],
  );
  const scoringState = correctionState ?? gameState;
  const batter = getCurrentBatter(scoringState);
  const occupiedBases = occupiedBaseEntries(scoringState.bases);
  const defaultMovements = useMemo(
    () => (selectedResult ? createDefaultMovements(selectedResult, scoringState.bases) : {}),
    [scoringState.bases, selectedResult],
  );
  const effectiveMovements = useMemo(
    () => ({ ...defaultMovements, ...movements }),
    [defaultMovements, movements],
  );
  const preview = useMemo(
    () => selectedResult
      ? previewPlay(
        scoringState,
        selectedResult,
        effectiveMovements,
        pinchRunners,
        rbiCredit,
        selectedOutType,
      )
      : null,
    [effectiveMovements, pinchRunners, rbiCredit, scoringState, selectedOutType, selectedResult],
  );
  const batterGameStats = getPlayerGameStats(scoringState, batter.id);
  const batterStats = calculateStats(batterGameStats);
  const batterSeasonStats = calculateStats(getPlayerSeasonStats(batter, scoringState));
  const lastResultByBatter = useMemo(
    () => getLastResultByBatter(gameState.plays),
    [gameState.plays],
  );
  const previewDetails = getPreviewDetails(preview, scoringState.outs);
  const playValidationError = getCurrentPlayValidationError(
    scoringState,
    selectedResult,
    effectiveMovements,
    pinchRunners,
    selectedOutType,
  );
  const pinchRunnerOptions = getPinchRunnerOptions(
    scoringState.lineup,
    batter,
    occupiedBases,
    pinchRunners,
  );

  function selectResult(result: BatterResult) {
    if (getResultLockReason(result, scoringState.bases, scoringState.outs)) {
      return;
    }

    if (result === "Out") {
      setIsOutTypeModalOpen(true);
      return;
    }

    chooseResult(result);
  }

  function chooseResult(result: BatterResult, outType?: OutType) {
    const nextMovements = createDefaultMovements(result, scoringState.bases);
    const nextPreview = previewPlay(
      scoringState,
      result,
      nextMovements,
      pinchRunners,
      false,
      outType,
    );

    setSelectedResult(result);
    setSelectedOutType(result === "Out" ? outType : undefined);
    setMovements(nextMovements);
    setRbiCredit(defaultRbiCredit(result, scoringState.bases, nextPreview.runs));
  }

  function selectOutType(outType: OutType) {
    setIsOutTypeModalOpen(false);
    chooseResult("Out", outType);
  }

  function changeMovement(base: BaseLabel, destination: UiRunnerDestination) {
    setMovements((current) => ({ ...current, [base]: destination }));
  }

  function persistNextState(nextState: GameState, followPhase = false) {
    saveFirstGameState(nextState);

    if (followPhase) {
      router.replace(getLiveGameHref(nextState));
    }
  }

  function resetPlayForm() {
    setSelectedResult(null);
    setSelectedOutType(undefined);
    setIsOutTypeModalOpen(false);
    setMovements({});
    setPinchRunners({});
    setRbiCredit(false);
    setEditingPlayId(null);
  }

  function editLatestPlay(play: ScoredPlay) {
    setEditingPlayId(play.id);
    setSelectedResult(play.result);
    setSelectedOutType(play.outType);
    setMovements(movementSelectionsFromPlay(play));
    setPinchRunners(pinchRunnerSelectionsFromPlay(play));
    setRbiCredit(play.rbis > 0);
  }

  function saveCurrentPlay() {
    const result = getSavableResult(selectedResult, selectedOutType, playValidationError);

    if (result === "NEEDS_OUT_TYPE") {
      setIsOutTypeModalOpen(true);
      return;
    }

    if (!result) {
      return;
    }

    const nextState = editingPlayId
      ? replaceLatestSavedPlay(
        gameState,
        editingPlayId,
        result,
        effectiveMovements,
        pinchRunners,
        rbiCredit,
        selectedOutType,
      )
      : savePlay(
        gameState,
        result,
        effectiveMovements,
        pinchRunners,
        rbiCredit,
        selectedOutType,
      );

    persistNextState(nextState, true);
    resetPlayForm();
  }

  function undo() {
    persistNextState(undoLastPlay(gameState), true);
    resetPlayForm();
  }

  function endCurrentGame() {
    persistNextState(endGame(gameState, undefined, teamName));
    resetPlayForm();
    setPinchBase(null);
  }

  function removeSelectedPinchRunner(base: BaseLabel) {
    setPinchRunners((current) => removePinchRunner(current, base));
  }

  function selectPinchRunner(player: Player) {
    setPinchRunners((current) => addPinchRunner(
      current,
      pinchBase,
      player,
      scoringState.bases,
    ));
    setPinchBase(null);
  }

  return {
    batter,
    batterGameStats,
    batterSeasonStats,
    batterStats,
    changeMovement,
    closeOutTypeModal: () => setIsOutTypeModalOpen(false),
    closePinchRunnerModal: () => setPinchBase(null),
    correctablePlay,
    editLatestPlay,
    editingPlayId,
    effectiveMovements,
    endCurrentGame,
    isOutTypeModalOpen,
    lastResultByBatter,
    occupiedBases,
    pinchBase,
    pinchRunnerOptions,
    pinchRunners,
    playValidationError,
    previewDetails,
    rbiCredit,
    removeSelectedPinchRunner,
    resetPlayForm,
    saveCurrentPlay,
    scoringState,
    selectOutType,
    selectPinchRunner,
    selectResult,
    selectedResult,
    setPinchBase,
    setRbiCredit,
    undo,
  };
}

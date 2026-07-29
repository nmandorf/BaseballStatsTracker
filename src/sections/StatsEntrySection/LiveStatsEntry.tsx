"use client";

import { LiveGameHeader } from "@/components/LiveGameHeader";
import { OutTypeModal } from "@/components/OutTypeModal";
import { AfterPlaySummary } from "@/sections/StatsEntrySection/components/AfterPlaySummary";
import { BatterResultPanel } from "@/sections/StatsEntrySection/components/BatterResultPanel";
import { BattingOrderNav } from "@/sections/StatsEntrySection/components/BattingOrderNav";
import { CurrentBatterCard } from "@/sections/StatsEntrySection/components/CurrentBatterCard";
import { EditingPlayBanner } from "@/sections/StatsEntrySection/components/EditingPlayBanner";
import { PinchRunnerModal } from "@/sections/StatsEntrySection/components/PinchRunnerModal";
import { RbiControls } from "@/sections/StatsEntrySection/components/RbiControls";
import { RunnersOnBasePanel } from "@/sections/StatsEntrySection/components/RunnersOnBasePanel";
import { StickyPlayActions } from "@/sections/StatsEntrySection/components/StickyPlayActions";
import { useLiveStatsEntry } from "@/sections/StatsEntrySection/useLiveStatsEntry";
import type { GameState } from "@/lib/gameEngine";

type LiveStatsEntryProps = {
  gameState: GameState;
  teamName: string;
};

export function LiveStatsEntry({ gameState, teamName }: LiveStatsEntryProps) {
  const entry = useLiveStatsEntry(gameState, teamName);

  return (
    <section className="min-h-screen bg-background pb-28 pt-3 sm:pb-32">
      <LiveGameHeader
        activeMode="OFFENSE"
        currentPhase="BATTING"
        gameState={gameState}
        onEndGame={entry.endCurrentGame}
        teamName={teamName}
      />
      <div className="mx-auto mt-3 flex w-full max-w-md flex-col gap-3 px-3">
        <BattingOrderNav
          correctablePlay={entry.correctablePlay}
          currentBatterIndex={entry.scoringState.currentBatterIndex}
          editingPlayId={entry.editingPlayId}
          lastResultByBatter={entry.lastResultByBatter}
          lineup={gameState.lineup}
          onEditLatestPlay={entry.editLatestPlay}
        />

        <EditingPlayBanner
          batterName={entry.batter.name}
          editingPlayId={entry.editingPlayId}
          onCancel={entry.resetPlayForm}
          onSave={entry.saveCurrentPlay}
          playValidationError={entry.playValidationError}
          selectedResult={entry.selectedResult}
        />

        <CurrentBatterCard
          batter={entry.batter}
          batterGameStats={entry.batterGameStats}
          batterSeasonStats={entry.batterSeasonStats}
          batterStats={entry.batterStats}
          lineupPosition={entry.scoringState.currentBatterIndex + 1}
        />

        <BatterResultPanel
          bases={entry.scoringState.bases}
          onSelectResult={entry.selectResult}
          outs={entry.scoringState.outs}
          selectedResult={entry.selectedResult}
        />

        <RunnersOnBasePanel
          effectiveMovements={entry.effectiveMovements}
          occupiedBases={entry.occupiedBases}
          onChangeMovement={entry.changeMovement}
          onRemovePinchRunner={entry.removeSelectedPinchRunner}
          onSetPinchBase={entry.setPinchBase}
          pinchRunners={entry.pinchRunners}
        />

        <RbiControls
          batterName={entry.batter.name}
          hasRuns={entry.previewDetails.hasRuns}
          onSetRbiCredit={entry.setRbiCredit}
          previewRuns={entry.previewDetails.runs}
          rbiCredit={entry.rbiCredit}
        />

        <AfterPlaySummary
          lastSummary={gameState.lastSummary}
          playValidationError={entry.playValidationError}
          previewDetails={entry.previewDetails}
          rbiCredit={entry.rbiCredit}
        />
      </div>

      <StickyPlayActions
        canUndo={Boolean(gameState.history.length)}
        editingPlayId={entry.editingPlayId}
        onSave={entry.saveCurrentPlay}
        onUndo={entry.undo}
        playValidationError={entry.playValidationError}
        selectedResult={entry.selectedResult}
      />

      <OutTypeModal
        isOpen={entry.isOutTypeModalOpen}
        onClose={entry.closeOutTypeModal}
        onSelect={entry.selectOutType}
      />

      <PinchRunnerModal
        onClose={entry.closePinchRunnerModal}
        onSelect={entry.selectPinchRunner}
        pinchBase={entry.pinchBase}
        players={entry.pinchRunnerOptions}
      />
    </section>
  );
}

import { BattingOrderSummaryTiles } from "@/components/BattingOrderSummaryTiles";
import { FullGameDefenseCard } from "@/components/FullGameDefenseCard";
import { RankingPriorityCard } from "@/components/RankingPriorityCard";
import { StartingDefenseCard } from "@/components/StartingDefenseCard";
import { SuggestedLineupCard } from "@/components/SuggestedLineupCard";
import type { BattingOrderActions } from "./useBattingOrderActions";
import type { BattingOrderModel } from "./useBattingOrderModel";

export function BattingOrderView({
  actions,
  model,
}: {
  actions: BattingOrderActions;
  model: BattingOrderModel;
}) {
  const acceptIsPrimaryAction = !model.acceptedMatchesLineup;
  const startIsPrimaryAction = model.acceptedMatchesLineup;

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">Batting order and starting defense</h1>
        <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <BattingOrderSummaryTiles
            lineup={model.lineup}
            selectedPriority={model.selectedPriority}
          />
          <SuggestedLineupCard
            acceptedMatchesLineup={model.acceptedMatchesLineup}
            acceptIsPrimaryAction={acceptIsPrimaryAction}
            canGenerateLineup={
              model.playerPoolValidation.isLeagueCompliant
            }
            canStartGame={model.canStartGame}
            isStarting={model.isStarting}
            lineup={model.lineup}
            lineupGenderOptimized={model.lineupGenderOptimized}
            lineupWarnings={model.lineupWarnings}
            selectedScheduledGameExists={Boolean(
              model.selectedScheduledGame,
            )}
            startError={model.startError}
            startGameLabel={model.startGameLabel}
            startIsPrimaryAction={startIsPrimaryAction}
            suggestedLineupEmptyReason={model.suggestedLineup.emptyReason}
            onAcceptLineup={actions.acceptLineup}
            onGenerateLineup={actions.generateLatestLineup}
            onMovePlayer={actions.movePlayer}
            onResetLineup={actions.resetLineup}
            onStartGame={actions.startGame}
          />
          <StartingDefenseCard
            canStartGame={model.canStartGame}
            defenseAlignment={model.defenseAlignment}
            defenseIssues={model.defenseIssues}
            defenseStatusLabel={model.defenseStatusLabel}
            firstDefensiveHalf={model.firstDefensiveHalf}
            lineupPlayers={model.lineupPlayers}
            startingDefenseSaved={model.startingDefenseSaved}
            onDefenseChange={actions.changeDefense}
            onSaveStartingDefense={actions.saveStartingDefense}
          />
          <FullGameDefenseCard
            emptyReason={model.fullGameDefenseEmptyReason}
            fullGameDefensePlan={model.fullGameDefensePlan}
            onDownloadPdf={actions.downloadDefensiveLineupPdf}
          />
          <RankingPriorityCard
            selectedPriority={model.selectedPriority}
            onSelectPriority={actions.selectRankingPriority}
          />
        </div>
      </div>
    </section>
  );
}

import { StatusPill } from "@/components/StatusPill";
import type {
  LineupSizeOption,
  PregameSetup,
} from "@/lib/pregameSetupStorage";
import type { ActiveTeam } from "@/types/player";
import { LineupSetupControls } from "./LineupSetupControls";
import {
  ScheduledGameSelector,
  type ScheduledGame,
} from "./ScheduledGameSelector";

export function GameDetailsCard({
  activeTeam,
  canGenerateLineup,
  canReviewLineup,
  isScheduleLoading,
  onGenerateLineup,
  onUpdateLineupSize,
  scheduledGames,
  selectedGame,
  setup,
  warnings,
}: {
  activeTeam: ActiveTeam;
  canGenerateLineup: boolean;
  canReviewLineup: boolean;
  isScheduleLoading: boolean;
  onGenerateLineup: () => void;
  onUpdateLineupSize: (lineupSize: LineupSizeOption) => void;
  scheduledGames: ScheduledGame[];
  selectedGame: ScheduledGame | null;
  setup: PregameSetup;
  warnings: string[];
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Game details
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {selectedGame
              ? "Ready for lineup review"
              : "Choose an upcoming game"}
          </h2>
        </div>
        <StatusPill tone="planned">Local only</StatusPill>
      </div>
      <div className="mt-4 grid gap-3">
        <ScheduledGameSelector
          activeTeam={activeTeam}
          disabled={isScheduleLoading || !scheduledGames.length}
          scheduledGames={scheduledGames}
          selectedGame={selectedGame}
        />
        <LineupSetupControls
          canGenerateLineup={canGenerateLineup}
          canReviewLineup={canReviewLineup}
          hasSelectedGame={Boolean(selectedGame)}
          setup={setup}
          warnings={warnings}
          onGenerateLineup={onGenerateLineup}
          onUpdateLineupSize={onUpdateLineupSize}
        />
      </div>
    </article>
  );
}

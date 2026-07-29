"use client";

import Link from "next/link";
import { LiveGameHeader } from "@/components/LiveGameHeader";
import { getCurrentTeamPhase } from "@/lib/gameEngine";
import { useFirstGameState } from "@/lib/useFirstGameState";
import type { DefensiveAlignment, InningHalf } from "@/types/defense";
import {
  DefenseActionBar,
  DefensiveAlignmentCard,
} from "./DefenseAlignmentPanel";
import { DefensiveEventCard } from "./DefensiveEventCard";
import { useDefensiveEventForm } from "./useDefensiveEventForm";

export {
  FinalDefensePrompt,
  PregameDefensePrompt,
} from "./DefensePrompts";

export type AlignmentHalf = {
  inning: number;
  half: InningHalf;
};

export type DefenseSectionContext = {
  alignment: DefensiveAlignment;
  alignmentHalf: AlignmentHalf;
  isFielding: boolean;
  savedAlignment: DefensiveAlignment | null;
  teamPhase: ReturnType<typeof getCurrentTeamPhase>;
};

export function DefenseSectionLayout({
  activeTeamName,
  context,
  eventForm,
  gameState,
  previewSummary,
  onEndGame,
  onPersistAlignment,
  onSaveEvent,
  onUndo,
}: {
  activeTeamName: string;
  context: DefenseSectionContext;
  eventForm: ReturnType<typeof useDefensiveEventForm>;
  gameState: ReturnType<typeof useFirstGameState>;
  previewSummary: string;
  onEndGame: () => void;
  onPersistAlignment: (nextAlignment?: DefensiveAlignment) => void;
  onSaveEvent: () => void;
  onUndo: () => void;
}) {
  return (
    <section className="min-w-0 overflow-x-clip bg-background pb-28 pt-3 sm:pb-32">
      <LiveGameHeader
        activeMode="DEFENSE"
        currentPhase={context.teamPhase}
        gameState={gameState}
        onEndGame={onEndGame}
        teamName={activeTeamName}
      />
      <div className="mx-auto mt-3 w-full min-w-0 max-w-6xl px-3 sm:px-4 lg:px-6">
        <h1 className="sr-only">Live game defense</h1>

        {!context.isFielding ? <QueuedDefenseNotice /> : null}

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <DefensiveEventCard
            effectiveFielderId={eventForm.draft.effectiveFielderId}
            fielderOptions={gameState.lineup}
            handlers={eventForm.handlers}
            isFielding={context.isFielding}
            previewSummary={previewSummary}
            state={eventForm.state}
          />
          <DefensiveAlignmentCard
            alignment={context.alignment}
            alignmentHalf={context.alignmentHalf}
            lockedPitcherPlayerId={gameState.lockedPitcherPlayerId}
            players={gameState.lineup}
            priorAlignments={gameState.defensiveAlignments}
            savedAlignment={context.savedAlignment}
            onSaveAlignment={onPersistAlignment}
          />
        </div>
      </div>

      <DefenseActionBar
        canUndo={Boolean(gameState.history.length)}
        isFielding={context.isFielding}
        onSaveEvent={onSaveEvent}
        onUndo={onUndo}
      />
    </section>
  );
}

function QueuedDefenseNotice() {
  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-sm font-bold text-foreground">
        Defense is queued for the next fielding half.
      </p>
      <Link
        className="btn-base btn-primary mt-3 min-h-11 px-4 text-sm"
        href="/stats-entry"
      >
        Open Stats Entry
      </Link>
    </div>
  );
}

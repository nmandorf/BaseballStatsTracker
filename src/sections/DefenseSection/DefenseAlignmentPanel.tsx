"use client";

import { RotateCcw, Save } from "lucide-react";
import { DefensiveAlignmentEditor } from "@/components/DefensiveAlignmentEditor";
import { StatusPill } from "@/components/StatusPill";
import type { DefensiveAlignment } from "@/types/defense";
import type { Player } from "@/types/player";
import type { AlignmentHalf } from "./DefenseView";

export function DefensiveAlignmentCard({
  alignment,
  alignmentHalf,
  lockedPitcherPlayerId,
  players,
  priorAlignments,
  savedAlignment,
  onSaveAlignment,
}: {
  alignment: DefensiveAlignment;
  alignmentHalf: AlignmentHalf;
  lockedPitcherPlayerId: string | null;
  players: Player[];
  priorAlignments: DefensiveAlignment[];
  savedAlignment: DefensiveAlignment | null;
  onSaveAlignment: (nextAlignment?: DefensiveAlignment) => void;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Alignment
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {alignmentHalf.half} {alignmentHalf.inning}
          </h2>
        </div>
        <StatusPill tone={savedAlignment ? "done" : "review"}>
          {savedAlignment ? "Saved" : "Draft"}
        </StatusPill>
      </div>
      <div className="mt-4">
        <DefensiveAlignmentEditor
          alignment={alignment}
          lockedPitcherPlayerId={lockedPitcherPlayerId}
          players={players}
          priorAlignments={priorAlignments}
          onChange={onSaveAlignment}
        />
      </div>
      {!savedAlignment ? (
        <button
          className="btn-base btn-secondary mt-3 min-h-11 w-full px-4 text-sm"
          onClick={() => onSaveAlignment()}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          Save Alignment
        </button>
      ) : null}
    </article>
  );
}

export function DefenseActionBar({
  canUndo,
  isFielding,
  onSaveEvent,
  onUndo,
}: {
  canUndo: boolean;
  isFielding: boolean;
  onSaveEvent: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 py-3 shadow-2xl shadow-foreground/10 backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-[0.72fr_1.28fr] gap-2">
        <button
          className="btn-base btn-secondary min-h-12 text-sm"
          disabled={!canUndo}
          onClick={onUndo}
          type="button"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Undo
        </button>
        <button
          className="btn-base btn-primary min-h-12 px-3 text-sm"
          disabled={!isFielding}
          onClick={onSaveEvent}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          Save Defensive Event
        </button>
      </div>
    </div>
  );
}

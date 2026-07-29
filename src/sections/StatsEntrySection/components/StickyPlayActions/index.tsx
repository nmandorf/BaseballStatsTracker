import { RotateCcw, Save } from "lucide-react";
import type { BatterResult } from "@/types/game";

type StickyPlayActionsProps = {
  canUndo: boolean;
  editingPlayId: string | null;
  onSave: () => void;
  onUndo: () => void;
  playValidationError: string | null;
  selectedResult: BatterResult | null;
};

export function StickyPlayActions({
  canUndo,
  editingPlayId,
  onSave,
  onUndo,
  playValidationError,
  selectedResult,
}: StickyPlayActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 py-3 shadow-2xl shadow-foreground/10 backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-[0.72fr_1.28fr] gap-2">
        <button className="btn-base btn-secondary min-h-12 text-sm" disabled={!canUndo} onClick={onUndo} type="button">
          <RotateCcw className="size-4" aria-hidden="true" />
          Undo
        </button>
        <button
          className="btn-base btn-primary min-h-12 px-3 text-sm"
          disabled={!selectedResult || Boolean(playValidationError)}
          onClick={onSave}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          {editingPlayId ? "Save Changes + Continue" : "Save Play + Next Batter"}
        </button>
      </div>
    </div>
  );
}

import { Save } from "lucide-react";
import type { BatterResult } from "@/types/game";

type EditingPlayBannerProps = {
  batterName: string;
  editingPlayId: string | null;
  onCancel: () => void;
  onSave: () => void;
  playValidationError: string | null;
  selectedResult: BatterResult | null;
};

export function EditingPlayBanner({
  batterName,
  editingPlayId,
  onCancel,
  onSave,
  playValidationError,
  selectedResult,
}: EditingPlayBannerProps) {
  if (!editingPlayId) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <div>
        <p className="text-sm font-bold text-[var(--accent-strong)]">
          Editing {batterName}&apos;s latest saved play
        </p>
        <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
          Saving replaces the play and recalculates the score, outs, bases, and stats.
        </p>
      </div>
      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:mt-0">
        <button className="btn-base btn-secondary min-h-11 px-3 text-sm" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="btn-base btn-primary min-h-11 px-3 text-sm"
          disabled={!selectedResult || Boolean(playValidationError)}
          onClick={onSave}
          type="button"
        >
          <Save className="size-4" aria-hidden="true" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

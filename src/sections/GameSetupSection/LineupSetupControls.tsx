import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type {
  LineupSizeOption,
  PregameSetup,
} from "@/lib/pregameSetupStorage";

export function LineupSetupControls({
  canGenerateLineup,
  canReviewLineup,
  hasSelectedGame,
  onGenerateLineup,
  onUpdateLineupSize,
  setup,
  warnings,
}: {
  canGenerateLineup: boolean;
  canReviewLineup: boolean;
  hasSelectedGame: boolean;
  onGenerateLineup: () => void;
  onUpdateLineupSize: (lineupSize: LineupSizeOption) => void;
  setup: PregameSetup;
  warnings: string[];
}) {
  return (
    <>
      <label className="grid gap-1 text-sm font-bold text-foreground">
        Batting lineup size
        <select
          className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          onChange={(event) =>
            onUpdateLineupSize(event.target.value as LineupSizeOption)
          }
          value={setup.lineupSize}
        >
          {["9", "10", "11", "Everyone"].map((lineupSize) => (
            <option key={lineupSize} value={lineupSize}>
              {lineupSize}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <button
          className="btn-base btn-secondary min-h-12 px-4 text-sm"
          disabled={!canGenerateLineup || !hasSelectedGame}
          onClick={onGenerateLineup}
          type="button"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Generate Lineup
        </button>
        {canReviewLineup ? (
          <Link
            className="btn-base btn-primary min-h-12 px-4 text-sm"
            href="/batting-order"
          >
            Review
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <button
            className="btn-base btn-secondary min-h-12 px-4 text-sm text-[var(--muted-foreground)]"
            disabled
            type="button"
          >
            Review
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {warnings.length ? (
        <div className="mt-3 grid gap-2">
          {warnings.map((warning) => (
            <p
              className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
              key={warning}
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </>
  );
}

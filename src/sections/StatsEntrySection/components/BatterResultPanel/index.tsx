import { ResultButton } from "@/components/ResultButton";
import { batterResults, getResultLockReason, type GameState } from "@/lib/gameEngine";
import type { BatterResult } from "@/types/game";

type BatterResultPanelProps = {
  bases: GameState["bases"];
  onSelectResult: (result: BatterResult) => void;
  outs: number;
  selectedResult: BatterResult | null;
};

export function BatterResultPanel({
  bases,
  onSelectResult,
  outs,
  selectedResult,
}: BatterResultPanelProps) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        Batter result
      </p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {batterResults.map((result) => {
          const lockReason = getResultLockReason(result, bases, outs);

          return (
            <ResultButton
              disabled={Boolean(lockReason)}
              key={result}
              label={result}
              lockReason={lockReason ?? undefined}
              onClick={() => onSelectResult(result)}
              selected={result === selectedResult}
            />
          );
        })}
      </div>
    </article>
  );
}

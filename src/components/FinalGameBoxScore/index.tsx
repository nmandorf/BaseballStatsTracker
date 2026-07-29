import { ArrowRight, RotateCcw, Save } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { SummaryTile } from "@/components/SummaryTile";
import { getTeamGameTotals, type GameState } from "@/lib/gameEngine";
import { formatPercent, formatRate } from "@/lib/statCalculations";

type FinalGameBoxScoreProps = {
  finishLabel: string;
  gameState: GameState;
  onFinish: () => void;
  onReset?: () => void;
  teamTotals: ReturnType<typeof getTeamGameTotals>;
};

export function FinalGameBoxScore({
  finishLabel,
  gameState,
  onFinish,
  onReset,
  teamTotals,
}: FinalGameBoxScoreProps) {
  return (
    <article className="order-1 flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:order-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Final Game Stats
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Final box score</h2>
        </div>
        <StatusPill tone="ready">Final</StatusPill>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryTile label="PA" value={teamTotals.plateAppearances} />
        <SummaryTile label="AB" value={teamTotals.atBats} />
        <SummaryTile label="H" value={teamTotals.hits} />
        <SummaryTile label="BB" value={teamTotals.walks} />
        <SummaryTile label="ROE" value={teamTotals.reachedOnError} />
        <SummaryTile label="RBI" value={teamTotals.rbis} />
        <SummaryTile label="SLG" value={formatRate(teamTotals.sluggingPercentage)} />
        <SummaryTile label="OPS" value={formatRate(teamTotals.ops)} />
        <SummaryTile label="Out%" value={formatPercent(teamTotals.outs / Math.max(1, teamTotals.plateAppearances))} />
      </div>

      <div className="mt-4 rounded-lg bg-[var(--surface)] p-3 text-sm font-semibold text-foreground">
        {gameState.lastSummary}
      </div>

      <button className="btn-base btn-primary mt-auto min-h-12 w-full text-sm" onClick={onFinish} type="button">
        {onReset ? <Save className="size-4" aria-hidden="true" /> : null}
        {finishLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>

      {onReset ? (
        <button
          className="btn-base btn-secondary mt-2 min-h-11 w-full text-sm text-[var(--muted-foreground)]"
          onClick={onReset}
          type="button"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset Game
        </button>
      ) : null}
    </article>
  );
}

import { lineupRankingPriorities, type LineupRankingPriority } from "@/lib/lineupRules";

type RankingPriorityCardProps = {
  onSelectPriority: (priority: LineupRankingPriority) => void;
  selectedPriority: LineupRankingPriority;
};

export function RankingPriorityCard({ onSelectPriority, selectedPriority }: RankingPriorityCardProps) {
  return (
    <article className="order-6 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:col-span-2">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        Ranking priorities
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        Tap a priority to focus review
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        The priority chips recalculate the recommendation for the selected players before coach approval.
      </p>
      <div className="mt-4 grid gap-2">
        {lineupRankingPriorities.map((priority, index) => (
          <button
            className={
              selectedPriority === priority
                ? "btn-base btn-choice-selected min-h-11 w-full justify-start gap-3 px-3 text-left text-sm font-semibold"
                : "btn-base btn-choice min-h-11 w-full justify-start gap-3 px-3 text-left text-sm font-semibold"
            }
            aria-pressed={selectedPriority === priority}
            key={priority}
            onClick={() => onSelectPriority(priority)}
            type="button"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[var(--card)] text-xs font-bold text-[var(--accent)]">
              {index + 1}
            </span>
            {priority}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--accent-strong)]">
        Current focus: {selectedPriority}. Use the row arrows to adjust the local order before opening stats entry.
      </div>
    </article>
  );
}

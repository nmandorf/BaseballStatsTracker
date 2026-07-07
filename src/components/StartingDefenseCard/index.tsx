import { Save } from "lucide-react";
import { DefensiveAlignmentEditor } from "@/components/DefensiveAlignmentEditor";
import { StatusPill } from "@/components/StatusPill";
import type { DefensiveAlignment, InningHalf } from "@/types/defense";
import type { Player } from "@/types/player";

type DefenseIssue = {
  code: string;
  message: string;
};

type StartingDefenseCardProps = {
  canStartGame: boolean;
  defenseAlignment: DefensiveAlignment | null;
  defenseIssues: DefenseIssue[];
  defenseStatusLabel: string;
  firstDefensiveHalf: {
    half: InningHalf;
    inning: number;
  };
  lineupPlayers: Player[];
  onDefenseChange: (alignment: DefensiveAlignment) => void;
  onSaveStartingDefense: () => void;
  startingDefenseSaved: boolean;
};

export function StartingDefenseCard({
  canStartGame,
  defenseAlignment,
  defenseIssues,
  defenseStatusLabel,
  firstDefensiveHalf,
  lineupPlayers,
  onDefenseChange,
  onSaveStartingDefense,
  startingDefenseSaved,
}: StartingDefenseCardProps) {
  return (
    <article className="order-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Starting defense
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {firstDefensiveHalf.half} {firstDefensiveHalf.inning}
          </h2>
        </div>
        <StatusPill tone={canStartGame ? "ready" : "review"}>
          {defenseStatusLabel}
        </StatusPill>
      </div>
      <div className="mt-4">
        {defenseIssues.map((issue) => (
          <p
            className="mb-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
            key={issue.code}
            role="alert"
          >
            {issue.message}
          </p>
        ))}
        {defenseAlignment ? (
          <div className="grid gap-3">
            <button
              className="btn-base btn-secondary min-h-11 px-4 text-sm sm:w-fit"
              disabled={defenseIssues.length > 0}
              onClick={onSaveStartingDefense}
              type="button"
            >
              <Save className="size-4" aria-hidden="true" />
              Save Defense
            </button>
            {startingDefenseSaved ? (
              <p className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-sm font-bold text-[var(--success)]">
                Starting defense saved.
              </p>
            ) : null}
            <DefensiveAlignmentEditor
              alignment={defenseAlignment}
              players={lineupPlayers}
              onChange={onDefenseChange}
            />
          </div>
        ) : (
          <p className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-[var(--muted-foreground)]">
            Generate a batting order to set the defense.
          </p>
        )}
      </div>
    </article>
  );
}

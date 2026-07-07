import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { DefensiveAlignmentEditor } from "@/components/DefensiveAlignmentEditor";
import { StatusPill } from "@/components/StatusPill";
import type { DefensiveAlignment, InningHalf } from "@/types/defense";
import type { Player } from "@/types/player";

type DefenseIssue = {
  code: string;
  message: string;
};

type StartingDefenseCardProps = {
  acceptIsPrimaryAction: boolean;
  defenseAlignment: DefensiveAlignment | null;
  defenseAccepted: boolean;
  defenseActionsDisabled: boolean;
  defenseIssues: DefenseIssue[];
  defenseSaveError: string | null;
  defenseStatusLabel: string;
  firstDefensiveHalf: {
    half: InningHalf;
    inning: number;
  };
  isSavingStartingDefense: boolean;
  lineupPlayers: Player[];
  onAcceptDefense: () => void;
  onDefenseChange: (alignment: DefensiveAlignment) => void;
  onGenerateDefense: () => void;
  onResetDefense: () => void;
};

export function StartingDefenseCard({
  acceptIsPrimaryAction,
  defenseAlignment,
  defenseAccepted,
  defenseActionsDisabled,
  defenseIssues,
  defenseSaveError,
  defenseStatusLabel,
  firstDefensiveHalf,
  isSavingStartingDefense,
  lineupPlayers,
  onAcceptDefense,
  onDefenseChange,
  onGenerateDefense,
  onResetDefense,
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
        <StatusPill tone={defenseAccepted ? "done" : "review"}>
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
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                className="btn-base btn-secondary min-h-11 px-3 text-sm"
                disabled={defenseActionsDisabled || !lineupPlayers.length}
                onClick={onGenerateDefense}
                type="button"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Generate
              </button>
              <button
                className="btn-base btn-secondary min-h-11 px-3 text-sm"
                disabled={defenseActionsDisabled}
                onClick={onResetDefense}
                type="button"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
              <button
                className={getActionButtonClassName(acceptIsPrimaryAction)}
                disabled={defenseActionsDisabled || defenseIssues.length > 0}
                onClick={onAcceptDefense}
                type="button"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {isSavingStartingDefense ? "Accepting..." : "Accept"}
              </button>
            </div>
            {defenseSaveError ? (
              <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]" role="alert">
                {defenseSaveError}
              </p>
            ) : null}
            {defenseAccepted && !defenseSaveError ? (
              <p className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-sm font-bold text-[var(--success)]">
                Starting defense accepted.
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

function getActionButtonClassName(isPrimary: boolean) {
  return isPrimary
    ? "btn-base btn-primary min-h-11 px-3 text-sm"
    : "btn-base btn-secondary min-h-11 px-3 text-sm";
}

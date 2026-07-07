import Link from "next/link";
import { CheckCircle2, Play, RotateCcw, Sparkles } from "lucide-react";
import { LineupPlayerRow } from "@/components/LineupPlayerRow";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import type { RecommendedLineupRow } from "@/lib/lineupRules";

type SuggestedLineupCardProps = {
  acceptedMatchesLineup: boolean;
  acceptIsPrimaryAction: boolean;
  canGenerateLineup: boolean;
  canStartGame: boolean;
  isStarting: boolean;
  lineupGenderOptimized: boolean;
  lineup: RecommendedLineupRow[];
  lineupWarnings: string[];
  onAcceptLineup: () => void;
  onGenerateLineup: () => void;
  onMovePlayer: (index: number, direction: -1 | 1) => void;
  onResetLineup: () => void;
  onStartGame: () => void;
  selectedScheduledGameExists: boolean;
  startError: string | null;
  startGameLabel: string;
  startIsPrimaryAction: boolean;
  suggestedLineupEmptyReason: string | null | undefined;
};

export function SuggestedLineupCard({
  acceptedMatchesLineup,
  acceptIsPrimaryAction,
  canGenerateLineup,
  canStartGame,
  isStarting,
  lineupGenderOptimized,
  lineup,
  lineupWarnings,
  onAcceptLineup,
  onGenerateLineup,
  onMovePlayer,
  onResetLineup,
  onStartGame,
  selectedScheduledGameExists,
  startError,
  startGameLabel,
  startIsPrimaryAction,
  suggestedLineupEmptyReason,
}: SuggestedLineupCardProps) {
  return (
    <article className="order-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035] lg:order-3 lg:col-span-2">
      <SuggestedLineupHeader acceptedMatchesLineup={acceptedMatchesLineup} />
      <SuggestedLineupActions
        acceptIsPrimaryAction={acceptIsPrimaryAction}
        canAcceptLineup={Boolean(lineup.length && lineupGenderOptimized)}
        canGenerateLineup={canGenerateLineup}
        canStartGame={canStartGame}
        isStarting={isStarting}
        onAcceptLineup={onAcceptLineup}
        onGenerateLineup={onGenerateLineup}
        onResetLineup={onResetLineup}
        onStartGame={onStartGame}
        startGameLabel={startGameLabel}
        startIsPrimaryAction={startIsPrimaryAction}
      />
      <SuggestedLineupAlerts
        lineupWarnings={lineupWarnings}
        selectedScheduledGameExists={selectedScheduledGameExists}
        startError={startError}
      />
      <div className="mt-4 space-y-2">
        <SuggestedLineupRows
          emptyReason={suggestedLineupEmptyReason}
          lineup={lineup}
          onMovePlayer={onMovePlayer}
        />
      </div>
    </article>
  );
}

function SuggestedLineupHeader({ acceptedMatchesLineup }: Pick<SuggestedLineupCardProps, "acceptedMatchesLineup">) {
  const statusTone = acceptedMatchesLineup ? "done" : "review";
  const statusLabel = acceptedMatchesLineup ? "Done" : "Under Review";

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Suggested lineup
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Move hitters before coach approval
        </h2>
      </div>
      <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
    </div>
  );
}

type SuggestedLineupActionsProps = Pick<
  SuggestedLineupCardProps,
  | "acceptIsPrimaryAction"
  | "canGenerateLineup"
  | "canStartGame"
  | "isStarting"
  | "onAcceptLineup"
  | "onGenerateLineup"
  | "onResetLineup"
  | "onStartGame"
  | "startGameLabel"
  | "startIsPrimaryAction"
> & {
  canAcceptLineup: boolean;
};

function SuggestedLineupActions({
  acceptIsPrimaryAction,
  canAcceptLineup,
  canGenerateLineup,
  canStartGame,
  isStarting,
  onAcceptLineup,
  onGenerateLineup,
  onResetLineup,
  onStartGame,
  startGameLabel,
  startIsPrimaryAction,
}: SuggestedLineupActionsProps) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-4">
      <button
        className="btn-base btn-secondary min-h-11 px-3 text-sm"
        disabled={!canGenerateLineup}
        onClick={onGenerateLineup}
        type="button"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Generate
      </button>
      <button
        className="btn-base btn-secondary min-h-11 px-3 text-sm"
        onClick={onResetLineup}
        type="button"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset
      </button>
      <button
        className={getActionButtonClassName(acceptIsPrimaryAction)}
        disabled={!canAcceptLineup}
        onClick={onAcceptLineup}
        type="button"
      >
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Accept
      </button>
      <button
        className={getActionButtonClassName(startIsPrimaryAction)}
        disabled={!canStartGame}
        onClick={onStartGame}
        type="button"
      >
        <Play className="size-4" aria-hidden="true" />
        {isStarting ? "Starting..." : startGameLabel}
      </button>
    </div>
  );
}

type SuggestedLineupAlertsProps = Pick<
  SuggestedLineupCardProps,
  "lineupWarnings" | "selectedScheduledGameExists" | "startError"
>;

function SuggestedLineupAlerts({
  lineupWarnings,
  selectedScheduledGameExists,
  startError,
}: SuggestedLineupAlertsProps) {
  return (
    <>
      {selectedScheduledGameExists ? null : (
        <Link
          className="btn-base btn-secondary mt-3 min-h-11 px-4 text-sm"
          href="/game-setup"
        >
          Select Scheduled Game
        </Link>
      )}
      {startError ? <SuggestedLineupWarning>{startError}</SuggestedLineupWarning> : null}
      {lineupWarnings.map((warning) => (
        <SuggestedLineupWarning key={warning}>{warning}</SuggestedLineupWarning>
      ))}
    </>
  );
}

function SuggestedLineupWarning({ children }: { children: string }) {
  return (
    <p className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]">
      {children}
    </p>
  );
}

type SuggestedLineupRowsProps = Pick<SuggestedLineupCardProps, "lineup" | "onMovePlayer"> & {
  emptyReason: SuggestedLineupCardProps["suggestedLineupEmptyReason"];
};

function SuggestedLineupRows({ emptyReason, lineup, onMovePlayer }: SuggestedLineupRowsProps) {
  if (!lineup.length) {
    return <SuggestedLineupEmptyState reason={emptyReason} />;
  }

  return lineup.map((row, index) => (
    <LineupPlayerRow
      index={index}
      isFirst={index === 0}
      isLast={index === lineup.length - 1}
      key={row.player.id}
      onMovePlayer={onMovePlayer}
      row={row}
    />
  ));
}

function SuggestedLineupEmptyState({ reason }: { reason: SuggestedLineupRowsProps["emptyReason"] }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] p-4">
      <p className="text-sm font-bold text-foreground">
        {reason ?? "No suggested lineup is available yet."}
      </p>
      <Link
        className="btn-base btn-primary mt-3 min-h-11 px-4 text-sm"
        href="/game-setup"
      >
        Open Game Setup
      </Link>
    </div>
  );
}

function getActionButtonClassName(isPrimaryAction: boolean) {
  return cn(
    "btn-base min-h-11 px-3 text-sm",
    isPrimaryAction ? "btn-primary" : "btn-secondary",
  );
}

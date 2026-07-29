import { X } from "lucide-react";
import { PlayerForm } from "@/components/PlayerForm";
import { PriorStatsEditor } from "@/components/PriorStatsEditor";
import { getPlayerGameStats } from "@/lib/gameEngine";
import { addPlayerToActiveTeamBackend } from "@/lib/teamStorage";
import { useFirstGameState } from "@/lib/useFirstGameState";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";
import type { PlayerStats } from "@/types/stats";

export function AddPlayerDialog({
  isOpen,
  isSaving,
  seedOrder,
  onClose,
  onSavingChange,
}: {
  isOpen: boolean;
  isSaving: boolean;
  seedOrder: number;
  onClose: () => void;
  onSavingChange: (isSaving: boolean) => void;
}) {
  if (!isOpen) {
    return null;
  }

  async function submitPlayer(
    input: Parameters<typeof addPlayerToActiveTeamBackend>[0],
  ) {
    onSavingChange(true);
    try {
      await addPlayerToActiveTeamBackend(input);
      onClose();
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div
        aria-labelledby="add-player-dialog-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[38rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl sm:p-4"
        role="dialog"
      >
        <RosterDialogHeader
          closeLabel="Close add player dialog"
          title="Add new player"
          titleId="add-player-dialog-title"
          onClose={onClose}
        />
        <PlayerForm
          seedOrder={seedOrder}
          submitLabel={isSaving ? "Saving Player..." : "Save Player"}
          variant="plain"
          onCancel={onClose}
          onSubmit={submitPlayer}
        />
      </div>
    </div>
  );
}

export function EditPriorStatsDialog({
  firstGameState,
  player,
  stats,
  onClose,
  onSave,
}: {
  firstGameState: ReturnType<typeof useFirstGameState>;
  player: Player | null;
  stats: PlayerStats | null;
  onClose: () => void;
  onSave: (playerId: string, seasonStats: PlayerStats) => void;
}) {
  if (!player || !stats) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div
        aria-labelledby="edit-prior-stats-dialog-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[38rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl sm:p-5"
        role="dialog"
      >
        <RosterDialogHeader
          closeLabel="Close prior stats editor"
          sticky
          title="Edit Prior Stats"
          titleId="edit-prior-stats-dialog-title"
          onClose={onClose}
        />
        <PriorStatsEditor
          currentGameStats={getPlayerGameStats(firstGameState, player.id)}
          playerName={player.name}
          stats={stats}
          onCancel={onClose}
          onSave={(seasonStats) => onSave(player.id, seasonStats)}
        />
      </div>
    </div>
  );
}

function RosterDialogHeader({
  closeLabel,
  sticky = false,
  title,
  titleId,
  onClose,
}: {
  closeLabel: string;
  sticky?: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        sticky
          ? "sticky -top-4 z-10 mb-4 border-b py-3"
          : "mb-5 sm:mb-4",
        "flex items-start justify-between gap-3 border-[var(--border)] bg-[var(--card)]",
      )}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Roster
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground" id={titleId}>
          {title}
        </h2>
      </div>
      <button
        aria-label={closeLabel}
        className="btn-base btn-secondary size-11 min-h-0 shrink-0 p-0"
        onClick={onClose}
        type="button"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

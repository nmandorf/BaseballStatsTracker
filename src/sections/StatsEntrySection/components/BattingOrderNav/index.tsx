import { cn } from "@/lib/utils";
import type { ScoredPlay } from "@/types/game";
import type { BatterResult } from "@/types/game";
import type { Player } from "@/types/player";

type BattingOrderNavProps = {
  correctablePlay: ScoredPlay | null;
  currentBatterIndex: number;
  editingPlayId: string | null;
  lastResultByBatter: Map<string, BatterResult>;
  lineup: Player[];
  onEditLatestPlay: (play: ScoredPlay) => void;
};

export function BattingOrderNav({
  correctablePlay,
  currentBatterIndex,
  editingPlayId,
  lastResultByBatter,
  lineup,
  onEditLatestPlay,
}: BattingOrderNavProps) {
  return (
    <nav
      aria-label="Batting order"
      className="-mx-3 overflow-x-auto border-y border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:mx-0 sm:rounded-lg sm:border"
    >
      <div className="flex min-w-max gap-2">
        {lineup.map((player, index) => (
          <BattingOrderButton
            correctablePlay={correctablePlay}
            editingPlayId={editingPlayId}
            index={index}
            isCurrent={index === currentBatterIndex}
            key={player.id}
            lastResult={lastResultByBatter.get(player.id)}
            onEditLatestPlay={onEditLatestPlay}
            player={player}
          />
        ))}
      </div>
    </nav>
  );
}

function BattingOrderButton({
  correctablePlay,
  editingPlayId,
  index,
  isCurrent,
  lastResult,
  onEditLatestPlay,
  player,
}: {
  correctablePlay: ScoredPlay | null;
  editingPlayId: string | null;
  index: number;
  isCurrent: boolean;
  lastResult: BatterResult | undefined;
  onEditLatestPlay: (play: ScoredPlay) => void;
  player: Player;
}) {
  const canEdit = correctablePlay?.batterId === player.id && !editingPlayId;

  return (
    <button
      className={cn(
        "grid min-h-12 min-w-20 content-center rounded-lg px-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        isCurrent ? "bg-[var(--amber)] text-[var(--foreground)]" : "bg-[var(--surface)] text-foreground",
        canEdit && "ring-2 ring-inset ring-[var(--accent)]/35",
      )}
      disabled={!canEdit}
      onClick={() => correctablePlay && onEditLatestPlay(correctablePlay)}
      type="button"
    >
      <span>{index + 1}. {getFirstName(player.name)}</span>
      <span className={cn("mt-0.5 text-[0.68rem]", isCurrent ? "text-[var(--foreground)] opacity-75" : "text-[var(--muted-foreground)]")}>
        {getStatusLabel({ canEdit, editingPlayId, isCurrent, lastResult })}
      </span>
    </button>
  );
}

function getStatusLabel({
  canEdit,
  editingPlayId,
  isCurrent,
  lastResult,
}: {
  canEdit: boolean;
  editingPlayId: string | null;
  isCurrent: boolean;
  lastResult: BatterResult | undefined;
}) {
  if (isCurrent) {
    return editingPlayId ? "Editing" : "At bat";
  }

  return canEdit ? "Edit last play" : lastResult ?? "Ready";
}

function getFirstName(name: string) {
  return name.split(" ")[0];
}

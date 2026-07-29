import { X } from "lucide-react";
import type { Player } from "@/types/player";
import type { BaseLabel } from "@/types/runner";

type PinchRunnerModalProps = {
  onClose: () => void;
  onSelect: (player: Player) => void;
  pinchBase: BaseLabel | null;
  players: Player[];
};

export function PinchRunnerModal({
  onClose,
  onSelect,
  pinchBase,
  players,
}: PinchRunnerModalProps) {
  if (!pinchBase) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-[23rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl sm:max-w-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Pinch runner
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Choose runner for {pinchBase}
            </h2>
          </div>
          <button className="btn-base btn-secondary size-10 min-h-0 p-0" onClick={onClose} type="button">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {players.map((player) => (
            <button
              className="btn-base btn-secondary min-h-11 justify-start px-3 text-left text-sm"
              key={player.id}
              onClick={() => onSelect(player)}
              type="button"
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

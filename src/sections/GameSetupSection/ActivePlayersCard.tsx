import { Check } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import {
  resolveSuggestedLineupIds,
  type PregameSetup,
} from "@/lib/pregameSetupStorage";
import { cn } from "@/lib/utils";
import type { ActiveTeam } from "@/types/player";

export function ActivePlayersCard({
  onTogglePlayer,
  players,
  selectedPlayerIds,
  setup,
  suggestedLineup,
}: {
  onTogglePlayer: (playerId: string) => void;
  players: ActiveTeam["players"];
  selectedPlayerIds: string[];
  setup: PregameSetup;
  suggestedLineup: ReturnType<typeof resolveSuggestedLineupIds>;
}) {
  const lineupTitle =
    setup.lineupSize === "Everyone"
      ? "Everyone bats"
      : `${setup.lineupSize} hitter lineup`;
  const lineupMessage = suggestedLineup.lineupIds.length
    ? `${suggestedLineup.lineupIds.length} hitters ready for coach review.`
    : suggestedLineup.emptyReason ??
      "Generate the order after today's player list is set.";

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Active players
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {lineupTitle}
          </h2>
        </div>
        <StatusPill tone="ready">
          {selectedPlayerIds.length} selected
        </StatusPill>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((player) => {
          const selected = selectedPlayerIds.includes(player.id);
          return (
            <button
              className={cn(
                "btn-base min-h-10 min-w-0 justify-start px-3 text-left text-sm",
                selected
                  ? "btn-choice-selected"
                  : "btn-choice text-[var(--muted-foreground)]",
              )}
              aria-pressed={selected}
              key={player.id}
              onClick={() => onTogglePlayer(player.id)}
              type="button"
            >
              <Check
                className={cn(
                  "size-4",
                  selected ? "opacity-100" : "opacity-25",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">
                {player.name.split(" ")[0]}
              </span>
              <span className="shrink-0 rounded-full bg-[var(--card)] px-2 py-0.5 text-[0.65rem] leading-4">
                {player.gender}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--accent-strong)]">
        {lineupMessage}
      </div>
    </article>
  );
}

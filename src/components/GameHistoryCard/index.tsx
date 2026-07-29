import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import type { CompletedGameSummary } from "@/lib/gameEngine";

type GameHistoryCardProps = {
  games: CompletedGameSummary[];
  currentGameId?: string;
  className?: string;
};

export function GameHistoryCard({ games, currentGameId, className }: GameHistoryCardProps) {
  return (
    <article className={cn("flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Game History
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Completed games
          </h2>
        </div>
        <CalendarDays className="size-5 text-[var(--accent)]" aria-hidden="true" />
      </div>

      <div className="mt-4 grid flex-1 content-start gap-2">
        {games.length ? (
          games.map((game) => (
            <GameHistoryLink
              game={game}
              isCurrent={game.id === currentGameId}
              key={game.id}
            />
          ))
        ) : (
          <div className="rounded-lg bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
            No completed games yet. Finish a game from Stats Entry to add it here.
          </div>
        )}
      </div>
    </article>
  );
}

function GameHistoryLink({
  game,
  isCurrent,
}: {
  game: CompletedGameSummary;
  isCurrent: boolean;
}) {
  return (
    <Link
      className={cn(
        "block min-w-0 rounded-lg border p-3 text-sm transition",
        isCurrent
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-transparent bg-[var(--surface)] hover:border-[var(--accent)]/30",
      )}
      href={game.href}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">{game.opponent}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
            {formatGameDate(game.endedAt)}
          </p>
        </div>
        <StatusPill className="shrink-0" tone={game.result === "Win" ? "ready" : "planned"}>
          {game.result}
        </StatusPill>
      </div>
      <p className="mt-3 break-words text-lg font-semibold text-foreground">
        Us {game.teamScore} - Them {game.opponentScore}
      </p>
      <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)]">
        {game.playCount} play{game.playCount === 1 ? "" : "s"} saved
      </p>
    </Link>
  );
}

function formatGameDate(value: string | null) {
  if (!value) {
    return "Final";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

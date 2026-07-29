import Link from "next/link";
import { selectScheduledGameForPregame } from "@/lib/pregameSetupStorage";
import type { ActiveTeam } from "@/types/player";
import type { ScheduleWeek } from "@/types/schedule";

export type ScheduledGame = Extract<ScheduleWeek, { kind: "GAME" }>;

export function ScheduledGameSelector({
  activeTeam,
  disabled,
  scheduledGames,
  selectedGame,
}: {
  activeTeam: ActiveTeam;
  disabled: boolean;
  scheduledGames: ScheduledGame[];
  selectedGame: ScheduledGame | null;
}) {
  return (
    <>
      <label className="grid gap-1 text-sm font-bold text-foreground">
        Scheduled game
        <select
          className="min-h-11 rounded-lg border border-[var(--border)] bg-background px-3"
          disabled={disabled}
          onChange={(event) =>
            selectScheduledPregame(
              activeTeam,
              scheduledGames,
              event.target.value,
            )
          }
          value={selectedGame?.gameId ?? ""}
        >
          {!scheduledGames.length ? (
            <option value="">No upcoming games</option>
          ) : null}
          {scheduledGames.map((game) => (
            <option key={game.gameId} value={game.gameId}>
              {game.localDate} · {game.opponent} ·{" "}
              {game.isHome ? "Home" : "Away"}
            </option>
          ))}
        </select>
      </label>
      <SelectedGameSummary selectedGame={selectedGame} />
    </>
  );
}

function SelectedGameSummary({
  selectedGame,
}: {
  selectedGame: ScheduledGame | null;
}) {
  if (!selectedGame) {
    return (
      <Link
        className="btn-base btn-secondary min-h-11 text-sm"
        href="/schedule"
      >
        Manage Schedule
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-foreground">
        {selectedGame.opponent}
      </div>
      <div className="rounded-lg bg-[var(--surface)] p-3 text-sm font-bold text-foreground">
        {selectedGame.isHome ? "Home" : "Away"}
      </div>
    </div>
  );
}

function selectScheduledPregame(
  activeTeam: ActiveTeam,
  scheduledGames: ScheduledGame[],
  gameId: string,
) {
  const game = scheduledGames.find(
    (scheduledGame) => scheduledGame.gameId === gameId,
  );
  if (game) {
    selectScheduledGameForPregame(activeTeam.id, game, activeTeam);
  }
}

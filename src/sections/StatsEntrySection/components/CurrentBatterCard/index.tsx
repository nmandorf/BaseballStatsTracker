import { StatusPill } from "@/components/StatusPill";
import { SummaryTile } from "@/components/SummaryTile";
import { formatRate } from "@/lib/statCalculations";
import type { Player } from "@/types/player";
import type { CalculatedStats, PlayerStats } from "@/types/stats";

type CurrentBatterCardProps = {
  batter: Player;
  batterGameStats: PlayerStats;
  batterSeasonStats: CalculatedStats;
  batterStats: CalculatedStats;
  lineupPosition: number;
};

export function CurrentBatterCard({
  batter,
  batterGameStats,
  batterSeasonStats,
  batterStats,
  lineupPosition,
}: CurrentBatterCardProps) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Current batter
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">{batter.name}</h2>
          <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">{batter.roleHint}</p>
        </div>
        <StatusPill tone="ready">#{lineupPosition}</StatusPill>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryTile label="Game H-AB" value={`${batterGameStats.hits}-${batterGameStats.atBats}`} />
        <SummaryTile label="Game OBP" value={formatRate(batterStats.onBasePercentage)} />
        <SummaryTile label="Game SLG" value={formatRate(batterStats.sluggingPercentage)} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <SummaryTile label="Season OBP" value={formatRate(batterSeasonStats.onBasePercentage)} />
        <SummaryTile label="Speed" value={batter.speedRating} />
      </div>
    </article>
  );
}

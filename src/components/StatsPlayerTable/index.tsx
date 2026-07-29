import { formatRate } from "@/lib/statCalculations";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";
import type { CalculatedStats, PlayerStats } from "@/types/stats";

export type StatsPlayerRow = {
  player: Player;
  stats: PlayerStats;
  calculated: CalculatedStats;
};

type StatsPlayerTableProps = {
  rows: StatsPlayerRow[];
  label: string;
  className?: string;
};

export function StatsPlayerTable({ rows, label, className }: StatsPlayerTableProps) {
  return (
    <article className={cn("flex h-full min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm shadow-foreground/[0.035]", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="mt-3 w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3">Player</th>
              <th className="px-3">PA</th>
              <th className="px-3">H</th>
              <th className="px-3">R</th>
              <th className="px-3">RBI</th>
              <th className="px-3">AVG</th>
              <th className="px-3">OBP</th>
              <th className="px-3">SLG</th>
              <th className="px-3">OPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, stats, calculated }) => (
              <tr className="bg-[var(--surface)] font-semibold text-foreground" key={player.id}>
                <td className="rounded-l-lg px-3 py-2">{player.name}</td>
                <td className="px-3 py-2">{stats.plateAppearances}</td>
                <td className="px-3 py-2">{stats.hits}</td>
                <td className="px-3 py-2">{stats.runs}</td>
                <td className="px-3 py-2">{stats.rbis}</td>
                <td className="px-3 py-2">{formatRate(calculated.battingAverage)}</td>
                <td className="px-3 py-2">{formatRate(calculated.onBasePercentage)}</td>
                <td className="px-3 py-2">{formatRate(calculated.sluggingPercentage)}</td>
                <td className="rounded-r-lg px-3 py-2">{formatRate(calculated.ops)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

"use client";

import type { FullGameDefensiveLineupPlan } from "@/lib/defensiveLineupPlanner";

type FullGameDefenseTableProps = {
  fullGameDefensePlan: FullGameDefensiveLineupPlan;
};

export function FullGameDefenseTable({ fullGameDefensePlan }: FullGameDefenseTableProps) {
  return (
    <table className="w-full min-w-[760px] border-collapse text-sm">
      <thead>
        <tr className="bg-[#172033] text-white">
          <th className="min-w-48 border-r border-white/30 px-3 py-3 text-left font-bold">
            Batting Order
          </th>
          {fullGameDefensePlan.innings.map((inning) => (
            <th className="border-r border-white/30 px-3 py-3 text-center font-bold last:border-r-0" key={inning}>
              Inn {inning}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {fullGameDefensePlan.rows.map((row) => (
          <tr className="odd:bg-white even:bg-[var(--surface)]" key={row.playerId}>
            <th className="border-r border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left font-bold text-foreground">
              {row.battingOrderPosition}. {row.playerName}
            </th>
            {row.cells.map((cell) => (
              <td
                className={
                  cell.isBench
                    ? "border-r border-t border-[var(--border)] bg-[#f2c66d] px-3 py-3 text-center font-black text-[#5b3a00] last:border-r-0"
                    : "border-r border-t border-[var(--border)] px-3 py-3 text-center font-bold text-foreground last:border-r-0"
                }
                key={`${row.playerId}-${cell.inning}`}
              >
                {cell.value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { BarChart3, Medal, MoveDown } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import type { LineupRankingPriority, RecommendedLineupRow } from "@/lib/lineupRules";

type BattingOrderSummaryTilesProps = {
  lineup: RecommendedLineupRow[];
  selectedPriority: LineupRankingPriority;
};

export function BattingOrderSummaryTiles({ lineup, selectedPriority }: BattingOrderSummaryTilesProps) {
  return (
    <div className="order-3 grid gap-3 sm:grid-cols-3 lg:order-2 lg:col-span-2">
      <StatTile helper="Tap priority below" icon={BarChart3} label="Top metric" tone="accent" value={selectedPriority} />
      <StatTile helper={`Current #4: ${lineup[3]?.player.name.split(" ")[0] ?? "TBD"}`} icon={Medal} label="Power slot" tone="warning" value="#4" />
      <StatTile helper={`Current #10: ${lineup[9]?.player.name.split(" ")[0] ?? "TBD"}`} icon={MoveDown} label="Last spot" tone="success" value="Turn" />
    </div>
  );
}

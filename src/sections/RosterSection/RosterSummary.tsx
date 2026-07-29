import { ClipboardList, Filter, UserRound } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import {
  getVisiblePlayersHelper,
  type RosterFilter,
} from "./rosterDecisions";

export function RosterSummary({
  activeCount,
  filter,
  playerCount,
  visibleCount,
}: {
  activeCount: number;
  filter: RosterFilter;
  playerCount: number;
  visibleCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        helper="On this team"
        icon={UserRound}
        label="Players"
        value={String(playerCount)}
      />
      <StatTile
        helper="Available for games"
        icon={ClipboardList}
        label="Active"
        tone="success"
        value={String(activeCount)}
      />
      <StatTile
        helper={getVisiblePlayersHelper(filter)}
        icon={Filter}
        label="Visible"
        tone="accent"
        value={String(visibleCount)}
      />
    </div>
  );
}

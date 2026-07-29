import { CalendarDays, Home, UsersRound } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import type { PregameSetup } from "@/lib/pregameSetupStorage";

export { ActivePlayersCard } from "./ActivePlayersCard";
export { GameDetailsCard } from "./GameDetailsCard";
export { LeagueRulesCard } from "./LeagueRulesCard";

export function GameSetupStats({
  setup,
  lineupTarget,
  playerCount,
}: {
  setup: PregameSetup;
  lineupTarget: number;
  playerCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        helper="Opponent"
        icon={CalendarDays}
        label="Today"
        tone="accent"
        value={setup.opponent || "TBD"}
      />
      <StatTile
        helper={setup.isHome ? "Bat last" : "Bat first"}
        icon={Home}
        label="Side"
        value={setup.isHome ? "Home" : "Away"}
      />
      <StatTile
        helper={`${lineupTarget} in generated order`}
        icon={UsersRound}
        label="Active"
        tone="success"
        value={`${setup.selectedPlayerIds.length}/${playerCount}`}
      />
    </div>
  );
}

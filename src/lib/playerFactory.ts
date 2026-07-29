import type { Player, PlayerProfileInput } from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import { createDefaultDefensiveProfile } from "./defenseEngine.ts";
import {
  createPlayerFromProfileInput,
  createSlug,
} from "./playerProfileInput.ts";
import { createZeroStats } from "./statCalculations.ts";

const defaultRoleHints = [
  { maximumSeedOrder: 1, roleHint: "High OBP table-setter" },
  { maximumSeedOrder: 3, roleHint: "Contact hitter" },
  { maximumSeedOrder: 5, roleHint: "Power hitter" },
] as const;

export function createZeroPlayerStats(): PlayerStats {
  return createZeroStats();
}

export function createEmptyPlayerInput(
  seedOrder = 1,
): PlayerProfileInput {
  return {
    name: "",
    gender: "Unknown",
    bats: "Unknown",
    throws: "Unknown",
    primaryPosition: "",
    speedRating: "Average",
    notes: "",
    contactNotes: "",
    defensiveProfile: createDefaultDefensiveProfile(),
    roleHint: getDefaultRoleHint(seedOrder),
    isActive: true,
    startingStats: createZeroPlayerStats(),
  };
}

export function createPlayerFromInput(
  input: PlayerProfileInput,
  seedOrder: number,
): Player {
  const name = input.name.trim();
  const roleHint =
    input.roleHint.trim() || getDefaultRoleHint(seedOrder);

  return createPlayerFromProfileInput(
    { ...input, roleHint },
    seedOrder,
    createPlayerId(name, seedOrder),
  );
}

export function createPlayerId(name: string, seedOrder: number) {
  const suffix = Date.now().toString(36);
  const slug = createSlug(name) || `player-${seedOrder}`;

  return `${slug}-${suffix}`;
}

export function getDefaultRoleHint(seedOrder: number) {
  return (
    defaultRoleHints.find(
      (hint) => seedOrder <= hint.maximumSeedOrder,
    )?.roleHint ?? "Roster hitter"
  );
}

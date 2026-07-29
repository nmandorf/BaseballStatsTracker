import { getDefensiveSummary } from "@/lib/defenseEngine";
import { getPlayerSeasonStats } from "@/lib/gameEngine";
import { calculateStats, formatPercent, formatRate } from "@/lib/statCalculations";
import type { GameState } from "@/lib/gameEngine";
import type { Player, PlayerGender } from "@/types/player";
import type { PlayerStats } from "@/types/stats";

export type RosterFilter = "all" | "active" | "inactive";

export function filterRosterPlayers(players: Player[], query: string, filter: RosterFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  return players.filter((player) => (
    (!normalizedQuery || player.name.toLowerCase().includes(normalizedQuery))
    && (filter === "all" || player.isActive === (filter === "active"))
  ));
}

export function countActivePlayers(players: Player[]) {
  return players.filter((player) => player.isActive).length;
}

export function findPlayerById(players: Player[], playerId: string | null) {
  return playerId ? players.find((player) => player.id === playerId) ?? null : null;
}

export function getEditingStatsBaseline(editingStatsPlayer: Player | null, firstGameState: GameState) {
  if (!editingStatsPlayer) {
    return null;
  }

  return firstGameState.lineup.find((player) => player.id === editingStatsPlayer.id)?.seasonStats
    ?? editingStatsPlayer.seasonStats;
}

export function togglePlayerActive(players: Player[], playerId: string) {
  return players.map((player) => player.id === playerId ? { ...player, isActive: !player.isActive } : player);
}

export function updatePlayerGender(players: Player[], playerId: string, gender: Exclude<PlayerGender, "Unknown">) {
  return players.map((player) => player.id === playerId ? { ...player, gender } : player);
}

export function updatePlayerPrimaryPosition(players: Player[], playerId: string, primaryPosition: string) {
  return players.map((player) => player.id === playerId ? { ...player, primaryPosition } : player);
}

export function getTeamDeletionErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to delete the team. Please try again.";
}

export function getPersistedPriorStats(
  players: Player[],
  playerId: string,
  seasonStats: PlayerStats,
  previousGameState: GameState,
  nextGameState: GameState,
) {
  const player = players.find((item) => item.id === playerId);

  if (!player || nextGameState === previousGameState) {
    return seasonStats;
  }

  return getPlayerSeasonStats({ ...player, seasonStats }, nextGameState);
}

export function updatePlayerSeasonStats(players: Player[], playerId: string, seasonStats: PlayerStats) {
  return players.map((player) => player.id === playerId ? { ...player, seasonStats } : player);
}

export function getVisiblePlayersHelper(filter: RosterFilter) {
  return filter === "all" ? "Showing all" : `Showing ${filter}`;
}

export function formatRosterFilterLabel(filter: RosterFilter) {
  return filter[0].toUpperCase() + filter.slice(1);
}

export function buildPlayerStats(player: Player) {
  const calculated = calculateStats(player.seasonStats);
  return [
    { label: "PA", value: String(player.seasonStats.plateAppearances) },
    { label: "OBP", value: formatRate(calculated.onBasePercentage) },
    { label: "Out%", value: formatPercent(calculated.outRate) },
  ];
}

export function buildPlayerDefense(player: Player, gameState: GameState) {
  const summary = getDefensiveSummary(player, gameState.defensiveAlignments, gameState.defensiveEvents);
  const positions = Object.entries(summary.inningsByPosition)
    .filter(([, innings]) => Boolean(innings))
    .map(([position]) => position);

  return {
    defenseLabel: summary.bestFitLabel,
    defenseEvidence: summary.evidenceLabel,
    defenseNote: [player.defensiveProfile.notes.strengths, player.defensiveProfile.notes.weaknesses].filter(Boolean).join(" | "),
    defenseStats: [
      { label: "Inn", value: String(summary.defensiveInnings) },
      { label: "Pos", value: positions.length ? positions.join("/") : "-" },
      { label: "Routine", value: String(summary.routinePlaysMade) },
      { label: "Great", value: String(summary.greatPlays) },
      { label: "Mis", value: String(summary.misplays) },
      { label: "XB", value: String(summary.extraBasesAllowed) },
    ],
  };
}

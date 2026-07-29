import type { Player } from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import { addStats, createZeroStats } from "./statCalculations.ts";
import type { GameState } from "./gameEngine.ts";

export function getGameStats(state: GameState) {
  return state.statsByPlayerId;
}

export function getSeasonStats(lineup: Player[]) {
  return Object.fromEntries(
    lineup.map((player) => [player.id, player.seasonStats]),
  );
}

export function getSeasonStatsByPlayerId(
  players: Player[],
  state?: GameState,
) {
  return Object.fromEntries(
    players.map((player) => [player.id, getPlayerSeasonStats(player, state)]),
  );
}

export function getPlayerGameStats(state: GameState, playerId: string) {
  return state.statsByPlayerId[playerId] ?? createZeroStats();
}

export function getPlayerSeasonStats(player: Player, state?: GameState) {
  if (!state) {
    return player.seasonStats;
  }

  const lineupPlayer = state.lineup.find((item) => item.id === player.id);

  if (!lineupPlayer) {
    return player.seasonStats;
  }

  const playerGameStats = {
    ...getPlayerGameStats(state, player.id),
    gamesPlayed: state.status === "PREGAME" ? 0 : 1,
  };

  return addStats(lineupPlayer.seasonStats, playerGameStats);
}

export function updatePlayerSeasonStatsBaseline(
  state: GameState,
  playerId: string,
  seasonStats: PlayerStats,
): GameState {
  if (!state.lineup.some((player) => player.id === playerId)) {
    return state;
  }

  return {
    ...state,
    lineup: updateLineupPlayerSeasonStats(
      state.lineup,
      playerId,
      seasonStats,
    ),
    history: state.history.map((snapshot) => ({
      ...snapshot,
      lineup: updateLineupPlayerSeasonStats(
        snapshot.lineup,
        playerId,
        seasonStats,
      ),
    })),
  };
}

function updateLineupPlayerSeasonStats(
  lineup: Player[],
  playerId: string,
  seasonStats: PlayerStats,
) {
  return lineup.map((player) =>
    player.id === playerId ? { ...player, seasonStats } : player,
  );
}

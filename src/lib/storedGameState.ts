import type { GameState } from "./gameEngine.ts";
import { createInitialGameState } from "./gameEngine.ts";
import {
  defensivePositions,
  normalizeDefensiveAlignment,
} from "./defenseEngine.ts";
import { normalizeGameRules } from "./gameRules.ts";

export function normalizeStoredGameState(
  state: GameState,
  activePlayers: GameState["lineup"],
): GameState {
  const activePlayerIds = new Set(
    activePlayers.map((player) => player.id),
  );

  if (!doesStoredStateUseActiveTeam(state, activePlayerIds)) {
    return createInitialGameState(activePlayers);
  }

  const defensiveAlignments = normalizeStoredDefensiveAlignments(state);

  return {
    ...state,
    ...normalizeStoredGameMetadata(state),
    lineup: mergeStoredLineupWithActivePlayers(
      state.lineup,
      activePlayers,
    ),
    defensiveAlignments,
    defensiveEvents: normalizeStoredDefensiveEvents(state),
    lockedPitcherPlayerId: getStoredLockedPitcherPlayerId(
      state,
      defensiveAlignments,
    ),
    gameRules: normalizeGameRules(state.gameRules),
  };
}

function doesStoredStateUseActiveTeam(
  state: GameState,
  activePlayerIds: Set<string>,
) {
  return state.lineup.some((player) => activePlayerIds.has(player.id));
}

function normalizeStoredGameMetadata(state: GameState) {
  return {
    gameId: typeof state.gameId === "string" ? state.gameId : null,
    status: state.status ?? "PREGAME",
    endedAt: state.endedAt ?? null,
    opponent: state.opponent ?? "Opponent",
    isHome: state.isHome ?? false,
  };
}

function getStoredLockedPitcherPlayerId(
  state: GameState,
  defensiveAlignments: GameState["defensiveAlignments"],
) {
  return (
    state.lockedPitcherPlayerId ??
    inferPitcherPlayerId(defensiveAlignments)
  );
}

function mergeStoredLineupWithActivePlayers(
  storedLineup: GameState["lineup"],
  activePlayers: GameState["lineup"],
) {
  const activePlayersById = new Map(
    activePlayers.map((player) => [player.id, player]),
  );

  return storedLineup.map((player) => {
    const activePlayer = activePlayersById.get(player.id);

    return activePlayer
      ? {
          ...activePlayer,
          seasonStats: player.seasonStats,
        }
      : player;
  });
}

function normalizeStoredDefensiveAlignments(state: GameState) {
  return Array.isArray(state.defensiveAlignments)
    ? state.defensiveAlignments.map((alignment) =>
        normalizeDefensiveAlignment(alignment, state.lineup),
      )
    : [];
}

function normalizeStoredDefensiveEvents(state: GameState) {
  return Array.isArray(state.defensiveEvents)
    ? state.defensiveEvents.filter(
        (event) =>
          !event.position ||
          defensivePositions.includes(event.position),
      )
    : [];
}

function inferPitcherPlayerId(
  defensiveAlignments: GameState["defensiveAlignments"],
) {
  const firstPitcherSlot = defensiveAlignments.find(
    (alignment) => alignment.slots.P?.status === "ASSIGNED",
  )?.slots.P;

  return firstPitcherSlot?.status === "ASSIGNED"
    ? firstPitcherSlot.playerId
    : null;
}

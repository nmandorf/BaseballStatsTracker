import type { ScoredPlay } from "@/types/game";
import type { BasesState } from "@/types/runner";
import type { PlayerStats } from "@/types/stats";
import type { GameState, GameStateSnapshot } from "./gameEngine.ts";

export function cloneBases(bases: BasesState): BasesState {
  return {
    first: bases.first ? { ...bases.first } : null,
    second: bases.second ? { ...bases.second } : null,
    third: bases.third ? { ...bases.third } : null,
  };
}

export function cloneStats(stats: Record<string, PlayerStats>) {
  return Object.fromEntries(
    Object.entries(stats).map(([playerId, playerStats]) => [playerId, { ...playerStats }]),
  );
}

export function findPrePlaySnapshotIndex(state: GameState, play: ScoredPlay) {
  return state.history.findLastIndex((snapshot) => isPrePlaySnapshot(snapshot, play, state));
}

function isPrePlaySnapshot(
  snapshot: GameStateSnapshot,
  play: ScoredPlay,
  state: GameState,
) {
  return [
    snapshot.plays.length === state.plays.length - 1,
    snapshot.inning === play.inning,
    snapshot.half === getPlayHalf(play, state),
    getSnapshotBatterId(snapshot) === play.batterId,
  ].every(Boolean);
}

function getPlayHalf(play: ScoredPlay, state: GameState) {
  return play.half ?? state.half;
}

function getSnapshotBatterId(snapshot: GameStateSnapshot) {
  return snapshot.lineup[snapshot.currentBatterIndex]?.id;
}

export function snapshotState(state: GameState): GameStateSnapshot {
  return {
    gameId: state.gameId,
    status: state.status,
    endedAt: state.endedAt,
    opponent: state.opponent,
    isHome: state.isHome,
    gameRules: state.gameRules,
    lineup: state.lineup,
    currentBatterIndex: state.currentBatterIndex,
    inning: state.inning,
    half: state.half,
    outs: state.outs,
    teamScore: state.teamScore,
    opponentScore: state.opponentScore,
    bases: cloneBases(state.bases),
    defensiveAlignments: state.defensiveAlignments,
    defensiveEvents: state.defensiveEvents,
    lockedPitcherPlayerId: state.lockedPitcherPlayerId,
    statsByPlayerId: cloneStats(state.statsByPlayerId),
    plays: state.plays,
    lastSummary: state.lastSummary,
  };
}

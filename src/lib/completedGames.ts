import type { GameState } from "./gameEngine.ts";

export type CompletedGameSummary = {
  id: string;
  opponent: string;
  endedAt: string | null;
  teamScore: number;
  opponentScore: number;
  result: "Win" | "Loss" | "Tie";
  playCount: number;
  href: string;
};

export const firstGameHistoryId = "first-game";

export function getCompletedGameHistory(
  source: GameState | GameState[],
): CompletedGameSummary[] {
  return getCompletedGames(source).map(getCompletedGameSummary);
}

export function getCompletedGameById(
  source: GameState | GameState[],
  gameId: string,
) {
  return (
    getCompletedGames(source).find(
      (game) => getCompletedGameId(game) === gameId,
    ) ?? null
  );
}

export function upsertCompletedGame(
  games: GameState[],
  game: GameState,
): GameState[] {
  if (game.status !== "FINAL") {
    return games;
  }

  return [
    game,
    ...games.filter(
      (item) => getCompletedGameId(item) !== getCompletedGameId(game),
    ),
  ];
}

function getCompletedGames(source: GameState | GameState[]) {
  if (Array.isArray(source)) {
    return source.filter((game) => game.status === "FINAL");
  }

  return source.status === "FINAL" ? [source] : [];
}

function getCompletedGameSummary(state: GameState): CompletedGameSummary {
  const id = getCompletedGameId(state);

  return {
    id,
    opponent: state.opponent,
    endedAt: state.endedAt,
    teamScore: state.teamScore,
    opponentScore: state.opponentScore,
    result: getGameOutcomeLabel(state.teamScore, state.opponentScore),
    playCount: state.plays.length,
    href: `/stats/games/${id}`,
  };
}

function getCompletedGameId(state: GameState) {
  return state.gameId ?? firstGameHistoryId;
}

function getGameOutcomeLabel(
  teamScore: number,
  opponentScore: number,
): CompletedGameSummary["result"] {
  if (teamScore > opponentScore) return "Win";
  if (teamScore < opponentScore) return "Loss";
  return "Tie";
}

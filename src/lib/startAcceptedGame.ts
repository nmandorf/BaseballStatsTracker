import { createDefaultDefensiveAlignment, getFirstDefensiveHalf } from "@/lib/defenseEngine";
import { createInitialGameState, initializeStartingDefense } from "@/lib/gameEngine";
import {
  buildAcceptedPregameSetup,
  flushPregameSetupSync,
  resolveLineupPlayers,
  type PregameSetup,
} from "@/lib/pregameSetupStorage";
import { getVerifiedTeamAccountHeaders } from "@/lib/teamStorage";
import type { DefensiveAlignment, InningHalf } from "@/types/defense";
import type { ActiveTeam, Player } from "@/types/player";

type StartAcceptedGameInput = {
  activeTeam: ActiveTeam;
  defenseAlignment: DefensiveAlignment | null;
  lineupPlayers: Player[];
  setup: PregameSetup;
};

type StartedGame = {
  acceptedSetup: PregameSetup;
  gameState: ReturnType<typeof createInitialGameState>;
  startedPlayers: Player[];
};

export async function startAcceptedGame(input: StartAcceptedGameInput): Promise<StartedGame> {
  const gameId = input.setup.gameId;

  if (!gameId) {
    throw new Error("Select a scheduled game before starting.");
  }

  const acceptedPlayers = resolveAcceptedPlayers(input.setup.acceptedLineupIds, input.lineupPlayers);

  if (!acceptedPlayers.length) {
    throw new Error("Accept a batting order before starting.");
  }

  const firstDefensiveHalf = getFirstDefensiveHalf(input.setup.isHome);
  const startingDefense = resolveStartingDefense(
    input.defenseAlignment,
    acceptedPlayers,
    firstDefensiveHalf.inning,
    firstDefensiveHalf.half,
  );
  const acceptedSetup = buildAcceptedPregameSetup(
    input.setup,
    acceptedPlayers.map((player) => player.id),
    startingDefense,
  );

  await saveAcceptedPreparation(gameId, acceptedSetup);
  const startedSetup = await startScheduledGame(gameId, acceptedSetup);
  const startedPlayers = resolveStartedPlayers(startedSetup, input.activeTeam);
  const gameState = initializeStartingDefense(
    createStartedGameState(gameId, startedSetup, startedPlayers),
    startedSetup.startingDefense ?? startingDefense,
  );

  return {
    acceptedSetup: {
      ...startedSetup,
      generatedLineupIds: startedPlayers.map((player) => player.id),
      acceptedLineupIds: startedPlayers.map((player) => player.id),
      status: "STARTED",
    },
    gameState,
    startedPlayers,
  };
}

function resolveStartingDefense(
  defenseAlignment: DefensiveAlignment | null,
  acceptedPlayers: Player[],
  inning: number,
  half: InningHalf,
) {
  if (defenseAlignment) {
    return defenseAlignment;
  }

  return createDefaultDefensiveAlignment(acceptedPlayers, inning, half);
}

function resolveAcceptedPlayers(acceptedLineupIds: string[], lineupPlayers: Player[]) {
  const lineupPlayersById = new Map(lineupPlayers.map((player) => [player.id, player]));

  return acceptedLineupIds
    .map((playerId) => lineupPlayersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

async function saveAcceptedPreparation(gameId: string, acceptedSetup: PregameSetup) {
  await flushPregameSetupSync();
  const preparationResponse = await fetch(`/api/games/${encodeURIComponent(gameId)}/preparation`, {
    method: "PUT",
    headers: await getVerifiedTeamAccountHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(acceptedSetup),
  });

  if (preparationResponse.ok) {
    return;
  }

  throw new Error(await readApiErrorMessage(preparationResponse, "Unable to save the accepted lineup."));
}

async function startScheduledGame(
  gameId: string,
  acceptedSetup: PregameSetup,
) {
  const startResponse = await fetch(`/api/games/${encodeURIComponent(gameId)}/start`, {
    method: "POST",
    headers: await getVerifiedTeamAccountHeaders(),
  });

  if (!startResponse.ok) {
    const startErrorMessage = await readApiErrorMessage(startResponse, "Unable to start this game.");
    throw new Error(startErrorMessage);
  }

  const startPayload = await startResponse.json() as { preparation?: PregameSetup };

  return startPayload.preparation ?? acceptedSetup;
}

function resolveStartedPlayers(startedSetup: PregameSetup, activeTeam: ActiveTeam) {
  const startedLineupIds = startedSetup.acceptedLineupIds.length
    ? startedSetup.acceptedLineupIds
    : startedSetup.generatedLineupIds;
  const startedPlayers = resolveLineupPlayers(startedLineupIds, activeTeam);

  if (!startedPlayers.length) {
    throw new Error("Unable to load the started game's lineup.");
  }

  return startedPlayers;
}

function createStartedGameState(gameId: string, startedSetup: PregameSetup, startedPlayers: Player[]) {
  return createInitialGameState(startedPlayers, {
    gameId,
    opponent: startedSetup.opponent || "Opponent",
    isHome: startedSetup.isHome,
    gameRules: startedSetup.gameRules,
    status: "IN_PROGRESS",
  });
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    return payload.error?.message ?? `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { installLocalStorage } from "./helpers/local-storage.mjs";
import { createInitialGameState } from "../src/lib/gameEngine.ts";
import { normalizeGameRules } from "../src/lib/gameRules.ts";
import {
  buildAcceptedPregameSetup,
  buildDefenseAcceptedPregameSetup,
  buildPregamePlayerPool,
  createDefaultPregameSetup,
  isStartingDefenseSavedForFirstFieldingHalf,
  resolveSuggestedLineupIds,
  savePregameSetupWithBackendConfirmation,
} from "../src/lib/pregameSetupStorage.ts";
import { validateLineupGenderRules } from "../src/lib/lineupRules.ts";
import { createDefaultDefensiveAlignment } from "../src/lib/defenseEngine.ts";
import { defaultGameRules, seedPlayers } from "../src/lib/seedTeam.ts";

const startRouteSource = readFileSync(
  new URL("../src/app/api/games/[gameId]/start/route.ts", import.meta.url),
  "utf8",
);
const battingOrderSource = readFileSync(
  new URL("../src/sections/BattingOrderSection/index.tsx", import.meta.url),
  "utf8",
);
const suggestedLineupCardSource = readFileSync(
  new URL("../src/components/SuggestedLineupCard/index.tsx", import.meta.url),
  "utf8",
);
const startingDefenseCardSource = readFileSync(
  new URL("../src/components/StartingDefenseCard/index.tsx", import.meta.url),
  "utf8",
);
const pregameSetupStorageSource = readFileSync(
  new URL("../src/lib/pregameSetupStorage.ts", import.meta.url),
  "utf8",
);
const scheduleBackendSource = readFileSync(
  new URL("../src/lib/scheduleBackend.ts", import.meta.url),
  "utf8",
);
const startAcceptedGameSource = readFileSync(
  new URL("../src/lib/startAcceptedGame.ts", import.meta.url),
  "utf8",
);

function activeTeam(players = seedPlayers) {
  return {
    id: "team-1",
    name: "Tuesday Crew",
    players,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:00:00.000Z",
  };
}

function getPlayersForLineup(team, lineupIds) {
  const playersById = new Map(team.players.map((player) => [player.id, player]));
  return lineupIds
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean);
}

function resolveLineupForSetup(setup, team) {
  const suggestedLineup = resolveSuggestedLineupIds(setup, team);

  return {
    suggestedLineup,
    lineupPlayers: getPlayersForLineup(team, suggestedLineup.lineupIds),
  };
}

test("normalizeGameRules falls back to safe defaults", () => {
  const rules = normalizeGameRules({
    homeRunLimitEnabled: false,
    homeRunLimit: -1,
    afterHomeRunLimit: "Bogus",
    runLimitPerInning: null,
    mercyRule: "  ",
    walksAllowed: false,
  });

  assert.equal(rules.homeRunLimitEnabled, false);
  assert.equal(rules.homeRunLimit, defaultGameRules.homeRunLimit);
  assert.equal(rules.afterHomeRunLimit, defaultGameRules.afterHomeRunLimit);
  assert.equal(rules.runLimitPerInning, null);
  assert.equal(rules.mercyRule, defaultGameRules.mercyRule);
  assert.equal(rules.walksAllowed, false);
});

test("createInitialGameState preserves configured game rules", () => {
  const gameRules = {
    ...defaultGameRules,
    homeRunLimit: 7,
    walksAllowed: false,
  };
  const state = createInitialGameState(seedPlayers.slice(0, 10), {
    gameRules,
    status: "IN_PROGRESS",
  });

  assert.equal(state.gameRules.homeRunLimit, 7);
  assert.equal(state.gameRules.walksAllowed, false);
});

test("buildAcceptedPregameSetup persists the accepted lineup and starting defense", () => {
  const team = activeTeam();
  const setup = createDefaultPregameSetup(team);
  const acceptedLineupIds = seedPlayers.slice(0, 10).map((player) => player.id);
  const startingDefense = createDefaultDefensiveAlignment(seedPlayers.slice(0, 10), 1, "Top");
  const acceptedSetup = buildAcceptedPregameSetup(setup, acceptedLineupIds, startingDefense);

  assert.equal(acceptedSetup.status, "ACCEPTED");
  assert.deepEqual(acceptedSetup.generatedLineupIds, acceptedLineupIds);
  assert.deepEqual(acceptedSetup.acceptedLineupIds, acceptedLineupIds);
  assert.equal(acceptedSetup.startingDefense, startingDefense);
});

test("buildDefenseAcceptedPregameSetup validates defense against the displayed lineup", () => {
  const team = activeTeam();
  const setup = createDefaultPregameSetup(team);
  const displayedLineupIds = seedPlayers.slice(0, 10).map((player) => player.id);
  const startingDefense = createDefaultDefensiveAlignment(seedPlayers.slice(0, 10), 1, "Top");
  const defenseFirstSetup = buildDefenseAcceptedPregameSetup(setup, displayedLineupIds, startingDefense, false);

  assert.equal(defenseFirstSetup.status, "GENERATED");
  assert.deepEqual(defenseFirstSetup.generatedLineupIds, displayedLineupIds);
  assert.deepEqual(defenseFirstSetup.acceptedLineupIds, []);
  assert.equal(defenseFirstSetup.startingDefense, startingDefense);

  const offenseAcceptedSetup = buildDefenseAcceptedPregameSetup(setup, displayedLineupIds, startingDefense, true);

  assert.equal(offenseAcceptedSetup.status, "ACCEPTED");
  assert.deepEqual(offenseAcceptedSetup.generatedLineupIds, displayedLineupIds);
  assert.deepEqual(offenseAcceptedSetup.acceptedLineupIds, displayedLineupIds);
  assert.equal(offenseAcceptedSetup.startingDefense, startingDefense);
});

test("isStartingDefenseSavedForFirstFieldingHalf requires a saved current defense", () => {
  const startingDefense = createDefaultDefensiveAlignment(seedPlayers.slice(0, 10), 1, "Top");
  const editedDefense = {
    ...startingDefense,
    slots: {
      ...startingDefense.slots,
      RF: { status: "VACANT" },
    },
  };

  assert.equal(
    isStartingDefenseSavedForFirstFieldingHalf(startingDefense, startingDefense, { inning: 1, half: "Top" }),
    true,
  );
  assert.equal(
    isStartingDefenseSavedForFirstFieldingHalf(null, startingDefense, { inning: 1, half: "Top" }),
    false,
  );
  assert.equal(
    isStartingDefenseSavedForFirstFieldingHalf(startingDefense, startingDefense, { inning: 1, half: "Bottom" }),
    false,
  );
  assert.equal(
    isStartingDefenseSavedForFirstFieldingHalf(startingDefense, editedDefense, { inning: 1, half: "Top" }),
    false,
  );
});

test("start route returns canonical preparation after authorizing start", () => {
  assert.match(startRouteSource, /authorizeScheduledGameStart\(gameId, account\)/);
  assert.doesNotMatch(startRouteSource, /loadGamePreparation/);
  assert.match(scheduleBackendSource, /preparation: buildStartedGamePreparation/);
});

test("pregame start ignores stale wrong-half defensive alignments", () => {
  assert.match(battingOrderSource, /scheduledGameIsHome = selectedScheduledGame\?\.kind === "GAME" \? selectedScheduledGame\.isHome : setup\.isHome/);
  assert.match(battingOrderSource, /const firstDefensiveHalf = getFirstDefensiveHalf\(scheduledGameIsHome\)/);
  assert.match(battingOrderSource, /startingDefense: startingDefenseSaved \? setup\.startingDefense : null/);
  assert.match(battingOrderSource, /startingDefense\.inning !== firstDefensiveHalf\.inning/);
  assert.match(scheduleBackendSource, /getPrismaFirstDefensiveHalf\(game\.isHome\)/);
  assert.match(scheduleBackendSource, /alignment\.inning === 1 && alignment\.half === firstDefensiveHalf/);
  assert.doesNotMatch(scheduleBackendSource, /defensiveAlignments: \{[^}]*take: 1/s);
});

test("pregame offense and defense use matching accept actions", () => {
  assert.match(suggestedLineupCardSource, />\s*Generate\s*</);
  assert.match(suggestedLineupCardSource, />\s*Reset\s*</);
  assert.match(suggestedLineupCardSource, /isSavingLineup \? "Accepting\.\.\." : "Accept"/);
  assert.doesNotMatch(suggestedLineupCardSource, /Start Game|startGameLabel|onStartGame/);

  assert.match(startingDefenseCardSource, />\s*Generate\s*</);
  assert.match(startingDefenseCardSource, />\s*Reset\s*</);
  assert.match(startingDefenseCardSource, /isSavingStartingDefense \? "Accepting\.\.\." : "Accept"/);
  assert.doesNotMatch(startingDefenseCardSource, /Save Defense|Starting defense saved/);
});

test("accepted pregame preparation waits for backend confirmation", () => {
  assert.match(pregameSetupStorageSource, /export async function savePregameSetupWithBackendConfirmation/);
  assert.match(pregameSetupStorageSource, /await savePregameSetupToBackend\(nextSetup\)/);
  assert.match(
    battingOrderSource,
    /await savePregameSetupWithBackendConfirmation\(buildDefenseAcceptedPregameSetup\(/,
  );
  assert.match(
    battingOrderSource,
    /await savePregameSetupWithBackendConfirmation\(\{\s*\.\.\.setup,\s*isHome: scheduledGameIsHome,\s*generatedLineupIds: acceptedLineupIds,\s*acceptedLineupIds,/s,
  );
  assert.match(battingOrderSource, /defenseSaveError/);
  assert.match(battingOrderSource, /lineupSaveError/);
  assert.match(battingOrderSource, /function StartGameAction/);
});

test("failed confirmed preparation save does not mark local setup saved", async () => {
  const restoreStorage = installLocalStorage();
  const previousFetch = global.fetch;
  global.fetch = async () => new Response(
    JSON.stringify({ error: { message: "Defense rejected by server." } }),
    { status: 409 },
  );

  try {
    const setup = {
      ...createDefaultPregameSetup(activeTeam()),
      gameId: "game-1",
      startingDefense: createDefaultDefensiveAlignment(seedPlayers.slice(0, 10), 1, "Top"),
      status: "GENERATED",
    };

    await assert.rejects(
      savePregameSetupWithBackendConfirmation(setup),
      /Defense rejected by server\./,
    );
    assert.equal(window.localStorage.getItem("baseball-tracker:pregame-setup-by-game:v2"), null);
  } finally {
    global.fetch = previousFetch;
    restoreStorage();
  }
});

test("start game stops when accepted preparation cannot be saved", () => {
  assert.match(startAcceptedGameSource, /await saveAcceptedPreparation\(gameId, acceptedSetup\);\s*const startedSetup = await startScheduledGame/s);
  assert.match(startAcceptedGameSource, /throw new Error\(await readApiErrorMessage\(preparationResponse, "Unable to save the accepted lineup\."\)\)/);
  assert.doesNotMatch(startAcceptedGameSource, /preparationError/);
});

test("resolveSuggestedLineupIds derives a reviewable lineup without saved generated ids", () => {
  const team = activeTeam();
  const setup = createDefaultPregameSetup(team);
  const suggestedLineup = resolveSuggestedLineupIds(setup, team);

  assert.equal(suggestedLineup.canGenerate, true);
  assert.equal(suggestedLineup.emptyReason, null);
  assert.equal(suggestedLineup.lineupIds.length, 10);
});

test("buildPregamePlayerPool uses the same roster season stats shown on roster cards", () => {
  const playerWithRosterStats = {
    ...seedPlayers[0],
    isActive: true,
    seasonStats: {
      ...seedPlayers[0].seasonStats,
      gamesPlayed: 4,
      plateAppearances: 16,
      atBats: 15,
      hits: 11,
      singles: 7,
      doubles: 3,
      triples: 1,
      runs: 8,
      rbis: 9,
      outs: 4,
    },
  };
  const team = activeTeam([playerWithRosterStats]);
  const setup = createDefaultPregameSetup(team);
  const playerPool = buildPregamePlayerPool(setup, team);

  assert.equal(playerPool[0].seasonStats.plateAppearances, 16);
  assert.equal(playerPool[0].seasonStats.hits, 11);
  assert.equal(playerPool[0].seasonStats.rbis, 9);
});

test("resolveSuggestedLineupIds keeps a male wraparound hitter when trimming a larger active pool", () => {
  const players = [
    ...seedPlayers.map((player, index) => ({
      ...player,
      id: `female-${index + 1}`,
      name: `Female ${index + 1}`,
      gender: "Female",
      seedOrder: index + 1,
    })),
    {
      ...seedPlayers[1],
      id: "only-male",
      name: "Only Male",
      gender: "Male",
      seedOrder: 11,
    },
  ];
  const team = activeTeam(players);
  const setup = {
    ...createDefaultPregameSetup(team),
    lineupSize: "9",
  };
  const { lineupPlayers, suggestedLineup } = resolveLineupForSetup(setup, team);

  assert.equal(suggestedLineup.lineupIds.length, 9);
  assert.equal(suggestedLineup.lineupIds.includes("only-male"), true);
  assert.equal(lineupPlayers.at(-1).gender, "Male");
});

test("resolveSuggestedLineupIds regenerates saved lineups that lost the female leadoff", () => {
  const team = activeTeam();
  const setup = {
    ...createDefaultPregameSetup(team),
    generatedLineupIds: [
      "jordan-lee",
      "maya-johnson",
      "alex-smith",
      "sam-green",
      "riley-park",
      "casey-kim",
      "drew-allen",
      "ari-stone",
      "taylor-fox",
      "noa-cohen",
    ],
  };
  const suggestedLineup = resolveSuggestedLineupIds(setup, team);

  assert.equal(suggestedLineup.canGenerate, true);
  assert.equal(suggestedLineup.lineupIds[0], "maya-johnson");
});

test("resolveSuggestedLineupIds regenerates unaccepted lineups with avoidable back-to-back female hitters", () => {
  const players = seedPlayers.map((player) => ({
    ...player,
    gender: ["maya-johnson", "riley-park", "casey-kim"].includes(player.id) ? "Female" : "Male",
  }));
  const team = activeTeam(players);
  const setup = {
    ...createDefaultPregameSetup(team),
    generatedLineupIds: [
      "maya-johnson",
      "riley-park",
      "jordan-lee",
      "alex-smith",
      "sam-green",
      "casey-kim",
      "drew-allen",
      "ari-stone",
      "taylor-fox",
      "noa-cohen",
    ],
  };
  const { lineupPlayers, suggestedLineup } = resolveLineupForSetup(setup, team);

  assert.notDeepEqual(suggestedLineup.lineupIds, setup.generatedLineupIds);
  assert.equal(validateLineupGenderRules(lineupPlayers).warnings.some((warning) => warning.includes("back-to-back")), false);
});

test("resolveSuggestedLineupIds regenerates accepted lineups with avoidable female clusters", () => {
  const team = activeTeam();
  const clusteredLineupIds = [
    "maya-johnson",
    "riley-park",
    "jordan-lee",
    "alex-smith",
    "sam-green",
    "casey-kim",
    "drew-allen",
    "ari-stone",
    "taylor-fox",
    "noa-cohen",
  ];
  const setup = {
    ...createDefaultPregameSetup(team),
    generatedLineupIds: clusteredLineupIds,
    acceptedLineupIds: clusteredLineupIds,
  };
  const { lineupPlayers, suggestedLineup } = resolveLineupForSetup(setup, team);

  assert.notDeepEqual(suggestedLineup.lineupIds, clusteredLineupIds);
  assert.equal(validateLineupGenderRules(lineupPlayers).warnings.some((warning) => warning.includes("back-to-back")), false);
});

test("resolveSuggestedLineupIds regenerates accepted lineups that miss the male wraparound hitter", () => {
  const team = activeTeam();
  const acceptedLineupIds = [
    "maya-johnson",
    "jordan-lee",
    "riley-park",
    "alex-smith",
    "casey-kim",
    "sam-green",
    "ari-stone",
    "drew-allen",
    "taylor-fox",
    "noa-cohen",
  ];
  const setup = {
    ...createDefaultPregameSetup(team),
    generatedLineupIds: acceptedLineupIds,
    acceptedLineupIds,
  };
  const { lineupPlayers, suggestedLineup } = resolveLineupForSetup(setup, team);

  assert.notDeepEqual(suggestedLineup.lineupIds, acceptedLineupIds);
  assert.equal(lineupPlayers.at(-1).gender, "Male");
  assert.equal(validateLineupGenderRules(lineupPlayers).warnings.some((warning) => warning.includes("two-base walk")), false);
});

test("resolveSuggestedLineupIds preserves accepted lineups that already protect the female leadoff wraparound", () => {
  const team = activeTeam();
  const acceptedLineupIds = [
    "maya-johnson",
    "jordan-lee",
    "riley-park",
    "alex-smith",
    "casey-kim",
    "sam-green",
    "noa-cohen",
    "ari-stone",
    "taylor-fox",
    "drew-allen",
  ];
  const setup = {
    ...createDefaultPregameSetup(team),
    generatedLineupIds: acceptedLineupIds,
    acceptedLineupIds,
  };
  const suggestedLineup = resolveSuggestedLineupIds(setup, team);

  assert.deepEqual(suggestedLineup.lineupIds, acceptedLineupIds);
});

test("resolveSuggestedLineupIds explains invalid selected player pools", () => {
  const maleOnlyPlayers = seedPlayers
    .filter((player) => player.gender === "Male")
    .slice(0, 3);
  const team = activeTeam(maleOnlyPlayers);
  const setup = createDefaultPregameSetup(team);
  const suggestedLineup = resolveSuggestedLineupIds(setup, team);

  assert.equal(suggestedLineup.canGenerate, false);
  assert.equal(suggestedLineup.lineupIds.length, 0);
  assert.match(suggestedLineup.emptyReason, /selected player pool/i);
  assert.equal(suggestedLineup.warnings.length > 0, true);
});

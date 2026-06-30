import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDefaultMovements,
  createInitialGameState,
  endGame,
  firstGameHistoryId,
  getCompletedGameById,
  getCompletedGameHistory,
  getGameStats,
  getPlayerGameStats,
  getPlayerSeasonStats,
  getLatestCorrectablePlay,
  getResultLockReason,
  getSeasonStatsByPlayerId,
  getSeasonStats,
  getTeamGameTotals,
  getTeamSeasonTotals,
  savePlay,
  replaceLatestSavedPlay,
  undoLastPlay,
  upsertCompletedGame,
} from "../src/lib/gameEngine.ts";
import { calculateStats } from "../src/lib/statCalculations.ts";

function stats(overrides = {}) {
  return {
    gamesPlayed: 3,
    plateAppearances: 12,
    atBats: 10,
    hits: 6,
    singles: 4,
    doubles: 1,
    triples: 0,
    homeRuns: 1,
    walks: 2,
    reachedOnError: 0,
    fieldersChoice: 0,
    sacFlies: 0,
    outs: 4,
    groundouts: 0,
    flyouts: 0,
    lineouts: 0,
    strikeoutsLooking: 0,
    strikeoutsSwinging: 0,
    otherOuts: 0,
    doublePlays: 0,
    productiveOuts: 0,
    runs: 5,
    rbis: 6,
    ...overrides,
  };
}

function player(id, seasonStats = stats()) {
  return {
    id,
    name: id.replaceAll("-", " "),
    gender: "Unknown",
    bats: "Unknown",
    throws: "Unknown",
    primaryPosition: "",
    speedRating: "Average",
    notes: "",
    contactNotes: [],
    roleHint: "Contact hitter",
    isActive: true,
    seedOrder: 1,
    seasonStats,
  };
}

function createRunnerOnFirstState(runner = player("maya-johnson"), batter = player("jordan-lee")) {
  return {
    runner,
    batter,
    state: savePlay(createInitialGameState([runner, batter], { status: "IN_PROGRESS" }), "1B", {}, {}, false),
  };
}

function basesWithRunners(occupiedBases = []) {
  return {
    first: occupiedBases.includes("1B") ? { playerId: "runner-1", name: "Runner 1" } : null,
    second: occupiedBases.includes("2B") ? { playerId: "runner-2", name: "Runner 2" } : null,
    third: occupiedBases.includes("3B") ? { playerId: "runner-3", name: "Runner 3" } : null,
  };
}

test("createInitialGameState starts live game stats at zero even with season totals", () => {
  const batter = player("maya-johnson");
  const state = createInitialGameState([batter], { status: "IN_PROGRESS" });
  const gameStats = getPlayerGameStats(state, batter.id);
  const seasonStats = getPlayerSeasonStats(batter, state);

  assert.equal(gameStats.plateAppearances, 0);
  assert.equal(gameStats.hits, 0);
  assert.equal(gameStats.rbis, 0);
  assert.equal(seasonStats.plateAppearances, batter.seasonStats.plateAppearances + gameStats.plateAppearances);
  assert.equal(seasonStats.hits, batter.seasonStats.hits + gameStats.hits);
});

test("saved plays update game totals without replacing baseline season stats", () => {
  const batter = player("jordan-lee");
  const initialState = createInitialGameState([batter], { status: "IN_PROGRESS" });
  const state = savePlay(initialState, "HR", {}, {}, false);
  const gameStats = getPlayerGameStats(state, batter.id);
  const seasonStats = getPlayerSeasonStats(batter, state);
  const teamTotals = getTeamGameTotals(state);

  assert.equal(gameStats.plateAppearances, 1);
  assert.equal(gameStats.atBats, 1);
  assert.equal(gameStats.hits, 1);
  assert.equal(gameStats.homeRuns, 1);
  assert.equal(gameStats.runs, 1);
  assert.equal(seasonStats.plateAppearances, batter.seasonStats.plateAppearances + 1);
  assert.equal(seasonStats.homeRuns, batter.seasonStats.homeRuns + 1);
  assert.equal(teamTotals.plateAppearances, 1);
  assert.equal(teamTotals.hits, 1);
  assert.equal(teamTotals.runs, 1);
});

test("replacing the latest out with a home run removes the out and recalculates the play", () => {
  const firstBatter = player("maya-johnson");
  const nextBatter = player("jordan-lee");
  const initialState = createInitialGameState([firstBatter, nextBatter], { status: "IN_PROGRESS" });
  const withOut = savePlay(initialState, "Out", {}, {}, false, "GROUNDOUT");
  const correctablePlay = getLatestCorrectablePlay(withOut);

  assert.equal(correctablePlay?.batterId, firstBatter.id);

  const corrected = replaceLatestSavedPlay(withOut, correctablePlay.id, "HR", {}, {}, true);
  const batterStats = getPlayerGameStats(corrected, firstBatter.id);

  assert.equal(corrected.plays.length, 1);
  assert.equal(corrected.plays[0].id, withOut.plays[0].id);
  assert.equal(corrected.plays[0].result, "HR");
  assert.equal(corrected.plays[0].outType, undefined);
  assert.equal(corrected.outs, 0);
  assert.equal(corrected.teamScore, 1);
  assert.equal(corrected.currentBatterIndex, 1);
  assert.equal(batterStats.outs, 0);
  assert.equal(batterStats.homeRuns, 1);
  assert.equal(batterStats.runs, 1);
  assert.equal(batterStats.rbis, 1);

  const restored = undoLastPlay(corrected);
  assert.equal(restored.plays[0].result, "Out");
  assert.equal(restored.outs, 1);
  assert.equal(restored.teamScore, 0);
});

test("replacing the latest home run with an out removes the run and home run credit", () => {
  const firstBatter = player("maya-johnson");
  const nextBatter = player("jordan-lee");
  const withHomeRun = savePlay(
    createInitialGameState([firstBatter, nextBatter], { status: "IN_PROGRESS" }),
    "HR",
    {},
    {},
    true,
  );
  const correctablePlay = getLatestCorrectablePlay(withHomeRun);
  const corrected = replaceLatestSavedPlay(
    withHomeRun,
    correctablePlay.id,
    "Out",
    {},
    {},
    false,
    "FLYOUT",
  );
  const batterStats = getPlayerGameStats(corrected, firstBatter.id);

  assert.equal(corrected.plays.length, 1);
  assert.equal(corrected.plays[0].result, "Out");
  assert.equal(corrected.plays[0].outType, "FLYOUT");
  assert.equal(corrected.outs, 1);
  assert.equal(corrected.teamScore, 0);
  assert.equal(corrected.currentBatterIndex, 1);
  assert.equal(batterStats.homeRuns, 0);
  assert.equal(batterStats.runs, 0);
  assert.equal(batterStats.rbis, 0);
  assert.equal(batterStats.outs, 1);
  assert.equal(batterStats.flyouts, 1);
});

test("only the latest play in the active offensive half can be corrected", () => {
  const firstBatter = player("maya-johnson");
  const nextBatter = player("jordan-lee");
  const firstPlay = savePlay(
    createInitialGameState([firstBatter, nextBatter], { status: "IN_PROGRESS" }),
    "1B",
    {},
    {},
    false,
  );
  const secondPlay = savePlay(firstPlay, "Out", { "1B": "1B" }, {}, false, "GROUNDOUT");

  assert.throws(
    () => replaceLatestSavedPlay(secondPlay, firstPlay.plays[0].id, "HR", {}, {}, true),
    /Only the latest play/,
  );
});

test("final game summary totals stay scoped to the completed game", () => {
  const leadoff = player("maya-johnson", stats({ hits: 20, runs: 18, rbis: 10 }));
  const cleanup = player("jordan-lee", stats({ hits: 25, runs: 16, rbis: 22 }));
  const initialState = createInitialGameState([leadoff, cleanup], { status: "IN_PROGRESS" });
  const withSingle = savePlay(initialState, "1B", {}, {}, false);
  const finalState = endGame(savePlay(withSingle, "2B", { "1B": "Scores" }, {}, true), "2026-06-11T12:00:00.000Z");
  const finalTotals = getTeamGameTotals(finalState);
  const mayaGameStats = getPlayerGameStats(finalState, leadoff.id);
  const jordanGameStats = getPlayerGameStats(finalState, cleanup.id);

  assert.equal(finalTotals.plateAppearances, 2);
  assert.equal(finalTotals.hits, 2);
  assert.equal(finalTotals.runs, 1);
  assert.equal(finalTotals.rbis, 1);
  assert.equal(mayaGameStats.hits, 1);
  assert.equal(mayaGameStats.runs, 1);
  assert.equal(jordanGameStats.hits, 1);
  assert.equal(jordanGameStats.rbis, 1);
  assert.equal(getPlayerSeasonStats(leadoff, finalState).hits, leadoff.seasonStats.hits + 1);
  assert.equal(getPlayerSeasonStats(cleanup, finalState).rbis, cleanup.seasonStats.rbis + 1);
});

test("game and season stat helpers expose distinct stat scopes", () => {
  const batter = player("sam-rivera");
  const firstGame = savePlay(createInitialGameState([batter], { status: "IN_PROGRESS" }), "BB", {}, {}, false);
  const nextGame = createInitialGameState([batter], { status: "IN_PROGRESS" });

  assert.equal(getGameStats(firstGame)[batter.id].plateAppearances, 1);
  assert.equal(getSeasonStats([batter])[batter.id].plateAppearances, batter.seasonStats.plateAppearances);
  assert.equal(getPlayerGameStats(nextGame, batter.id).plateAppearances, 0);
  assert.equal(getPlayerGameStats(nextGame, batter.id).walks, 0);
});

test("season helper uses the game lineup baseline to avoid hydration double counting", () => {
  const batter = player("noa-cohen");
  const state = savePlay(createInitialGameState([batter], { status: "IN_PROGRESS" }), "1B", {}, {}, false);
  const hydratedPlayer = {
    ...batter,
    seasonStats: {
      ...batter.seasonStats,
      plateAppearances: batter.seasonStats.plateAppearances + 1,
      atBats: batter.seasonStats.atBats + 1,
      hits: batter.seasonStats.hits + 1,
      singles: batter.seasonStats.singles + 1,
    },
  };
  const seasonStats = getPlayerSeasonStats(hydratedPlayer, state);

  assert.equal(seasonStats.plateAppearances, batter.seasonStats.plateAppearances + 1);
  assert.equal(seasonStats.hits, batter.seasonStats.hits + 1);
  assert.equal(seasonStats.singles, batter.seasonStats.singles + 1);
});

test("season helper does not add games played for players outside the game lineup", () => {
  const batter = player("alex-smith");
  const benchPlayer = player("casey-park", stats({ gamesPlayed: 8, plateAppearances: 30 }));
  const state = savePlay(createInitialGameState([batter], { status: "IN_PROGRESS" }), "Out", {}, {}, false, "GROUNDOUT");
  const benchStats = getPlayerSeasonStats(benchPlayer, state);

  assert.equal(benchStats.gamesPlayed, benchPlayer.seasonStats.gamesPlayed);
  assert.equal(benchStats.plateAppearances, benchPlayer.seasonStats.plateAppearances);
});

test("normal outs require out type and save the selected type", () => {
  const batter = player("alex-smith");
  const initialState = createInitialGameState([batter], { status: "IN_PROGRESS" });

  assert.throws(
    () => savePlay(initialState, "Out", {}, {}, false),
    /Out type is required/,
  );

  const state = savePlay(initialState, "Out", {}, {}, false, "STRIKEOUT_LOOKING");
  const batterStats = getPlayerGameStats(state, batter.id);
  const calculated = calculateStats(batterStats);

  assert.equal(state.plays[0].result, "Out");
  assert.equal(state.plays[0].outType, "STRIKEOUT_LOOKING");
  assert.equal(batterStats.plateAppearances, 1);
  assert.equal(batterStats.atBats, 1);
  assert.equal(batterStats.outs, 1);
  assert.equal(batterStats.strikeoutsLooking, 1);
  assert.equal(calculated.strikeouts, 1);
  assert.equal(calculated.strikeoutRate, 1);
  assert.equal(calculated.ballInPlayRate, 0);
});

test("double plays stay separate and do not require out type", () => {
  const batter = player("maya-johnson");
  const runner = player("alex-smith");
  const runnerOnFirst = savePlay(createInitialGameState([runner, batter], { status: "IN_PROGRESS" }), "1B", {}, {}, false);
  const state = savePlay(runnerOnFirst, "DP", { "1B": "Out" }, {}, false);
  const batterStats = getPlayerGameStats(state, batter.id);

  assert.equal(state.plays[1].result, "DP");
  assert.equal(state.plays[1].outType, undefined);
  assert.equal(batterStats.outs, 1);
  assert.equal(batterStats.doublePlays, 1);
});

test("productive groundouts count toward contact and productive out stats", () => {
  const runner = player("maya-johnson");
  const batter = player("jordan-lee");
  const runnerOnFirst = savePlay(createInitialGameState([runner, batter], { status: "IN_PROGRESS" }), "1B", {}, {}, false);
  const state = savePlay(runnerOnFirst, "Out", { "1B": "2B" }, {}, false, "GROUNDOUT");
  const batterStats = getPlayerGameStats(state, batter.id);
  const calculated = calculateStats(batterStats);

  assert.equal(batterStats.groundouts, 1);
  assert.equal(batterStats.productiveOuts, 1);
  assert.equal(calculated.ballsInPlay, 1);
  assert.equal(calculated.ballInPlayRate, 1);
  assert.equal(calculated.productiveOutRate, 1);
});

test("team game totals include every tracked offensive stat", () => {
  const leadoff = player("maya-johnson", stats({ hits: 0, singles: 0, doubles: 0, runs: 0, rbis: 0 }));
  const cleanup = player("jordan-lee", stats({ hits: 0, singles: 0, doubles: 0, runs: 0, rbis: 0 }));
  const firstState = savePlay(createInitialGameState([leadoff, cleanup], { status: "IN_PROGRESS" }), "1B", {}, {}, false);
  const secondState = savePlay(firstState, "2B", { "1B": "Scores" }, {}, true);
  const totals = getTeamGameTotals(secondState);

  assert.equal(totals.plateAppearances, 2);
  assert.equal(totals.hits, 2);
  assert.equal(totals.singles, 1);
  assert.equal(totals.doubles, 1);
  assert.equal(totals.triples, 0);
  assert.equal(totals.homeRuns, 0);
  assert.equal(totals.rbis, 1);
  assert.equal(totals.totalBases, 3);
});

test("completed game history exposes a stable first-game link after a final game", () => {
  const batter = player("maya-johnson");
  const state = savePlay(createInitialGameState([batter], { status: "IN_PROGRESS" }), "HR", {}, {}, false);
  const finalState = endGame(state, "2026-06-11T12:00:00.000Z", "Kobe's Peeps");
  const games = getCompletedGameHistory(finalState);

  assert.equal(games.length, 1);
  assert.equal(games[0].id, firstGameHistoryId);
  assert.equal(games[0].href, `/stats/games/${firstGameHistoryId}`);
  assert.equal(games[0].opponent, finalState.opponent);
  assert.equal(games[0].teamScore, finalState.teamScore);
  assert.equal(getCompletedGameById(finalState, firstGameHistoryId), finalState);
});

test("completed game history upserts final games without duplicates", () => {
  const batter = player("maya-johnson");
  const state = savePlay(createInitialGameState([batter], { status: "IN_PROGRESS" }), "HR", {}, {}, false);
  const firstFinalState = endGame(state, "2026-06-11T12:00:00.000Z", "Kobe's Peeps");
  const updatedFinalState = {
    ...firstFinalState,
    opponentScore: 3,
    lastSummary: "Updated final summary",
  };
  const games = upsertCompletedGame(
    upsertCompletedGame([], firstFinalState),
    updatedFinalState,
  );
  const summaries = getCompletedGameHistory(games);

  assert.equal(games.length, 1);
  assert.equal(games[0].opponentScore, 3);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].id, firstGameHistoryId);
  assert.equal(summaries[0].opponentScore, 3);
  assert.equal(getCompletedGameById(games, firstGameHistoryId), updatedFinalState);
});

test("completed game history remains available when active game state resets", () => {
  const batter = player("maya-johnson");
  const finalState = endGame(
    savePlay(createInitialGameState([batter], { status: "IN_PROGRESS" }), "BB", {}, {}, false),
    "2026-06-11T12:00:00.000Z",
  );
  const games = upsertCompletedGame([], finalState);
  const resetActiveState = createInitialGameState([batter]);

  assert.equal(getCompletedGameHistory(resetActiveState).length, 0);
  assert.equal(getCompletedGameHistory(games).length, 1);
  assert.equal(getCompletedGameById(games, firstGameHistoryId), finalState);
});

test("completed game history stays empty until a game is final", () => {
  const batter = player("maya-johnson");
  const state = savePlay(createInitialGameState([batter], { status: "IN_PROGRESS" }), "1B", {}, {}, false);

  assert.deepEqual(getCompletedGameHistory(state), []);
  assert.equal(getCompletedGameById(state, firstGameHistoryId), null);
});

test("season totals use season stats while final game totals stay game scoped", () => {
  const batter = player("maya-johnson", stats({ plateAppearances: 20, atBats: 18, hits: 9, singles: 8, doubles: 1, runs: 7, rbis: 5 }));
  const initialState = createInitialGameState([batter], { status: "IN_PROGRESS" });
  const finalState = endGame(savePlay(initialState, "BB", {}, {}, false), "2026-06-11T12:00:00.000Z");
  const seasonStats = getSeasonStatsByPlayerId([batter], finalState)[batter.id];
  const seasonTotals = getTeamSeasonTotals([batter], finalState);
  const gameTotals = getTeamGameTotals(finalState);

  assert.equal(seasonStats.plateAppearances, batter.seasonStats.plateAppearances + 1);
  assert.equal(seasonStats.walks, batter.seasonStats.walks + 1);
  assert.equal(seasonTotals.plateAppearances, batter.seasonStats.plateAppearances + 1);
  assert.equal(seasonTotals.hits, batter.seasonStats.hits);
  assert.equal(gameTotals.plateAppearances, 1);
  assert.equal(gameTotals.hits, 0);
  assert.equal(gameTotals.walks, 1);
});

test("result locking disables only impossible empty-base results", () => {
  const batter = player("maya-johnson");
  const state = createInitialGameState([batter], { status: "IN_PROGRESS" });

  assert.equal(getResultLockReason("SF", state.bases, state.outs), "Sac fly needs a runner on 3B");
  assert.equal(getResultLockReason("FC", state.bases, state.outs), "Fielder's choice needs a runner on base");
  assert.equal(getResultLockReason("DP", state.bases, state.outs), "Double play needs a runner on base");

  for (const result of ["1B", "2B", "3B", "HR", "BB", "ROE", "Out"]) {
    assert.equal(getResultLockReason(result, state.bases, state.outs), null);
  }
});

test("result locking follows occupied base and out count rules", () => {
  const batter = player("maya-johnson");
  const runner = player("alex-smith");
  const initialState = createInitialGameState([batter, runner], { status: "IN_PROGRESS" });
  const runnerOnFirst = savePlay(initialState, "1B", {}, {}, false);
  const runnerOnThird = {
    ...runnerOnFirst,
    bases: {
      first: null,
      second: null,
      third: runnerOnFirst.bases.first,
    },
  };
  const runnerOnThirdWithTwoOuts = {
    ...runnerOnThird,
    outs: 2,
  };

  assert.equal(getResultLockReason("FC", runnerOnFirst.bases, runnerOnFirst.outs), null);
  assert.equal(getResultLockReason("DP", runnerOnFirst.bases, runnerOnFirst.outs), null);
  assert.equal(getResultLockReason("SF", runnerOnFirst.bases, runnerOnFirst.outs), "Sac fly needs a runner on 3B");
  assert.equal(getResultLockReason("SF", runnerOnThird.bases, runnerOnThird.outs), null);
  assert.equal(getResultLockReason("SF", runnerOnThirdWithTwoOuts.bases, runnerOnThirdWithTwoOuts.outs), "Sac fly needs fewer than 2 outs");
  assert.equal(getResultLockReason("DP", runnerOnThirdWithTwoOuts.bases, runnerOnThirdWithTwoOuts.outs), "Double play needs fewer than 2 outs");
});

test("createDefaultMovements follows the Stats Entry auto-advance matrix", () => {
  const scenarios = [
    {
      result: "1B",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "2B", "2B": "Scores", "3B": "Scores" },
    },
    {
      result: "2B",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "3B", "2B": "Scores", "3B": "Scores" },
    },
    {
      result: "3B",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "Scores", "2B": "Scores", "3B": "Scores" },
    },
    {
      result: "HR",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "Scores", "2B": "Scores", "3B": "Scores" },
    },
    {
      result: "BB",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "2B", "2B": "3B", "3B": "Scores" },
    },
    {
      result: "BB",
      occupiedBases: ["1B", "3B"],
      movements: { "1B": "2B", "3B": "3B" },
    },
    {
      result: "ROE",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "2B", "2B": "3B", "3B": "Scores" },
    },
    {
      result: "FC",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "2B", "2B": "3B", "3B": "Out" },
    },
    {
      result: "FC",
      occupiedBases: ["1B", "3B"],
      movements: { "1B": "Out", "3B": "3B" },
    },
    {
      result: "SF",
      occupiedBases: ["1B", "3B"],
      movements: { "1B": "1B", "3B": "Scores" },
    },
    {
      result: "DP",
      occupiedBases: ["1B", "2B"],
      movements: { "1B": "Out", "2B": "2B" },
    },
    {
      result: "Out",
      occupiedBases: ["1B", "2B", "3B"],
      movements: { "1B": "1B", "2B": "2B", "3B": "3B" },
    },
  ];

  scenarios.forEach(({ result, occupiedBases, movements }) => {
    assert.deepEqual(createDefaultMovements(result, basesWithRunners(occupiedBases)), movements);
  });
});

test("savePlay rejects impossible results even when called outside the UI", () => {
  const batter = player("maya-johnson");
  const state = createInitialGameState([batter], { status: "IN_PROGRESS" });

  assert.throws(
    () => savePlay(state, "FC", {}, {}, false),
    /Fielder's choice needs a runner on base/,
  );
  assert.throws(
    () => savePlay(state, "DP", {}, {}, false),
    /Double play needs a runner on base/,
  );
});

test("savePlay rejects base collisions before overwriting runners", () => {
  const { state: runnerOnFirst } = createRunnerOnFirstState();

  assert.throws(
    () => savePlay(runnerOnFirst, "1B", { "1B": "1B" }, {}, false),
    /cannot both end at 1B/,
  );
});

test("savePlay rejects plays that would record more than three inning outs", () => {
  const { state: runnerOnFirst } = createRunnerOnFirstState();
  const twoOutState = {
    ...runnerOnFirst,
    outs: 2,
  };

  assert.throws(
    () => savePlay(twoOutState, "Out", { "1B": "Out" }, {}, false, "GROUNDOUT"),
    /more than three outs/,
  );
});

test("savePlay rejects duplicate or occupied pinch runners", () => {
  const runnerOnFirst = player("maya-johnson");
  const runnerOnSecond = player("alex-smith");
  const batter = player("jordan-lee");
  const pinchRunner = player("casey-park");
  const initialState = createInitialGameState([runnerOnFirst, runnerOnSecond, batter, pinchRunner], { status: "IN_PROGRESS" });
  const firstState = savePlay(initialState, "1B", {}, {}, false);
  const secondState = savePlay(firstState, "1B", { "1B": "2B" }, {}, false);

  assert.throws(
    () =>
      savePlay(
        secondState,
        "2B",
        { "1B": "3B", "2B": "Scores" },
        {
          "1B": { playerId: pinchRunner.id, name: pinchRunner.name },
          "2B": { playerId: pinchRunner.id, name: pinchRunner.name },
        },
        true,
      ),
    /cannot pinch run for multiple runners/,
  );
  assert.throws(
    () =>
      savePlay(
        secondState,
        "2B",
        { "1B": "3B", "2B": "Scores" },
        {
          "1B": { playerId: runnerOnFirst.id, name: runnerOnFirst.name },
        },
        true,
      ),
    /already on base/,
  );
});

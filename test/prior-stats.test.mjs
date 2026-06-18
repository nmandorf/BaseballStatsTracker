import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  createInitialGameState,
  getPlayerSeasonStats,
  getLatestCorrectablePlay,
  replaceLatestSavedPlay,
  savePlay,
  undoLastPlay,
  updatePlayerSeasonStatsBaseline,
} from "../src/lib/gameEngine.ts";
import {
  createZeroStats,
  derivePriorStats,
  getPriorStatsValidationError,
} from "../src/lib/statCalculations.ts";

const rosterSource = readFileSync(new URL("../src/sections/RosterSection/index.tsx", import.meta.url), "utf8");
const editorSource = readFileSync(new URL("../src/components/PriorStatsEditor/index.tsx", import.meta.url), "utf8");

function player(id) {
  return {
    id,
    name: id,
    gender: "Female",
    bats: "Unknown",
    throws: "Unknown",
    primaryPosition: "",
    speedRating: "Average",
    notes: "",
    contactNotes: [],
    defensiveProfile: { ratings: {}, notes: {} },
    roleHint: "Contact hitter",
    isActive: true,
    seedOrder: 1,
    seasonStats: createZeroStats(),
  };
}

test("prior stat outcomes derive hits, at-bats, and plate appearances", () => {
  const stats = derivePriorStats({
    ...createZeroStats(),
    gamesPlayed: 4,
    singles: 2,
    doubles: 1,
    homeRuns: 1,
    walks: 2,
    reachedOnError: 1,
    fieldersChoice: 1,
    sacFlies: 1,
    outs: 5,
    runs: 6,
    rbis: 7,
  });

  assert.equal(stats.hits, 4);
  assert.equal(stats.atBats, 10);
  assert.equal(stats.plateAppearances, 13);
  assert.equal(stats.runs, 6);
  assert.equal(stats.rbis, 7);
});

test("prior stat validation protects saved out classifications", () => {
  const tooFewOuts = derivePriorStats({
    ...createZeroStats(),
    outs: 2,
    groundouts: 3,
  });
  const tooManySacFlies = derivePriorStats({
    ...createZeroStats(),
    outs: 1,
    sacFlies: 2,
  });

  assert.match(getPriorStatsValidationError(tooFewOuts), /at least 3/);
  assert.match(getPriorStatsValidationError(tooManySacFlies), /Sac flies/);
});

test("updating a season baseline leaves saved game actions and game stats unchanged", () => {
  const batter = player("maya");
  const withPlay = savePlay(
    createInitialGameState([batter], { status: "IN_PROGRESS" }),
    "1B",
    {},
    {},
    false,
  );
  const priorStats = derivePriorStats({
    ...createZeroStats(),
    singles: 8,
    doubles: 2,
    outs: 5,
  });
  const updated = updatePlayerSeasonStatsBaseline(withPlay, batter.id, priorStats);

  assert.equal(updated.lineup[0].seasonStats.hits, 10);
  assert.equal(getPlayerSeasonStats(batter, updated).hits, 11);
  assert.deepEqual(updated.plays, withPlay.plays);
  assert.deepEqual(updated.statsByPlayerId, withPlay.statsByPlayerId);
  assert.equal(updated.teamScore, withPlay.teamScore);
  assert.equal(updated.outs, withPlay.outs);
  assert.deepEqual(updated.bases, withPlay.bases);

  const undone = undoLastPlay(updated);
  assert.equal(undone.lineup[0].seasonStats.hits, 10);

  const corrected = replaceLatestSavedPlay(
    updated,
    getLatestCorrectablePlay(updated).id,
    "HR",
    {},
    {},
    true,
  );
  assert.equal(corrected.lineup[0].seasonStats.hits, 10);
});

test("roster exposes a populated prior stats editor and persistence actions", () => {
  assert.match(rosterSource, /Edit Prior Stats/);
  assert.match(rosterSource, /editingStatsPlayer\.seasonStats/);
  assert.match(rosterSource, /editingStatsBaseline/);
  assert.match(rosterSource, /updateActiveTeamPlayers/);
  assert.match(rosterSource, /updatePlayerSeasonStatsBaseline/);
  assert.match(editorSource, /Calculated automatically/);
  assert.match(editorSource, /This Game PA/);
  assert.match(editorSource, /aria-invalid/);
  assert.doesNotMatch(editorSource, /min-h-4 truncate text-center/);
  assert.match(editorSource, /Save Stats/);
  assert.match(editorSource, /role="alert"/);
});

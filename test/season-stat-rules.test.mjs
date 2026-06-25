import assert from "node:assert/strict";
import { test } from "node:test";
import { createZeroStats } from "../src/lib/statCalculations.ts";
import { getSeasonStatsProgress, replaceGameStatsInSeason } from "../src/lib/seasonStatRules.ts";

function stats(overrides = {}) {
  return {
    ...createZeroStats(),
    ...overrides,
  };
}

test("replaceGameStatsInSeason is idempotent for repeated final saves", () => {
  const seasonStats = stats({ gamesPlayed: 2, plateAppearances: 8, atBats: 7, hits: 4, runs: 3 });
  const gameStats = stats({ gamesPlayed: 1, plateAppearances: 4, atBats: 3, hits: 2, runs: 1 });
  const nextSeasonStats = replaceGameStatsInSeason(seasonStats, gameStats, gameStats);

  assert.equal(nextSeasonStats.gamesPlayed, 2);
  assert.equal(nextSeasonStats.plateAppearances, 8);
  assert.equal(nextSeasonStats.hits, 4);
  assert.equal(nextSeasonStats.runs, 3);
});

test("replaceGameStatsInSeason swaps corrected game contribution into season totals", () => {
  const seasonStats = stats({ gamesPlayed: 2, plateAppearances: 8, atBats: 7, hits: 4, runs: 3, rbis: 2 });
  const previousGameStats = stats({ gamesPlayed: 1, plateAppearances: 4, atBats: 3, hits: 2, runs: 1, rbis: 1 });
  const correctedGameStats = stats({ gamesPlayed: 1, plateAppearances: 5, atBats: 4, hits: 3, runs: 2, rbis: 3 });
  const nextSeasonStats = replaceGameStatsInSeason(seasonStats, previousGameStats, correctedGameStats);

  assert.equal(nextSeasonStats.gamesPlayed, 2);
  assert.equal(nextSeasonStats.plateAppearances, 9);
  assert.equal(nextSeasonStats.atBats, 8);
  assert.equal(nextSeasonStats.hits, 5);
  assert.equal(nextSeasonStats.runs, 4);
  assert.equal(nextSeasonStats.rbis, 4);
});

test("season stats progress values saved game stats over empty game counters", () => {
  const staleLocalStats = stats({ gamesPlayed: 4 });
  const backendStatsWithGameHistory = stats({
    gamesPlayed: 3,
    plateAppearances: 4,
    atBats: 3,
    hits: 2,
    runs: 1,
    rbis: 1,
  });

  assert.equal(
    getSeasonStatsProgress(backendStatsWithGameHistory) > getSeasonStatsProgress(staleLocalStats),
    true,
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createGameHistoryBreakdownFromPlayerStats } from "../src/lib/gameHistoryBreakdown.ts";
import { buildFinalGameStateFromPersistedStats } from "../src/lib/scheduledGameStatsFallback.ts";

const statsEntrySource = readFileSync(
  new URL("../src/sections/StatsEntrySection/index.tsx", import.meta.url),
  "utf8",
);
const seasonStatsSource = readFileSync(
  new URL("../src/sections/SeasonStatsSection/index.tsx", import.meta.url),
  "utf8",
);
const rosterSource = readFileSync(
  new URL("../src/sections/RosterSection/index.tsx", import.meta.url),
  "utf8",
);

function getFinalStatsViewSource() {
  const start = statsEntrySource.indexOf("export function FinalGameStatsView");
  const end = statsEntrySource.indexOf("export type StatsPlayerRow");

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  return statsEntrySource.slice(start, end);
}

test("season stats page owns the game history card", () => {
  assert.match(seasonStatsSource, /useCompletedGameStates/);
  assert.match(seasonStatsSource, /<GameHistoryCard games=\{gameHistory\}/);
});

test("game history card renders match breakdown stats", () => {
  assert.match(statsEntrySource, /GameHistoryBreakdownGrid/);
  assert.match(statsEntrySource, /label="AVG"/);
  assert.match(statsEntrySource, /label="OBP"/);
});

test("game history carries backend box score state for imported finals", () => {
  assert.match(seasonStatsSource, /hasBoxScore: week\.hasBoxScore/);
  assert.match(statsEntrySource, /Box score saved/);
  assert.match(statsEntrySource, /No plays saved/);
});

test("season and roster overall stats trust persisted player season rows", () => {
  assert.match(seasonStatsSource, /const stats = player\.seasonStats/);
  assert.match(seasonStatsSource, /getTeamSeasonTotals\(activeTeam\.players\)/);
  assert.doesNotMatch(seasonStatsSource, /getPlayerSeasonStats\(player, firstGameState\)/);
  assert.doesNotMatch(seasonStatsSource, /getTeamSeasonTotals\(activeTeam\.players, firstGameState\)/);
  assert.doesNotMatch(rosterSource, /getPlayerSeasonStats\(player, firstGameState\)/);
});

test("final game stats view omits the game history card", () => {
  const finalStatsViewSource = getFinalStatsViewSource();

  assert.doesNotMatch(finalStatsViewSource, /GameHistoryCard/);
  assert.doesNotMatch(finalStatsViewSource, /gameHistory/);
  assert.match(finalStatsViewSource, /Final box score/);
  assert.match(finalStatsViewSource, /Player Game Stats/);
});

test("game history details can fall back to persisted game stats", () => {
  const finalGame = createPersistedFinalGame();
  const state = buildFinalGameStateFromPersistedStats(finalGame);

  assert.equal(state?.status, "FINAL");
  assert.equal(state?.gameId, finalGame.id);
  assert.equal(state?.lineup[0].seasonStats.hits, 19);
  assert.equal(state?.statsByPlayerId["maya-johnson"].hits, 1);
  assert.equal(state?.statsByPlayerId["alex-smith"].plateAppearances, 0);
  assert.equal(state?.plays[0].result, "1B");
  assert.equal(state?.plays[0].runnerAdvancements[0].toBase, "HOME");
});

test("game history breakdown can fall back to persisted player game stats", () => {
  const breakdown = createGameHistoryBreakdownFromPlayerStats([
    persistedStats("maya-johnson", { plateAppearances: 2, atBats: 2, hits: 1, singles: 1, rbis: 1 }),
    persistedStats("alex-smith", { plateAppearances: 1, atBats: 1, outs: 1 }),
  ]);

  assert.equal(breakdown?.plateAppearances, 3);
  assert.equal(breakdown?.hits, 1);
  assert.equal(breakdown?.rbis, 1);
  assert.equal(breakdown?.battingAverage, 1 / 3);
});

test("game history detail fallback requires game stats for every lineup player", () => {
  const finalGame = createPersistedFinalGame({
    stats: [persistedStats("maya-johnson", { hits: 1 })],
  });

  assert.equal(buildFinalGameStateFromPersistedStats(finalGame), null);
});

function createPersistedFinalGame(overrides = {}) {
  const maya = persistedPlayer("maya-johnson", { hits: 20 });
  const alex = persistedPlayer("alex-smith", { hits: 10 });

  return {
    id: "game-1",
    snapshot: null,
    status: "FINAL",
    updatedAt: new Date("2026-06-18T21:30:00.000Z"),
    opponent: "Blue Sox",
    isHome: true,
    rules: null,
    lineup: [
      { playerId: maya.id, player: maya },
      { playerId: alex.id, player: alex },
    ],
    currentBatterIndex: 1,
    inning: 7,
    half: "BOTTOM",
    outs: 3,
    teamScore: 8,
    opponentScore: 6,
    bases: null,
    stats: [
      persistedStats(maya.id, { plateAppearances: 1, atBats: 1, hits: 1, singles: 1, runs: 1 }),
      persistedStats(alex.id),
    ],
    atBats: [
      {
        id: "at-bat-1",
        inning: 1,
        batterId: maya.id,
        batter: { name: maya.name },
        outsBefore: 0,
        basesBefore: emptyBases(),
        result: "SINGLE",
        outType: null,
        runnerAdvancements: [
          {
            playerId: maya.id,
            player: { name: maya.name },
            originalPlayerId: null,
            fromBase: "BATTER",
            toBase: "HOME",
            advancedBases: 4,
            scored: true,
            out: false,
            rbiCredited: true,
            reason: "HIT",
          },
        ],
        runsScored: 1,
        rbis: 1,
        outsOnPlay: 0,
        basesAfter: emptyBases(),
      },
    ],
    ...overrides,
  };
}

function persistedPlayer(id, seasonStats = {}) {
  return {
    id,
    name: id.replaceAll("-", " "),
    gender: "UNKNOWN",
    bats: "UNKNOWN",
    throws: "UNKNOWN",
    primaryPosition: null,
    speedRating: "AVERAGE",
    notes: null,
    contactNotes: [],
    armStrength: null,
    throwAccuracy: null,
    gloveSkill: null,
    rangeRating: null,
    positionConfidence: null,
    defenseStrengths: null,
    defenseWeaknesses: null,
    bestDefensePosition: null,
    avoidDefensePosition: null,
    backupDefensePosition: null,
    defenseCommunicationNotes: null,
    defenseHealthNotes: null,
    roleHint: null,
    isActive: true,
    seedOrder: 1,
    seasonStats: [persistedStats(id, seasonStats)],
  };
}

function persistedStats(playerId, overrides = {}) {
  return {
    playerId,
    gamesPlayed: 1,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    reachedOnError: 0,
    fieldersChoice: 0,
    sacFlies: 0,
    outs: 0,
    groundouts: 0,
    flyouts: 0,
    lineouts: 0,
    strikeoutsLooking: 0,
    strikeoutsSwinging: 0,
    otherOuts: 0,
    doublePlays: 0,
    productiveOuts: 0,
    runs: 0,
    rbis: 0,
    ...overrides,
  };
}

function emptyBases() {
  return {
    first: null,
    second: null,
    third: null,
  };
}

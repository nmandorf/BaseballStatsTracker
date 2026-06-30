import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isLineupGenderOptimized,
  recommendBattingOrder,
  validateLineupGenderRules,
  validateLineupPlayerPool,
} from "../src/lib/lineupRules.ts";

function stats(overrides = {}) {
  return {
    gamesPlayed: 1,
    plateAppearances: 10,
    atBats: 10,
    hits: 5,
    singles: 4,
    doubles: 1,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    reachedOnError: 0,
    fieldersChoice: 0,
    sacFlies: 0,
    outs: 5,
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

function player(id, gender, seedOrder, seasonStats = stats(), overrides = {}) {
  return {
    id,
    name: id.replaceAll("-", " "),
    gender,
    bats: "Unknown",
    throws: "Unknown",
    primaryPosition: "",
    speedRating: "Average",
    notes: "",
    contactNotes: [],
    roleHint: "Contact hitter",
    isActive: true,
    seedOrder,
    seasonStats,
    ...overrides,
  };
}

function numberedPlayers(prefix, gender, startOrder, count, statsForIndex = () => stats()) {
  return Array.from({ length: count }, (_, index) => (
    player(`${prefix}-${index + 1}`, gender, startOrder + index, statsForIndex(index))
  ));
}

function warningIncludes(lineup, text) {
  return validateLineupGenderRules(lineup).warnings.some((warning) => warning.includes(text));
}

function contactBalancingStats() {
  return {
    strongContactStats: stats({ hits: 8, singles: 6, doubles: 2, outs: 2, groundouts: 2 }),
    highStrikeoutStats: stats({ hits: 2, singles: 2, outs: 8, strikeoutsLooking: 4, strikeoutsSwinging: 2, otherOuts: 2 }),
    contactBufferStats: stats({ hits: 2, singles: 2, outs: 8, groundouts: 8 }),
  };
}

test("recommendBattingOrder places the strongest active female player first", () => {
  const lineup = recommendBattingOrder([
    player("elite-male", "Male", 1, stats({ hits: 9, doubles: 4, outs: 1 })),
    player("table-female", "Female", 2, stats({ hits: 8, walks: 2, outs: 0 })),
    player("depth-female", "Female", 3, stats({ hits: 4, outs: 6 })),
    player("male-2", "Male", 4),
    player("male-3", "Male", 5),
    player("male-4", "Male", 6),
    player("male-5", "Male", 7),
    player("male-6", "Male", 8),
    player("male-7", "Male", 9),
    player("male-8", "Male", 10),
  ]);

  assert.equal(lineup[0].player.id, "table-female");
  assert.equal(validateLineupGenderRules(lineup.map((row) => row.player)).isLeagueCompliant, true);
});

test("recommendBattingOrder spreads female players when male separators are available", () => {
  const lineup = recommendBattingOrder([
    ...numberedPlayers("female", "Female", 1, 3, (index) => stats({ hits: 9 - index, outs: index + 1 })),
    ...numberedPlayers("male", "Male", 4, 7),
  ]).map((row) => row.player);

  assert.equal(warningIncludes(lineup, "back-to-back"), false);
});

test("recommendBattingOrder places a male hitter last before the female leadoff when available", () => {
  const lineup = recommendBattingOrder([
    ...numberedPlayers("female", "Female", 1, 5, (index) => stats({ hits: 9 - index, outs: index + 1 })),
    ...numberedPlayers("male", "Male", 6, 5),
  ]).map((row) => row.player);

  assert.equal(lineup[0].gender, "Female");
  assert.equal(lineup.at(-1).gender, "Male");
  assert.equal(warningIncludes(lineup, "two-base walk"), false);
});

test("recommendBattingOrder keeps female hitters separated after contact balancing", () => {
  const { strongContactStats, highStrikeoutStats, contactBufferStats } = contactBalancingStats();
  const lineup = recommendBattingOrder([
    player("lead-female", "Female", 1, strongContactStats),
    player("male-1", "Male", 2, strongContactStats),
    player("male-2", "Male", 3, strongContactStats),
    player("male-3", "Male", 4, strongContactStats),
    player("male-4", "Male", 5, strongContactStats),
    player("male-5", "Male", 6, strongContactStats),
    player("strikeout-female", "Female", 7, highStrikeoutStats),
    player("strikeout-male", "Male", 8, highStrikeoutStats),
    player("buffer-female", "Female", 9, contactBufferStats),
    player("buffer-male", "Male", 10, contactBufferStats),
  ]).map((row) => row.player);

  assert.equal(lineup[0].gender, "Female");
  assert.equal(warningIncludes(lineup, "back-to-back"), false);
});

test("recommendBattingOrder favors similar contact hitters over strikeout hitters", () => {
  const lineup = recommendBattingOrder([
    player("strikeout-hitter", "Male", 1, stats({ groundouts: 0, strikeoutsLooking: 4, strikeoutsSwinging: 1 })),
    player("contact-hitter", "Male", 2, stats({ groundouts: 5, strikeoutsLooking: 0, strikeoutsSwinging: 0 })),
  ]);

  assert.equal(lineup[0].player.id, "contact-hitter");
});

test("recommendBattingOrder penalizes double plays more than normal outs for similar power hitters", () => {
  const lineup = recommendBattingOrder([
    player("double-play-power", "Male", 1, stats({ doubles: 3, homeRuns: 1, groundouts: 1, doublePlays: 3 })),
    player("clean-power", "Male", 2, stats({ doubles: 3, homeRuns: 1, groundouts: 4, doublePlays: 0 })),
  ]);

  assert.equal(lineup[0].player.id, "clean-power");
});

test("recommendBattingOrder reranks players when a ranking priority is selected", () => {
  const tableSetter = player("obp-table-setter", "Male", 1, stats({
    plateAppearances: 10,
    atBats: 8,
    hits: 6,
    singles: 6,
    doubles: 0,
    walks: 2,
    outs: 2,
  }));
  const slugger = player("slugging-power", "Male", 2, stats({
    plateAppearances: 10,
    atBats: 10,
    hits: 4,
    singles: 2,
    homeRuns: 2,
    outs: 6,
    rbis: 5,
  }));

  const obpLineup = recommendBattingOrder([tableSetter, slugger], { rankingPriority: "OBP" });
  const sluggingLineup = recommendBattingOrder([tableSetter, slugger], { rankingPriority: "SLG" });

  assert.equal(obpLineup[0].player.id, "obp-table-setter");
  assert.equal(sluggingLineup[0].player.id, "slugging-power");
  assert.match(sluggingLineup[0].signal, /SLG/);
});

test("recommendBattingOrder separates lower-lineup high-strikeout hitters when contact buffer is available", () => {
  const { strongContactStats, highStrikeoutStats, contactBufferStats } = contactBalancingStats();
  const lineup = recommendBattingOrder([
    player("strong-1", "Male", 1, strongContactStats),
    player("strong-2", "Male", 2, strongContactStats),
    player("strong-3", "Male", 3, strongContactStats),
    player("strong-4", "Male", 4, strongContactStats),
    player("strong-5", "Male", 5, strongContactStats),
    player("strong-6", "Male", 6, strongContactStats),
    player("strikeout-1", "Male", 7, highStrikeoutStats),
    player("strikeout-2", "Male", 8, highStrikeoutStats),
    player("strikeout-3", "Male", 9, highStrikeoutStats),
    player("contact-buffer", "Male", 10, contactBufferStats),
  ]).map((row) => row.player.id);
  const lowerLineup = lineup.slice(6);

  assert.equal(lowerLineup[0].startsWith("strikeout"), true);
  assert.equal(lowerLineup[1], "contact-buffer");
  assert.equal(lowerLineup[2].startsWith("strikeout"), true);
});

test("gender validation warns for missing gender and no active female player", () => {
  const missingGender = validateLineupPlayerPool([
    player("unknown", "Unknown", 1),
    player("male", "Male", 2),
  ]);

  assert.equal(missingGender.isLeagueCompliant, false);
  assert.deepEqual(missingGender.missingGenderPlayerNames, ["unknown"]);
  assert.equal(missingGender.warnings.some((warning) => warning.includes("female leadoff")), true);
});

test("gender validation allows unavoidable back-to-back female hitters", () => {
  const lineup = [
    player("female-1", "Female", 1),
    player("male-1", "Male", 4),
    player("female-2", "Female", 2),
    player("female-3", "Female", 3),
  ];
  const validation = validateLineupGenderRules(lineup);

  assert.equal(validation.isLeagueCompliant, true);
  assert.equal(warningIncludes(lineup, "back-to-back"), false);
});

test("gender validation warns when female hitters are more clustered than necessary", () => {
  const lineup = [
    player("female-1", "Female", 1),
    player("female-2", "Female", 2),
    player("female-3", "Female", 3),
    player("male-1", "Male", 4),
    player("male-2", "Male", 5),
  ];
  const validation = validateLineupGenderRules(lineup);

  assert.equal(validation.isLeagueCompliant, true);
  assert.equal(warningIncludes(lineup, "back-to-back"), true);
});

test("gender validation warns when the female leadoff does not have a male wraparound hitter", () => {
  const lineup = [
    player("female-1", "Female", 1),
    player("male-1", "Male", 2),
    player("female-2", "Female", 3),
  ];
  const validation = validateLineupGenderRules(lineup);

  assert.equal(validation.isLeagueCompliant, true);
  assert.equal(warningIncludes(lineup, "two-base walk"), true);
  assert.equal(isLineupGenderOptimized(lineup), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
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

function player(id, gender, seedOrder, seasonStats = stats()) {
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
    player("female-1", "Female", 1, stats({ hits: 9, outs: 1 })),
    player("female-2", "Female", 2, stats({ hits: 8, outs: 2 })),
    player("female-3", "Female", 3, stats({ hits: 7, outs: 3 })),
    player("male-1", "Male", 4),
    player("male-2", "Male", 5),
    player("male-3", "Male", 6),
    player("male-4", "Male", 7),
    player("male-5", "Male", 8),
    player("male-6", "Male", 9),
    player("male-7", "Male", 10),
  ]).map((row) => row.player);

  assert.equal(validateLineupGenderRules(lineup).warnings.some((warning) => warning.includes("back-to-back")), false);
});

test("recommendBattingOrder keeps female hitters separated after contact balancing", () => {
  const strongContactStats = stats({ hits: 8, singles: 6, doubles: 2, outs: 2, groundouts: 2 });
  const highStrikeoutStats = stats({ hits: 2, singles: 2, outs: 8, strikeoutsLooking: 4, strikeoutsSwinging: 2, otherOuts: 2 });
  const contactBufferStats = stats({ hits: 2, singles: 2, outs: 8, groundouts: 8 });
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
  assert.equal(validateLineupGenderRules(lineup).warnings.some((warning) => warning.includes("back-to-back")), false);
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

test("recommendBattingOrder separates lower-lineup high-strikeout hitters when contact buffer is available", () => {
  const strongStats = stats({ hits: 8, singles: 6, doubles: 2, outs: 2, groundouts: 2 });
  const highStrikeoutStats = stats({ hits: 2, singles: 2, outs: 8, strikeoutsLooking: 4, strikeoutsSwinging: 2, otherOuts: 2 });
  const contactBufferStats = stats({ hits: 2, singles: 2, outs: 8, groundouts: 8 });
  const lineup = recommendBattingOrder([
    player("strong-1", "Male", 1, strongStats),
    player("strong-2", "Male", 2, strongStats),
    player("strong-3", "Male", 3, strongStats),
    player("strong-4", "Male", 4, strongStats),
    player("strong-5", "Male", 5, strongStats),
    player("strong-6", "Male", 6, strongStats),
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
  assert.equal(validation.warnings.some((warning) => warning.includes("back-to-back")), false);
});

test("gender validation warns when female hitters are more clustered than necessary", () => {
  const lineup = [
    player("female-1", "Female", 1),
    player("female-2", "Female", 2),
    player("female-3", "Female", 3),
    player("male-1", "Male", 4),
  ];
  const validation = validateLineupGenderRules(lineup);

  assert.equal(validation.isLeagueCompliant, true);
  assert.equal(validation.warnings.some((warning) => warning.includes("back-to-back")), true);
});

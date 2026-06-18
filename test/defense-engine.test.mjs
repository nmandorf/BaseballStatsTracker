import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignPlayerToPosition,
  createDefaultDefensiveAlignment,
  createDefaultDefensiveProfile,
  createDefensiveEvent,
  generateDefensiveAlignment,
  getAssignedFemaleDefenderCount,
  getDefensiveAlignmentIssues,
  getDefensiveBenchCounts,
  getDefensiveSummary,
  getAssignedPlayerIdForPosition,
  getAssignedPositionForPlayer,
  getFirstDefensiveHalf,
  getSuggestedPositionForBallType,
  getTeamPhase,
  normalizeDefensivePosition,
  swapDefensivePlayers,
} from "../src/lib/defenseEngine.ts";

function player(id, overrides = {}) {
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
    defensiveProfile: createDefaultDefensiveProfile(),
    roleHint: "Contact hitter",
    isActive: true,
    seedOrder: 1,
    seasonStats: {},
    ...overrides,
  };
}

test("team phase follows home and away half-inning rules", () => {
  assert.equal(getTeamPhase(true, "Top"), "FIELDING");
  assert.equal(getTeamPhase(true, "Bottom"), "BATTING");
  assert.equal(getTeamPhase(false, "Top"), "BATTING");
  assert.equal(getTeamPhase(false, "Bottom"), "FIELDING");
  assert.deepEqual(getFirstDefensiveHalf(true), { inning: 1, half: "Top" });
  assert.deepEqual(getFirstDefensiveHalf(false), { inning: 1, half: "Bottom" });
});

test("alignment helpers move, bench, and swap players without duplicate assignments", () => {
  const maya = player("maya");
  const noa = player("noa");
  const jordan = player("jordan");
  const players = [
    maya,
    noa,
    jordan,
    ...Array.from({ length: 8 }, (_, index) => player(`bench-${index}`)),
  ];
  const alignment = createDefaultDefensiveAlignment(players, 1, "Top", { roverEnabled: false });
  const withMayaAtShort = assignPlayerToPosition(alignment, players, "SS", maya.id);

  assert.equal(withMayaAtShort.slots.SS.playerId, maya.id);
  assert.equal(withMayaAtShort.slots.P.status, "ASSIGNED");
  assert.ok(withMayaAtShort.benchPlayerIds.includes("bench-7"));

  const swapped = swapDefensivePlayers(withMayaAtShort, players, "SS", "C");

  assert.equal(swapped.slots.C.playerId, maya.id);
  assert.equal(swapped.slots.SS.playerId, noa.id);
});

test("defensive event suggestions link fielders, positions, and ball types", () => {
  const players = Array.from({ length: 10 }, (_, index) => player(`player-${index + 1}`));
  const noa = players[7];
  const alignment = createDefaultDefensiveAlignment(players, 1, "Top", { roverEnabled: false });

  assert.equal(getAssignedPositionForPlayer(alignment, noa.id), "LC");
  assert.equal(getAssignedPlayerIdForPosition(alignment, "LC"), noa.id);
  assert.equal(getSuggestedPositionForBallType(alignment, "Fly ball"), "LC");
  assert.equal(getSuggestedPositionForBallType(alignment, "Ground ball"), "SS");
});

test("defensive summary calculates chances, rates, innings, and best fit", () => {
  const maya = player("maya", {
    defensiveProfile: {
      ...createDefaultDefensiveProfile(),
      notes: {
        ...createDefaultDefensiveProfile().notes,
        bestPosition: "Left Center",
      },
    },
  });
  const alignment = createDefaultDefensiveAlignment([maya], 1, "Top", { roverEnabled: false });
  const events = [
    createDefensiveEvent({ id: "one", inning: 1, half: "Top", type: "ROUTINE_OUT", fielder: maya, position: "LC" }),
    createDefensiveEvent({ id: "two", inning: 1, half: "Top", type: "GREAT_PLAY", fielder: maya, position: "LC", basesAllowed: 0 }),
    createDefensiveEvent({ id: "three", inning: 1, half: "Top", type: "MISPLAY", fielder: maya, position: "LC", basesAllowed: 2 }),
  ];
  const summary = getDefensiveSummary(maya, [alignment], events);

  assert.equal(summary.defensiveChances, 3);
  assert.equal(summary.routinePlaySuccessRate, 1 / 3);
  assert.equal(summary.misplayRate, 1 / 3);
  assert.equal(summary.greatPlayRate, 1 / 3);
  assert.equal(summary.extraBasesAllowed, 2);
  assert.equal(summary.bestFitLabel, "Left Center");
});

test("defense generation uses strongest, preferred, backup, and avoid positions", () => {
  const profiles = Array.from({ length: 10 }, (_, index) => player(`player-${index + 1}`, {
    seedOrder: index + 1,
    gender: index < 3 ? "Female" : "Male",
  }));
  profiles[0].primaryPosition = "Left Center";
  profiles[0].defensiveProfile.notes.bestPosition = "LC";
  profiles[1].defensiveProfile.notes.bestPosition = "SS";
  profiles[1].defensiveProfile.notes.avoidPosition = "P";
  profiles[2].defensiveProfile.notes.backupPosition = "2B";
  profiles[3].defensiveProfile.notes.bestPosition = "Pitcher";

  const alignment = generateDefensiveAlignment({
    players: profiles,
    priorAlignments: [],
    inning: 1,
    half: "Top",
    roverEnabled: false,
  });

  assert.equal(alignment.slots.P.playerId, profiles[3].id);
  assert.equal(alignment.slots.SS.playerId, profiles[1].id);
  assert.equal(alignment.slots.LC.playerId, profiles[0].id);
  assert.equal(alignment.slots["2B"].playerId, profiles[2].id);
  assert.equal(getAssignedFemaleDefenderCount(alignment, profiles), 3);
});

test("defense generation locks the pitcher and avoids repeat bench innings when possible", () => {
  const players = Array.from({ length: 12 }, (_, index) => player(`rotation-${index + 1}`, {
    seedOrder: index + 1,
    gender: index >= 1 && index <= 3 ? "Female" : "Male",
  }));
  players[0].defensiveProfile.notes.bestPosition = "P";
  const first = generateDefensiveAlignment({
    players,
    priorAlignments: [],
    inning: 1,
    half: "Top",
    roverEnabled: false,
  });
  const lockedPitcherPlayerId = first.slots.P.playerId;
  const second = generateDefensiveAlignment({
    players,
    priorAlignments: [first],
    inning: 2,
    half: "Top",
    roverEnabled: false,
    lockedPitcherPlayerId,
  });
  const third = generateDefensiveAlignment({
    players,
    priorAlignments: [first, second],
    inning: 3,
    half: "Top",
    roverEnabled: false,
    lockedPitcherPlayerId,
  });
  const benchCounts = getDefensiveBenchCounts(players, [first, second, third]);

  assert.equal(second.slots.P.playerId, lockedPitcherPlayerId);
  assert.equal(third.slots.P.playerId, lockedPitcherPlayerId);
  assert.equal(benchCounts[lockedPitcherPlayerId], 0);
  assert.equal(Math.max(...Object.values(benchCounts)), 1);
  assert.equal(getAssignedFemaleDefenderCount(second, players), 3);
  assert.equal(getAssignedFemaleDefenderCount(third, players), 3);
});

test("defensive validation blocks a lineup with fewer than three female players", () => {
  const players = Array.from({ length: 10 }, (_, index) => player(`short-${index + 1}`, {
    gender: index < 2 ? "Female" : "Male",
  }));
  const alignment = generateDefensiveAlignment({
    players,
    priorAlignments: [],
    inning: 1,
    half: "Top",
    roverEnabled: false,
  });

  assert.equal(
    getDefensiveAlignmentIssues(alignment, players)[0]?.code,
    "NOT_ENOUGH_FEMALE_PLAYERS",
  );
});

test("legacy defensive position labels normalize to supported positions", () => {
  assert.equal(normalizeDefensivePosition("Left Center Field"), "LC");
  assert.equal(normalizeDefensivePosition("first base"), "1B");
  assert.equal(normalizeDefensivePosition("not a position"), null);
});

test("global assignment avoids an avoid-position when a legal swap exists", () => {
  const positions = ["1B", "2B", "SS", "3B", "LF", "LC", "RC", "RF"];
  const flexiblePitcher = player("flexible-pitcher", { gender: "Female", seedOrder: 1 });
  flexiblePitcher.defensiveProfile.notes.avoidPosition = "C";
  const pitcherOnly = player("pitcher-only", { gender: "Male", seedOrder: 2 });
  pitcherOnly.defensiveProfile.notes.bestPosition = "P";
  const specialists = positions.map((position, index) => {
    const specialist = player(`specialist-${position}`, {
      gender: index < 2 ? "Female" : "Male",
      seedOrder: index + 3,
    });
    specialist.defensiveProfile.notes.bestPosition = position;
    return specialist;
  });
  const alignment = generateDefensiveAlignment({
    players: [flexiblePitcher, pitcherOnly, ...specialists],
    priorAlignments: [],
    inning: 1,
    half: "Top",
    roverEnabled: false,
  });

  assert.equal(alignment.slots.P.playerId, flexiblePitcher.id);
  assert.equal(alignment.slots.C.playerId, pitcherOnly.id);
});

test("avoid positions outrank bench fairness when a legal alternative exists", () => {
  const specialistPositions = ["P", "C", "1B", "2B", "SS", "3B", "LF", "LC", "RC"];
  const avoidRightField = player("avoid-right-field", { gender: "Male", seedOrder: 1 });
  avoidRightField.defensiveProfile.notes.avoidPosition = "RF";
  const rightFieldAlternative = player("right-field-alternative", { gender: "Male", seedOrder: 2 });
  const specialists = specialistPositions.map((position, index) => {
    const specialist = player(`fixed-${position}`, {
      gender: index < 3 ? "Female" : "Male",
      seedOrder: index + 3,
    });
    specialist.defensiveProfile.notes.bestPosition = position;
    return specialist;
  });
  const priorAlignments = Array.from({ length: 20 }, (_, index) => ({
    id: `prior-${index}`,
    inning: index + 1,
    half: "Top",
    roverEnabled: false,
    slots: {},
    benchPlayerIds: [avoidRightField.id],
    updatedAt: new Date(2026, 0, index + 1).toISOString(),
  }));
  const players = [avoidRightField, rightFieldAlternative, ...specialists];
  const alignment = generateDefensiveAlignment({
    players,
    priorAlignments,
    inning: 21,
    half: "Top",
    roverEnabled: false,
  });

  assert.notEqual(getAssignedPositionForPlayer(alignment, avoidRightField.id), "RF");
  assert.equal(
    players.filter((candidate) => {
      const avoidedPosition = normalizeDefensivePosition(candidate.defensiveProfile.notes.avoidPosition);
      return avoidedPosition !== null
        && avoidedPosition === getAssignedPositionForPlayer(alignment, candidate.id);
    }).length,
    0,
  );
});

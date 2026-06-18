import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignPlayerToPosition,
  createDefaultDefensiveAlignment,
  createDefaultDefensiveProfile,
  createDefensiveEvent,
  getDefensiveSummary,
  getAssignedPlayerIdForPosition,
  getAssignedPositionForPlayer,
  getFirstDefensiveHalf,
  getSuggestedPositionForBallType,
  getTeamPhase,
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
  assert.equal(withMayaAtShort.slots.P.status, "VACANT");
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

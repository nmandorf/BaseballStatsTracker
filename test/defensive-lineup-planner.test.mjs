import assert from "node:assert/strict";
import { test } from "node:test";
import { createDefaultDefensiveProfile } from "../src/lib/defenseEngine.ts";
import { createDefensiveLineupPdf } from "../src/lib/defensiveLineupPdf.ts";
import { buildFullGameDefensiveLineupPlan } from "../src/lib/defensiveLineupPlanner.ts";

function player(id, overrides = {}) {
  return {
    id,
    name: id.replaceAll("-", " "),
    gender: "Male",
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

function rosterWithProtectedFemalePlayers(count) {
  const preferredPositions = ["P", "C", "1B", "2B", "SS", "3B", "LF", "LC", "RC", "RF", "SS", "RF"];

  return Array.from({ length: count }, (_, index) => buildProtectedFemalePlayer(index, preferredPositions));
}

function buildProtectedFemalePlayer(index, preferredPositions) {
  const preferredPosition = preferredPositions[index] ?? "";
  const nextPlayer = player(`player-${index + 1}`, {
    gender: getProtectedRosterGender(index),
    seedOrder: index + 1,
    primaryPosition: preferredPosition,
  });

  nextPlayer.defensiveProfile.notes.bestPosition = preferredPosition;
  return nextPlayer;
}

function getProtectedRosterGender(index) {
  return index >= 1 && index <= 3 ? "Female" : "Male";
}

test("full-game defensive plan protects female players when three or fewer are available", () => {
  const players = rosterWithProtectedFemalePlayers(11);
  const plan = buildFullGameDefensiveLineupPlan({
    players,
    firstInning: 1,
    half: "Top",
  });

  assert.ok(plan);
  const femaleRows = plan.rows.filter((row) => players.find((player) => player.id === row.playerId)?.gender === "Female");

  assert.equal(femaleRows.length, 3);
  assert.equal(femaleRows.every((row) => row.benchCount === 0), true);
  assert.equal(plan.warnings.some((warning) => warning.includes("protected from bench")), true);
});

test("full-game defensive plan benches each eligible player once when possible", () => {
  const players = rosterWithProtectedFemalePlayers(11);
  const plan = buildFullGameDefensiveLineupPlan({
    players,
    firstInning: 1,
    half: "Top",
  });

  assert.ok(plan);
  assert.equal(plan.canBenchEachPlayerAtMostOnce, true);
  assert.equal(Math.max(...plan.rows.map((row) => row.benchCount)), 1);
  assert.equal(plan.rows.reduce((total, row) => total + row.benchCount, 0), 7);
});

test("full-game defensive plan warns when repeat bench innings are unavoidable", () => {
  const players = rosterWithProtectedFemalePlayers(12);
  const plan = buildFullGameDefensiveLineupPlan({
    players,
    firstInning: 1,
    half: "Top",
  });

  assert.ok(plan);
  assert.equal(plan.canBenchEachPlayerAtMostOnce, false);
  assert.equal(plan.rows.reduce((total, row) => total + row.benchCount, 0), 14);
  assert.ok(plan.rows.some((row) => row.benchCount > 1));
  assert.equal(plan.warnings.some((warning) => warning.includes("Repeat bench innings are unavoidable")), true);
});

test("full-game defensive plan keeps preferred positions when constraints allow", () => {
  const players = rosterWithProtectedFemalePlayers(11);
  const plan = buildFullGameDefensiveLineupPlan({
    players,
    firstInning: 1,
    half: "Top",
  });

  assert.ok(plan);
  assert.equal(plan.alignments[0].slots.P.playerId, players[0].id);
  assert.equal(plan.alignments[0].slots.C.playerId, players[1].id);
  assert.equal(plan.alignments[0].slots["1B"].playerId, players[2].id);
  assert.equal(plan.alignments[0].slots["2B"].playerId, players[3].id);
});

test("full-game defensive PDF uses landscape letter dimensions and bench labels", async () => {
  const players = rosterWithProtectedFemalePlayers(12);
  const plan = buildFullGameDefensiveLineupPlan({
    players,
    firstInning: 1,
    half: "Top",
  });

  assert.ok(plan);
  const pdfText = await createDefensiveLineupPdf(plan).text();

  assert.match(pdfText, /MediaBox \[0 0 792 612\]/);
  assert.match(pdfText, /\(B\) Tj/);
  assert.match(pdfText, /\(Inn 7\) Tj/);
});

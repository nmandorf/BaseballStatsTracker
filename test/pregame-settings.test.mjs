import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialGameState } from "../src/lib/gameEngine.ts";
import { normalizeGameRules } from "../src/lib/gameRules.ts";
import {
  createDefaultPregameSetup,
  resolveSuggestedLineupIds,
} from "../src/lib/pregameSetupStorage.ts";
import { defaultGameRules, seedPlayers } from "../src/lib/seedTeam.ts";

function activeTeam(players = seedPlayers) {
  return {
    id: "team-1",
    name: "Tuesday Crew",
    players,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:00:00.000Z",
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

test("resolveSuggestedLineupIds derives a reviewable lineup without saved generated ids", () => {
  const team = activeTeam();
  const setup = createDefaultPregameSetup(team);
  const state = createInitialGameState(team.players);
  const suggestedLineup = resolveSuggestedLineupIds(setup, state, team);

  assert.equal(suggestedLineup.canGenerate, true);
  assert.equal(suggestedLineup.emptyReason, null);
  assert.equal(suggestedLineup.lineupIds.length, 10);
});

test("resolveSuggestedLineupIds explains invalid selected player pools", () => {
  const maleOnlyPlayers = seedPlayers
    .filter((player) => player.gender === "Male")
    .slice(0, 3);
  const team = activeTeam(maleOnlyPlayers);
  const setup = createDefaultPregameSetup(team);
  const state = createInitialGameState(team.players);
  const suggestedLineup = resolveSuggestedLineupIds(setup, state, team);

  assert.equal(suggestedLineup.canGenerate, false);
  assert.equal(suggestedLineup.lineupIds.length, 0);
  assert.match(suggestedLineup.emptyReason, /selected player pool/i);
  assert.equal(suggestedLineup.warnings.length > 0, true);
});

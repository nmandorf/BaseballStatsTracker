import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInitialGameState,
  getCurrentTeamPhase,
  getLiveGameHref,
  initializeStartingDefense,
  saveDefensiveAlignment,
  saveDefensiveEvent,
  savePlay,
  undoLastPlay,
} from "../src/lib/gameEngine.ts";
import { assignPlayerToPosition, createDefaultDefensiveAlignment, createDefaultDefensiveProfile } from "../src/lib/defenseEngine.ts";
import { shouldKeepLocalGameState } from "../src/lib/firstGameStorage.ts";

function stats() {
  return {
    gamesPlayed: 0,
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
  };
}

function player(id) {
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
    seasonStats: stats(),
  };
}

test("away offensive third out advances to defensive bottom half", () => {
  const players = Array.from({ length: 10 }, (_, index) => ({
    ...player(`away-${index + 1}`),
    gender: index < 3 ? "Female" : "Male",
    seedOrder: index + 1,
  }));
  const initialState = createInitialGameState(players, { status: "IN_PROGRESS", isHome: false });
  const firstOut = savePlay(initialState, "Out", {}, {}, false, "GROUNDOUT");
  const secondOut = savePlay(firstOut, "Out", {}, {}, false, "FLYOUT");
  const thirdOut = savePlay(secondOut, "Out", {}, {}, false, "LINEOUT");

  assert.equal(thirdOut.inning, 1);
  assert.equal(thirdOut.half, "Bottom");
  assert.equal(thirdOut.outs, 0);
  assert.equal(getCurrentTeamPhase(thirdOut), "FIELDING");
  assert.equal(thirdOut.bases.first, null);
  assert.equal(thirdOut.defensiveAlignments.length, 1);
  assert.equal(getLiveGameHref(thirdOut), "/defense");
});

test("each new defensive inning receives a fresh fair alignment with the same pitcher", () => {
  const players = Array.from({ length: 12 }, (_, index) => ({
    ...player(`inning-${index + 1}`),
    seedOrder: index + 1,
    gender: index >= 1 && index <= 3 ? "Female" : "Male",
  }));
  players[0].defensiveProfile.notes.bestPosition = "P";
  let state = createInitialGameState(players, { status: "IN_PROGRESS", isHome: true });
  state = initializeStartingDefense(state);
  const firstPitcherId = state.lockedPitcherPlayerId;

  state = saveDefensiveEvent(state, { type: "DOUBLE_PLAY", fielderId: firstPitcherId, position: "P", outsRecorded: 2 });
  state = saveDefensiveEvent(state, { type: "ROUTINE_OUT", fielderId: firstPitcherId, position: "P", outsRecorded: 1 });
  state = savePlay(state, "Out", {}, {}, false, "GROUNDOUT");
  state = savePlay(state, "Out", {}, {}, false, "FLYOUT");
  state = savePlay(state, "Out", {}, {}, false, "LINEOUT");

  assert.equal(state.inning, 2);
  assert.equal(state.half, "Top");
  assert.equal(state.defensiveAlignments.length, 2);
  assert.equal(state.defensiveAlignments[1].slots.P.playerId, firstPitcherId);
  assert.notDeepEqual(
    state.defensiveAlignments[1].benchPlayerIds,
    state.defensiveAlignments[0].benchPlayerIds,
  );
});

test("saving defense rejects moving the locked pitcher or dropping below three female defenders", () => {
  const players = Array.from({ length: 12 }, (_, index) => ({
    ...player(`manual-${index + 1}`),
    seedOrder: index + 1,
    gender: index >= 1 && index <= 3 ? "Female" : "Male",
  }));
  const initialState = initializeStartingDefense(
    createInitialGameState(players, { status: "IN_PROGRESS", isHome: true }),
  );
  const startingAlignment = initialState.defensiveAlignments[0];
  const movedPitcher = assignPlayerToPosition(startingAlignment, players, "P", players[4].id);
  const benchPlayerId = startingAlignment.benchPlayerIds[0];
  const removedFemale = assignPlayerToPosition(startingAlignment, players, "C", benchPlayerId);
  const vacantCatcher = {
    ...startingAlignment,
    slots: { ...startingAlignment.slots, C: { status: "VACANT" } },
  };

  assert.equal(saveDefensiveAlignment(initialState, movedPitcher), initialState);
  assert.equal(saveDefensiveAlignment(initialState, removedFemale), initialState);
  assert.equal(saveDefensiveAlignment(initialState, vacantCatcher), initialState);
});

test("starting defense keeps the game in pregame when three female defenders are impossible", () => {
  const players = Array.from({ length: 10 }, (_, index) => ({
    ...player(`invalid-start-${index + 1}`),
    gender: index < 2 ? "Female" : "Male",
    seedOrder: index + 1,
  }));
  const state = initializeStartingDefense(
    createInitialGameState(players, { status: "IN_PROGRESS", isHome: true }),
  );

  assert.equal(state.status, "PREGAME");
  assert.equal(state.defensiveAlignments.length, 0);
});

test("legacy games do not persist a new defense that cannot field three female players", () => {
  const players = Array.from({ length: 10 }, (_, index) => ({
    ...player(`legacy-${index + 1}`),
    gender: index < 2 ? "Female" : "Male",
    seedOrder: index + 1,
  }));
  let state = createInitialGameState(players, { status: "IN_PROGRESS", isHome: false });

  state = savePlay(state, "Out", {}, {}, false, "GROUNDOUT");
  state = savePlay(state, "Out", {}, {}, false, "FLYOUT");
  state = savePlay(state, "Out", {}, {}, false, "LINEOUT");

  assert.equal(state.half, "Bottom");
  assert.equal(state.defensiveAlignments.length, 0);
});

test("home team starts fielding and defensive third out advances to batting bottom half", () => {
  const fielder = player("noa");
  const initialState = initializeStartingDefense(
    createInitialGameState([fielder], { status: "IN_PROGRESS", isHome: true }),
    createDefaultDefensiveAlignment([fielder], 1, "Top"),
  );
  const oneOut = saveDefensiveEvent(initialState, { type: "ROUTINE_OUT", fielderId: fielder.id, position: "SS", outsRecorded: 1 });
  const thirdOut = saveDefensiveEvent(oneOut, { type: "DOUBLE_PLAY", fielderId: fielder.id, position: "SS", outsRecorded: 2 });

  assert.equal(thirdOut.opponentScore, 0);
  assert.equal(thirdOut.inning, 1);
  assert.equal(thirdOut.half, "Bottom");
  assert.equal(thirdOut.outs, 0);
  assert.equal(getCurrentTeamPhase(thirdOut), "BATTING");
  assert.equal(thirdOut.defensiveEvents.length, 2);
  assert.equal(getLiveGameHref(thirdOut), "/stats-entry");
});

test("defensive event updates opponent score and undo restores previous state", () => {
  const fielder = player("jordan");
  const initialState = initializeStartingDefense(
    createInitialGameState([fielder], { status: "IN_PROGRESS", isHome: true }),
    createDefaultDefensiveAlignment([fielder], 1, "Top"),
  );
  const withMisplay = saveDefensiveEvent(initialState, {
    type: "MISPLAY",
    fielderId: fielder.id,
    position: "SS",
    runsAllowed: 2,
    basesAllowed: 1,
    outsRecorded: 0,
  });
  const undone = undoLastPlay(withMisplay);

  assert.equal(withMisplay.opponentScore, 2);
  assert.equal(withMisplay.defensiveEvents.length, 1);
  assert.equal(undone.opponentScore, 0);
  assert.equal(undone.defensiveEvents.length, 0);
});

test("a stale final sync cannot overwrite a newly started local game", () => {
  const localPlayer = player("local-player");
  const localGame = {
    ...createInitialGameState([localPlayer], { status: "IN_PROGRESS" }),
    defensiveAlignments: [
      createDefaultDefensiveAlignment([localPlayer], 1, "Top", { updatedAt: "2026-06-17T18:00:00.000Z" }),
    ],
  };
  const staleRemoteGame = {
    ...createInitialGameState([player("remote-player")], { status: "FINAL" }),
    endedAt: "2026-06-17T17:00:00.000Z",
  };

  assert.equal(shouldKeepLocalGameState(localGame, staleRemoteGame), true);
});

test("an equal-count remote snapshot cannot overwrite a local play correction", () => {
  const batter = player("maya");
  const initialState = createInitialGameState([batter], { status: "IN_PROGRESS" });
  const localCorrection = savePlay(initialState, "HR", {}, {}, true);
  const staleRemotePlay = savePlay(initialState, "Out", {}, {}, false, "GROUNDOUT");

  assert.equal(localCorrection.plays.length, staleRemotePlay.plays.length);
  assert.equal(shouldKeepLocalGameState(localCorrection, staleRemotePlay), true);
});

test("a newer remote final can close the same local in-progress game", () => {
  const localPlayer = player("local-player");
  const localGame = {
    ...createInitialGameState([localPlayer], { status: "IN_PROGRESS" }),
    defensiveAlignments: [
      createDefaultDefensiveAlignment([localPlayer], 1, "Top", { updatedAt: "2026-06-17T18:00:00.000Z" }),
    ],
  };
  const newerRemoteFinal = {
    ...createInitialGameState([localPlayer], { status: "FINAL" }),
    endedAt: "2026-06-17T19:00:00.000Z",
  };

  assert.equal(shouldKeepLocalGameState(localGame, newerRemoteFinal), false);
});

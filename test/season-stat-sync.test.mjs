import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  createActiveTeam,
  createEmptyPlayerInput,
  createPlayerFromInput,
  hydrateActiveTeamFromBackend,
  loadActiveTeam,
  resetActiveTeam,
  saveActiveTeam,
} from "../src/lib/teamStorage.ts";

const firstGameStorageSource = readFileSync(
  new URL("../src/lib/firstGameStorage.ts", import.meta.url),
  "utf8",
);
const teamStorageSource = readFileSync(
  new URL("../src/lib/teamStorage.ts", import.meta.url),
  "utf8",
);
const seasonStatsSource = readFileSync(
  new URL("../src/sections/SeasonStatsSection/index.tsx", import.meta.url),
  "utf8",
);
const battingOrderSource = readFileSync(
  new URL("../src/sections/BattingOrderSection/index.tsx", import.meta.url),
  "utf8",
);
const gameSetupSource = readFileSync(
  new URL("../src/sections/GameSetupSection/index.tsx", import.meta.url),
  "utf8",
);

test("final game saves sync computed season totals into the active roster", () => {
  assert.match(firstGameStorageSource, /syncActiveTeamSeasonStatsFromFinalGame\(state\)/);
  assert.match(firstGameStorageSource, /syncActiveTeamSeasonStatsFromFinalGame\(normalizedRemoteState\)/);
  assert.match(firstGameStorageSource, /getPlayerSeasonStats\(player, state\)/);
  assert.match(firstGameStorageSource, /saveActiveTeam\(\{\s+\.\.\.activeTeam,\s+players: nextPlayers,/);
});

test("season and lineup screens refresh active team stats from the backend", () => {
  assert.match(teamStorageSource, /export function useBackendSyncedActiveTeam/);
  assert.match(teamStorageSource, /hydrateActiveTeamFromBackend\(\)/);
  assert.match(seasonStatsSource, /useBackendSyncedActiveTeam/);
  assert.match(battingOrderSource, /useBackendSyncedActiveTeam/);
  assert.match(gameSetupSource, /useBackendSyncedActiveTeam/);
});

test("backend hydration keeps fresher local completed-game season totals", async () => {
  const cleanup = installLocalStorage();
  const originalFetch = global.fetch;

  try {
    const localTeam = buildTeamWithStats({
      gamesPlayed: 3,
      plateAppearances: 12,
      atBats: 10,
      hits: 7,
    });
    const staleBackendTeam = buildTeamWithStats({
      gamesPlayed: 2,
      plateAppearances: 8,
      atBats: 7,
      hits: 4,
    });

    saveActiveTeam(localTeam);
    global.fetch = async () => Response.json({ team: staleBackendTeam });

    const hydratedTeam = await hydrateActiveTeamFromBackend();

    assert.equal(hydratedTeam?.players[0].seasonStats.gamesPlayed, 3);
    assert.equal(hydratedTeam?.players[0].seasonStats.plateAppearances, 12);
    assert.equal(loadActiveTeam()?.players[0].seasonStats.hits, 7);
  } finally {
    resetActiveTeam();
    global.fetch = originalFetch;
    cleanup();
  }
});

test("backend hydration applies backend totals when they are current", async () => {
  const cleanup = installLocalStorage();
  const originalFetch = global.fetch;

  try {
    const localTeam = buildTeamWithStats({
      gamesPlayed: 2,
      plateAppearances: 8,
      atBats: 7,
      hits: 4,
    });
    const currentBackendTeam = buildTeamWithStats({
      gamesPlayed: 3,
      plateAppearances: 12,
      atBats: 10,
      hits: 7,
    });

    saveActiveTeam(localTeam);
    global.fetch = async () => Response.json({ team: currentBackendTeam });

    const hydratedTeam = await hydrateActiveTeamFromBackend();

    assert.equal(hydratedTeam?.players[0].seasonStats.gamesPlayed, 3);
    assert.equal(hydratedTeam?.players[0].seasonStats.plateAppearances, 12);
    assert.equal(loadActiveTeam()?.players[0].seasonStats.hits, 7);
  } finally {
    resetActiveTeam();
    global.fetch = originalFetch;
    cleanup();
  }
});

function installLocalStorage() {
  const store = new Map();
  const previousWindow = global.window;

  global.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      removeItem: (key) => store.delete(key),
      setItem: (key, value) => store.set(key, value),
    },
    addEventListener: () => {},
    dispatchEvent: () => true,
    removeEventListener: () => {},
  };

  return () => {
    if (previousWindow === undefined) {
      delete global.window;
      return;
    }

    global.window = previousWindow;
  };
}

function buildTeamWithStats(stats) {
  const input = createEmptyPlayerInput(1);
  input.name = "Preston";
  input.gender = "Male";
  const player = {
    ...createPlayerFromInput(input, 1),
    id: "preston-6",
    seasonStats: {
      ...input.startingStats,
      ...stats,
      singles: stats.hits,
      outs: stats.atBats - stats.hits,
    },
  };

  return {
    ...createActiveTeam("Kobe Peeps", [player]),
    id: "kobe-peeps",
    ownerUid: "account-a",
    ownerEmail: "team@example.com",
  };
}

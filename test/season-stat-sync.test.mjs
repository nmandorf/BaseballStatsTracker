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
  syncActiveTeamToBackend,
} from "../src/lib/teamStorage.ts";

const firstGameStorageSource = readFileSync(
  new URL("../src/lib/firstGameStorage.ts", import.meta.url),
  "utf8",
);
const teamStorageSource = readFileSync(
  new URL("../src/lib/teamStorage.ts", import.meta.url),
  "utf8",
);
const teamBackendSource = readFileSync(
  new URL("../src/lib/teamBackend.ts", import.meta.url),
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
  assert.match(firstGameStorageSource, /updatedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(firstGameStorageSource, /saveActiveTeam\(nextTeam\)/);
  assert.match(firstGameStorageSource, /syncActiveTeamToBackend\(nextTeam\)/);
});

test("season and lineup screens refresh active team stats from the backend", () => {
  assert.match(teamStorageSource, /export function useBackendSyncedActiveTeam/);
  assert.match(teamStorageSource, /hydrateActiveTeamFromBackend\(\)/);
  assert.match(seasonStatsSource, /useBackendSyncedActiveTeam/);
  assert.match(battingOrderSource, /useBackendSyncedActiveTeam/);
  assert.match(gameSetupSource, /useBackendSyncedActiveTeam/);
});

test("team backend ignores stale season stat snapshots", () => {
  assert.match(teamBackendSource, /shouldPersistIncomingSeasonStats/);
  assert.match(teamBackendSource, /getSeasonStatsProgress\(incomingSeasonStats\) >= getSeasonStatsProgress\(existingSeasonStats\)/);
  assert.match(teamBackendSource, /existingPlayerSeasonStats \? fromStatsData\(existingPlayerSeasonStats\) : null/);
  assert.doesNotMatch(teamBackendSource, /incomingTeamSnapshotIsCurrent/);
});

test("active team backend syncs are ordered and bounded", () => {
  assert.match(teamStorageSource, /activeTeamBackendSyncQueue/);
  assert.match(teamStorageSource, /postActiveTeamToBackend\(team, activeTeamBackendSyncTimeoutMs\)/);
  assert.match(teamStorageSource, /withTimeout/);
  assert.match(teamStorageSource, /AbortController/);
  assert.match(teamStorageSource, /activeTeamBackendSyncTimeoutMs/);
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

test("backend hydration applies saved game stats over stale local game counters", async () => {
  const cleanup = installLocalStorage();
  const originalFetch = global.fetch;

  try {
    const staleLocalTeam = buildTeamWithStats({
      gamesPlayed: 4,
      plateAppearances: 0,
      atBats: 0,
      hits: 0,
    });
    const backendTeamWithGameStats = buildTeamWithStats({
      gamesPlayed: 3,
      plateAppearances: 12,
      atBats: 10,
      hits: 7,
    });

    saveActiveTeam(staleLocalTeam);
    global.fetch = async () => Response.json({ team: backendTeamWithGameStats });

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

test("active team backend syncs keep fresher final-game totals as the last write", async () => {
  const originalFetch = global.fetch;
  const staleTeam = buildTeamWithStats({
    gamesPlayed: 2,
    plateAppearances: 8,
    atBats: 7,
    hits: 4,
  });
  const finalGameTeam = buildTeamWithStats({
    gamesPlayed: 3,
    plateAppearances: 12,
    atBats: 10,
    hits: 7,
  });
  const savedHitTotals = [];
  let resolveSlowSync;
  const slowSync = new Promise((resolve) => {
    resolveSlowSync = resolve;
  });

  try {
    global.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      savedHitTotals.push(body.team.players[0].seasonStats.hits);

      if (savedHitTotals.length === 1) {
        return slowSync;
      }

      return Response.json({ team: body.team });
    };

    syncActiveTeamToBackend(staleTeam);
    await waitFor(() => savedHitTotals.length === 1);

    syncActiveTeamToBackend(finalGameTeam);
    await tick();

    assert.deepEqual(savedHitTotals, [4]);

    resolveSlowSync(Response.json({ team: staleTeam }));
    await waitFor(() => savedHitTotals.length === 2);

    assert.deepEqual(savedHitTotals, [4, 7]);
  } finally {
    global.fetch = originalFetch;
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

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }

    await tick();
  }

  assert.fail("Timed out waiting for condition.");
}

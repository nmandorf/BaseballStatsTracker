import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createActiveTeam,
  createBackendTeam,
  createEmptyPlayerInput,
  createPlayerFromInput,
  createZeroPlayerStats,
  isSameTeamWorkspace,
  loadAvailableTeamsFromBackend,
  loadActiveTeam,
  resetActiveTeam,
  saveActiveTeam,
} from "../src/lib/teamStorage.ts";
import { canUseStoredTeam, readVerifiedTeamAccountFromRequest } from "../src/lib/teamAccount.ts";
import { installLocalStorage } from "./helpers/local-storage.mjs";

test("server auth verification uses the same configured Firebase project as the client", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.match(String(url), /identitytoolkit\.googleapis\.com/);
    assert.match(String(url), /key=.+/);
    assert.deepEqual(JSON.parse(options.body), { idToken: "signed-token" });
    return Response.json({ users: [{ localId: "account-a", email: "tester@example.com" }] });
  };

  try {
    const request = new Request("http://localhost/api/team", { headers: { Authorization: "Bearer signed-token" } });
    assert.deepEqual(await readVerifiedTeamAccountFromRequest(request), { uid: "account-a", email: "tester@example.com" });
  } finally {
    global.fetch = originalFetch;
  }
});

test("configured auth rejects stored teams until the owning account is resolved", () => {
  assert.equal(canUseStoredTeam("account-a", null, true), false);
  assert.equal(canUseStoredTeam("account-a", "account-b", true), false);
  assert.equal(canUseStoredTeam("account-a", "account-a", true), true);
  assert.equal(canUseStoredTeam("account-a", null, false), true);
});

test("team workspace identity requires both owner and team id", () => {
  const firstAccountTeam = { id: "shared-slug", ownerUid: "account-a" };
  const secondAccountTeam = { id: "shared-slug", ownerUid: "account-b" };
  const overlappingRosterTeam = { id: "another-team", ownerUid: "account-a" };

  assert.equal(isSameTeamWorkspace(firstAccountTeam, firstAccountTeam), true);
  assert.equal(isSameTeamWorkspace(firstAccountTeam, secondAccountTeam), false);
  assert.equal(isSameTeamWorkspace(firstAccountTeam, overlappingRosterTeam), false);
  assert.equal(isSameTeamWorkspace(firstAccountTeam, { id: "shared-slug" }), false);
});

test("createZeroPlayerStats defaults every tracked stat to zero", () => {
  const stats = createZeroPlayerStats();

  assert.deepEqual(Object.values(stats), Array(Object.keys(stats).length).fill(0));
});

test("createPlayerFromInput saves zero starting stats by default", () => {
  const input = createEmptyPlayerInput(1);
  input.name = "Noa Cohen";
  input.gender = "Female";
  input.speedRating = "Fast";

  const player = createPlayerFromInput(input, 1);

  assert.equal(player.name, "Noa Cohen");
  assert.equal(player.gender, "Female");
  assert.equal(player.speedRating, "Fast");
  assert.equal(player.seasonStats.plateAppearances, 0);
  assert.equal(player.seasonStats.rbis, 0);
});

test("createPlayerFromInput preserves entered starting stats and notes", () => {
  const input = createEmptyPlayerInput(2);
  input.name = "Maya Johnson";
  input.gender = "Female";
  input.notes = "Experienced line-drive hitter";
  input.contactNotes = "Hits gaps, Good runner";
  input.startingStats = {
    ...input.startingStats,
    plateAppearances: 12,
    atBats: 10,
    hits: 7,
    doubles: 2,
    walks: 2,
    runs: 5,
    rbis: 4,
  };

  const player = createPlayerFromInput(input, 2);

  assert.equal(player.notes, "Experienced line-drive hitter");
  assert.deepEqual(player.contactNotes, ["Hits gaps", "Good runner"]);
  assert.equal(player.seasonStats.plateAppearances, 12);
  assert.equal(player.seasonStats.hits, 7);
  assert.equal(player.seasonStats.rbis, 4);
});

test("createActiveTeam scopes players to the created team", () => {
  const input = createEmptyPlayerInput(1);
  input.name = "Jordan Lee";
  input.gender = "Male";
  const player = createPlayerFromInput(input, 1);

  const team = createActiveTeam("Kobe's Peeps", [player]);

  assert.equal(team.name, "Kobe's Peeps");
  assert.equal(team.players.length, 1);
  assert.equal(team.players[0].seedOrder, 1);
});

test("active team persistence starts empty and round-trips saved teams", () => {
  const cleanup = installLocalStorage();

  try {
    assert.equal(loadActiveTeam(), null);

    const input = createEmptyPlayerInput(1);
    input.name = "Alex Smith";
    input.gender = "Male";
    const team = createActiveTeam("Tuesday Crew", [createPlayerFromInput(input, 1)]);

    saveActiveTeam(team);
    assert.equal(loadActiveTeam()?.name, "Tuesday Crew");
    assert.equal(loadActiveTeam()?.players[0].name, "Alex Smith");

    resetActiveTeam();
    assert.equal(loadActiveTeam(), null);
  } finally {
    cleanup();
  }
});

test("createBackendTeam returns a usable local team when the backend is unavailable", async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(null, { status: 503 });

  try {
    const team = await createBackendTeam("Fallback Crew");

    assert.equal(team.name, "Fallback Crew");
    assert.equal(team.id, "fallback-crew");
    assert.deepEqual(team.players, []);
  } finally {
    global.fetch = originalFetch;
  }
});

test("account team display can surface backend unavailability", async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(null, { status: 503 });

  try {
    await assert.rejects(
      loadAvailableTeamsFromBackend({ fallbackToActiveTeam: false }),
      /Unable to load account teams/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("account team display respects a successful empty backend list", async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => Response.json({ teams: [] });

  try {
    const teams = await loadAvailableTeamsFromBackend({
      fallbackToActiveTeam: false,
    });

    assert.deepEqual(teams, []);
  } finally {
    global.fetch = originalFetch;
  }
});

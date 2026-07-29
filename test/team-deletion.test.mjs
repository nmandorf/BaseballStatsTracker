import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { deleteTeamPermanently } from "../src/lib/teamStorage.ts";

const rosterSource = readFileSync(
  new URL("../src/sections/RosterSection/index.tsx", import.meta.url),
  "utf8",
);
const rosterDialogsSource = [
  readFileSync(
    new URL(
      "../src/sections/RosterSection/ClearTeamConfirmationDialog.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFileSync(
    new URL("../src/sections/RosterSection/PlayerDialogs.tsx", import.meta.url),
    "utf8",
  ),
].join("\n");
const backendSource = readFileSync(
  new URL("../src/lib/teamBackend.ts", import.meta.url),
  "utf8",
);

test("permanent team deletion sends an encoded DELETE request", async () => {
  const originalFetch = global.fetch;
  let requestedUrl;
  let requestOptions;

  global.fetch = async (url, options) => {
    requestedUrl = url;
    requestOptions = options;
    return Response.json({ deletedTeam: { teamId: "team/one" } });
  };

  try {
    await deleteTeamPermanently("team/one");

    assert.equal(requestedUrl, "/api/team/team%2Fone");
    assert.equal(requestOptions.method, "DELETE");
  } finally {
    global.fetch = originalFetch;
  }
});

test("permanent team deletion exposes the safe backend error", async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => Response.json(
    { error: { code: "BACKEND_UNAVAILABLE", message: "Unable to delete team." } },
    { status: 503 },
  );

  try {
    await assert.rejects(
      deleteTeamPermanently("team-one"),
      /Unable to delete team\./,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("roster requires confirmation and clears local state only after backend deletion", () => {
  assert.match(rosterDialogsSource, /role="alertdialog"/);
  assert.match(rosterDialogsSource, /Delete Team Permanently/);
  assert.match(rosterDialogsSource, /This action cannot be undone\./);

  const backendDeletion = rosterSource.indexOf("await deleteTeamPermanently(activeTeam.id)");
  const localGameReset = rosterSource.indexOf("resetFirstGameState();", backendDeletion);
  const localTeamReset = rosterSource.indexOf("resetActiveTeam();", backendDeletion);

  assert.notEqual(backendDeletion, -1);
  assert.ok(localGameReset > backendDeletion);
  assert.ok(localTeamReset > backendDeletion);
});

test("backend deletion is atomically scoped to the owning account", () => {
  assert.match(
    backendSource,
    /prisma\.team\.deleteMany\([\s\S]*?id: teamId,[\s\S]*?ownerUid: account\.uid/,
  );
  assert.match(backendSource, /deletion\.count === 0/);
  assert.match(backendSource, /notFoundError\("TEAM_NOT_FOUND"/);
});

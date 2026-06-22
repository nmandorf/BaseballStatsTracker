import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getSafeRedirect } from "../src/lib/authNavigation.ts";

const authGateSource = readFileSync(
  new URL("../src/components/AuthGate/index.tsx", import.meta.url),
  "utf8",
);
const authStatusSource = readFileSync(
  new URL("../src/components/AuthStatus/index.tsx", import.meta.url),
  "utf8",
);
const homeAuthEntrySource = readFileSync(
  new URL("../src/components/HomeAuthEntry/index.tsx", import.meta.url),
  "utf8",
);
const firebaseLoginSource = readFileSync(
  new URL("../src/components/FirebaseLogin/index.tsx", import.meta.url),
  "utf8",
);

test("protected route sign-in returns to the page the user selected", () => {
  assert.match(authGateSource, /login\?next=/);
  assert.match(authGateSource, /href=\{loginHref\}/);
  assert.match(firebaseLoginSource, /defaultRedirect = "\/"/);
});

test("signing out returns Home so Game does not become the next login default", () => {
  assert.match(authStatusSource, /await signOut\(\)/);
  assert.match(authStatusSource, /router\.replace\("\/"\)/);
});

test("Home accepts only the active team owned by the signed-in account", () => {
  assert.match(homeAuthEntrySource, /activeTeam\?\.ownerUid === user\.uid/);
  assert.match(homeAuthEntrySource, /useActiveTeam\(\)/);
});

test("team selection hydrates game state before post-login navigation", () => {
  const preparationIndex = firebaseLoginSource.indexOf("prepareFirstGameStateForTeam");
  const hydrationIndex = firebaseLoginSource.indexOf("await hydrateFirstGameStateFromPrisma");
  const navigationIndex = firebaseLoginSource.indexOf("router.replace(redirectTo)");

  assert.notEqual(preparationIndex, -1);
  assert.notEqual(hydrationIndex, -1);
  assert.notEqual(navigationIndex, -1);
  assert.ok(preparationIndex < hydrationIndex);
  assert.ok(hydrationIndex < navigationIndex);
});

test("intentional login redirects remain restricted to local paths", () => {
  assert.equal(getSafeRedirect("/roster?view=active#players", "/"), "/roster?view=active#players");
  assert.equal(getSafeRedirect("//evil.example", "/"), "/");
  assert.equal(getSafeRedirect("/\\evil.example", "/"), "/");
  assert.equal(getSafeRedirect("https://evil.example", "/"), "/");
  assert.equal(getSafeRedirect(null, "/"), "/");
});

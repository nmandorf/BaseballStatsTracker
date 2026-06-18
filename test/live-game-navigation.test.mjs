import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const headerSource = readFileSync(new URL("../src/sections/HeaderSection/index.tsx", import.meta.url), "utf8");
const offenseSource = readFileSync(new URL("../src/sections/StatsEntrySection/index.tsx", import.meta.url), "utf8");
const defenseSource = readFileSync(new URL("../src/sections/DefenseSection/index.tsx", import.meta.url), "utf8");

test("primary navigation excludes pregame and live game routes", () => {
  const navItemsSource = headerSource.slice(
    headerSource.indexOf("const navItems"),
    headerSource.indexOf("const liveGamePaths"),
  );

  assert.match(navItemsSource, /label: "Home"/);
  assert.match(navItemsSource, /label: "Roster"/);
  assert.match(navItemsSource, /label: "Game Settings"/);
  assert.match(navItemsSource, /label: "Stats"/);
  assert.doesNotMatch(navItemsSource, /Batting Order|Defense/);
});

test("live game shell locks non-game routes", () => {
  assert.match(headerSource, /gameState\.status === "IN_PROGRESS"/);
  assert.match(headerSource, /liveGamePaths\.has\(pathname\)/);
  assert.match(headerSource, /router\.replace\(getLiveGameHref\(gameState\)\)/);
});

test("both game modes follow saved phase transitions and can end the game", () => {
  assert.match(offenseSource, /router\.replace\(getLiveGameHref\(nextState\)\)/);
  assert.match(offenseSource, /persistNextState\(previous, true\)/);
  assert.match(offenseSource, /endGame\(gameState, undefined, teamName\)/);
  assert.match(defenseSource, /router\.replace\(getLiveGameHref\(nextState\)\)/);
  assert.match(defenseSource, /router\.replace\(getLiveGameHref\(previousState\)\)/);
  assert.match(defenseSource, /endGame\(gameState, undefined, activeTeamName\)/);
});

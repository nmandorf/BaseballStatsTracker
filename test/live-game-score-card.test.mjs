import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const offenseSource = [
  readFileSync(new URL("../src/sections/StatsEntrySection/LiveStatsEntry.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../src/sections/StatsEntrySection/StatsEntryUnavailableStates.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../src/sections/StatsEntrySection/useLiveStatsEntry.ts", import.meta.url), "utf8"),
  readFileSync(new URL("../src/sections/StatsEntrySection/components/EditingPlayBanner/index.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../src/sections/StatsEntrySection/components/StickyPlayActions/index.tsx", import.meta.url), "utf8"),
].join("\n");
const defenseSource = [
  readFileSync(
    new URL("../src/sections/DefenseSection/DefenseView.tsx", import.meta.url),
    "utf8",
  ),
  readFileSync(
    new URL(
      "../src/sections/DefenseSection/DefenseAlignmentPanel.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
].join("\n");
const headerSource = readFileSync(new URL("../src/components/LiveGameHeader/index.tsx", import.meta.url), "utf8");

test("offense and defense use the same live game score card", () => {
  assert.equal(offenseSource.match(/<LiveGameHeader/g)?.length, 2);
  assert.match(defenseSource, /<LiveGameHeader/);
  assert.match(headerSource, /max-w-6xl px-3 sm:px-4 lg:px-6/);
  assert.match(headerSource, /gameState\.teamScore/);
  assert.match(headerSource, /gameState\.opponentScore/);
  assert.match(headerSource, /gameState\.outs/);
});

test("offense and defense expose matching sticky live action controls", () => {
  assert.match(offenseSource, /fixed inset-x-0 bottom-0 z-30/);
  assert.match(defenseSource, /fixed inset-x-0 bottom-0 z-30/);
  assert.match(defenseSource, />\s*Undo\s*</);
  assert.match(defenseSource, />\s*Save Defensive Event\s*</);
  assert.match(defenseSource, /grid-cols-\[0\.72fr_1\.28fr\]/);
});

test("stats entry exposes explicit latest-play correction controls", () => {
  assert.match(offenseSource, /replaceLatestSavedPlay/);
  assert.match(offenseSource, /Editing .*latest saved play/);
  assert.match(offenseSource, /Save Changes \+ Continue/);
  assert.match(offenseSource, />\s*Save Changes\s*</);
  assert.match(offenseSource, />\s*Cancel\s*</);
});

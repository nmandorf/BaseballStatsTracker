import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const offenseSource = readFileSync(new URL("../src/sections/StatsEntrySection/index.tsx", import.meta.url), "utf8");
const defenseSource = readFileSync(new URL("../src/sections/DefenseSection/index.tsx", import.meta.url), "utf8");
const headerSource = readFileSync(new URL("../src/components/LiveGameHeader/index.tsx", import.meta.url), "utf8");

test("offense and defense use the same live game score card", () => {
  assert.equal(offenseSource.match(/<LiveGameHeader/g)?.length, 2);
  assert.match(defenseSource, /<LiveGameHeader/);
  assert.match(headerSource, /max-w-6xl px-3 sm:px-4 lg:px-6/);
  assert.match(headerSource, /gameState\.teamScore/);
  assert.match(headerSource, /gameState\.opponentScore/);
  assert.match(headerSource, /gameState\.outs/);
});

test("stats entry exposes explicit latest-play correction controls", () => {
  assert.match(offenseSource, /replaceLatestSavedPlay/);
  assert.match(offenseSource, /Editing .*latest saved play/);
  assert.match(offenseSource, /Save Changes \+ Continue/);
  assert.match(offenseSource, />\s*Save Changes\s*</);
  assert.match(offenseSource, />\s*Cancel\s*</);
});

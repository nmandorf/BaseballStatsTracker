import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const defenseSource = readFileSync(
  new URL("../src/sections/DefenseSection/index.tsx", import.meta.url),
  "utf8",
);

test("defensive event entry appears before alignment controls", () => {
  const eventHeading = defenseSource.indexOf("{defensiveEventLabels[eventType]}");
  const alignmentHeading = defenseSource.indexOf("{alignmentHalf.half} {alignmentHalf.inning}");

  assert.notEqual(eventHeading, -1);
  assert.notEqual(alignmentHeading, -1);
  assert.ok(eventHeading < alignmentHeading);
});

test("defensive entry controls use linked suggestion handlers", () => {
  assert.match(defenseSource, /onChange=\{\(event\) => changeBallType/);
  assert.match(defenseSource, /onChange=\{\(event\) => changeFielder/);
  assert.match(defenseSource, /onChange=\{\(event\) => changePosition/);
  assert.match(defenseSource, /defenderSelectionWasEdited\.current/);
});

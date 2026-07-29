import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const defenseCompositionSource = readFileSync(
  new URL("../src/sections/DefenseSection/DefenseView.tsx", import.meta.url),
  "utf8",
);
const defensiveEventSource = [
  readFileSync(
    new URL(
      "../src/sections/DefenseSection/DefensiveEventCard.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFileSync(
    new URL(
      "../src/sections/DefenseSection/DefensiveEventIdentityFields.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
].join("\n");
const defensiveEventFormSource = readFileSync(
  new URL("../src/sections/DefenseSection/useDefensiveEventForm.ts", import.meta.url),
  "utf8",
);

test("defensive event entry appears before alignment controls", () => {
  const eventCard = defenseCompositionSource.indexOf("<DefensiveEventCard");
  const alignmentCard = defenseCompositionSource.indexOf(
    "<DefensiveAlignmentCard",
  );

  assert.notEqual(eventCard, -1);
  assert.notEqual(alignmentCard, -1);
  assert.ok(eventCard < alignmentCard);
});

test("defensive entry controls use linked suggestion handlers", () => {
  assert.match(defensiveEventSource, /handlers\.changeBallType/);
  assert.match(defensiveEventSource, /handlers\.changeFielder/);
  assert.match(defensiveEventSource, /handlers\.changePosition/);
  assert.match(defensiveEventFormSource, /defenderSelectionWasEdited\.current/);
});

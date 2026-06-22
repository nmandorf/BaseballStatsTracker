import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defensivePositionOptions,
  getDefensivePositionOptions,
} from "../src/lib/defensivePositions.ts";

test("supported defensive positions are unique", () => {
  const values = defensivePositionOptions.map((position) => position.value);

  assert.equal(new Set(values).size, values.length);
});

test("unassigned players receive only supported defensive positions", () => {
  assert.deepEqual(getDefensivePositionOptions(""), defensivePositionOptions);
});

test("legacy defensive positions remain available until replaced", () => {
  const options = getDefensivePositionOptions("Utility IF");

  assert.deepEqual(options[0], {
    value: "Utility IF",
    label: "Utility IF (saved)",
  });
  assert.equal(options.length, defensivePositionOptions.length + 1);
});

test("supported saved positions are not duplicated", () => {
  const options = getDefensivePositionOptions("SS");

  assert.equal(
    options.filter((position) => position.value === "SS").length,
    1,
  );
});

test("legacy position values keep their exact stored value", () => {
  const options = getDefensivePositionOptions(" Utility IF ");

  assert.deepEqual(options[0], {
    value: " Utility IF ",
    label: "Utility IF (saved)",
  });
});

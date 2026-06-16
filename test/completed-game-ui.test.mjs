import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const statsEntrySource = readFileSync(
  new URL("../src/sections/StatsEntrySection/index.tsx", import.meta.url),
  "utf8",
);
const seasonStatsSource = readFileSync(
  new URL("../src/sections/SeasonStatsSection/index.tsx", import.meta.url),
  "utf8",
);

function getFinalStatsViewSource() {
  const start = statsEntrySource.indexOf("export function FinalGameStatsView");
  const end = statsEntrySource.indexOf("export type StatsPlayerRow");

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  return statsEntrySource.slice(start, end);
}

test("season stats page owns the game history card", () => {
  assert.match(seasonStatsSource, /useCompletedGameStates/);
  assert.match(seasonStatsSource, /<GameHistoryCard games=\{gameHistory\}/);
});

test("final game stats view omits the game history card", () => {
  const finalStatsViewSource = getFinalStatsViewSource();

  assert.doesNotMatch(finalStatsViewSource, /GameHistoryCard/);
  assert.doesNotMatch(finalStatsViewSource, /gameHistory/);
  assert.match(finalStatsViewSource, /Final box score/);
  assert.match(finalStatsViewSource, /Player Game Stats/);
});

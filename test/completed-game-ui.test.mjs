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
const rosterSource = readFileSync(
  new URL("../src/sections/RosterSection/index.tsx", import.meta.url),
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

test("season and roster overall stats trust persisted player season rows", () => {
  assert.match(seasonStatsSource, /const stats = player\.seasonStats/);
  assert.match(seasonStatsSource, /getTeamSeasonTotals\(activeTeam\.players\)/);
  assert.doesNotMatch(seasonStatsSource, /getPlayerSeasonStats\(player, firstGameState\)/);
  assert.doesNotMatch(seasonStatsSource, /getTeamSeasonTotals\(activeTeam\.players, firstGameState\)/);
  assert.doesNotMatch(rosterSource, /getPlayerSeasonStats\(player, firstGameState\)/);
});

test("final game stats view omits the game history card", () => {
  const finalStatsViewSource = getFinalStatsViewSource();

  assert.doesNotMatch(finalStatsViewSource, /GameHistoryCard/);
  assert.doesNotMatch(finalStatsViewSource, /gameHistory/);
  assert.match(finalStatsViewSource, /Final box score/);
  assert.match(finalStatsViewSource, /Player Game Stats/);
});

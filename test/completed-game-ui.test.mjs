import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const finalStatsViewSource = [
  readFileSync(new URL("../src/components/FinalGameStatsView/index.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../src/components/FinalGameBoxScore/index.tsx", import.meta.url), "utf8"),
].join("\n");
const seasonStatsSource = readFileSync(
  new URL("../src/sections/SeasonStatsSection/index.tsx", import.meta.url),
  "utf8",
);
const rosterSource = readFileSync(
  new URL("../src/sections/RosterSection/index.tsx", import.meta.url),
  "utf8",
);

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
  assert.doesNotMatch(finalStatsViewSource, /GameHistoryCard/);
  assert.doesNotMatch(finalStatsViewSource, /gameHistory/);
  assert.match(finalStatsViewSource, /Final box score/);
  assert.match(finalStatsViewSource, /Player Game Stats/);
});

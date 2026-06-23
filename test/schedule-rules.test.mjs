import assert from "node:assert/strict";
import { test } from "node:test";
import {
  gameStartLeadTimeMs,
  commonTeamTimeZones,
  getGameStartEligibility,
  getNextScheduleWeeks,
  isValidTimeZone,
  validateScheduleInput,
  zonedGameStart,
} from "../src/lib/scheduleRules.ts";

test("common timezone choices include each standard US region", () => {
  assert.deepEqual(
    commonTeamTimeZones.slice(0, 7).map((option) => option.value),
    ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"],
  );
});

test("schedule requires a valid timezone and at least one game", () => {
  assert.equal(isValidTimeZone("America/Los_Angeles"), true);
  assert.equal(isValidTimeZone("Not/AZone"), false);
  assert.deepEqual(validateScheduleInput([{ kind: "BYE", localDate: "2026-07-01" }], "America/Los_Angeles"), ["Add at least one playable game."]);
});

test("allowed local game time resolves using the offset on the scheduled date", () => {
  assert.equal(zonedGameStart("2026-01-15", "19:00", "America/Los_Angeles")?.toISOString(), "2026-01-16T03:00:00.000Z");
  assert.equal(zonedGameStart("2026-07-15", "19:00", "America/Los_Angeles")?.toISOString(), "2026-07-16T02:00:00.000Z");
});

test("game start unlocks exactly five minutes before first pitch and stays unlocked", () => {
  const scheduledStartAt = new Date("2026-07-16T02:00:00.000Z");
  const tooEarly = getGameStartEligibility({ scheduledStartAt, status: "SCHEDULED", trustedNow: new Date(scheduledStartAt.getTime() - gameStartLeadTimeMs - 1), hasAnotherActiveGame: false });
  const boundary = getGameStartEligibility({ scheduledStartAt, status: "SCHEDULED", trustedNow: new Date(scheduledStartAt.getTime() - gameStartLeadTimeMs), hasAnotherActiveGame: false });
  const late = getGameStartEligibility({ scheduledStartAt, status: "SCHEDULED", trustedNow: new Date(scheduledStartAt.getTime() + 60_000), hasAnotherActiveGame: false });
  assert.equal(tooEarly.allowed, false);
  assert.equal(tooEarly.code, "GAME_START_TOO_EARLY");
  assert.equal(boundary.allowed, true);
  assert.equal(late.allowed, true);
});

test("unverified, cancelled, and competing active games cannot start", () => {
  const scheduledStartAt = new Date("2026-07-16T02:00:00.000Z");
  assert.equal(getGameStartEligibility({ scheduledStartAt, status: "SCHEDULED", trustedNow: null, hasAnotherActiveGame: false }).allowed, false);
  assert.equal(getGameStartEligibility({ scheduledStartAt, status: "CANCELLED", trustedNow: scheduledStartAt, hasAnotherActiveGame: false }).allowed, false);
  const conflict = getGameStartEligibility({ scheduledStartAt, status: "SCHEDULED", trustedNow: scheduledStartAt, hasAnotherActiveGame: true });
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.code, "TEAM_GAME_ALREADY_IN_PROGRESS");
});

test("late unstarted games remain the next playable schedule item", () => {
  const weeks = [{ id: "week-1", kind: "GAME", position: 1, localDate: "2026-07-01", gameId: "game-1", opponent: "Owls", startTime: "19:00", scheduledStartAt: "2026-07-02T02:00:00.000Z", isHome: true, status: "SCHEDULED", preparationStatus: "SETUP", selectedPlayerCount: 0 }];
  assert.equal(getNextScheduleWeeks(weeks, new Date("2026-07-03T00:00:00.000Z")).nextGame?.gameId, "game-1");
});

test("bye dates use the team's local calendar date", () => {
  const weeks = [
    { id: "bye-1", kind: "BYE", position: 1, localDate: "2026-07-02" },
    { id: "bye-2", kind: "BYE", position: 2, localDate: "2026-07-03" },
  ];
  const now = new Date("2026-07-03T02:00:00.000Z");
  assert.equal(getNextScheduleWeeks(weeks, now, "America/Los_Angeles").next?.id, "bye-1");
});

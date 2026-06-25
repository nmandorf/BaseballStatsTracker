import assert from "node:assert/strict";
import { test } from "node:test";
import { GameStatus as PrismaGameStatus } from "../src/generated/prisma/enums.ts";
import { canSaveScheduledGameSnapshot } from "../src/lib/gameSnapshotRules.ts";

function state(status, actionCount, prefix = "play") {
  return {
    status,
    plays: Array.from({ length: actionCount }, (_, index) => ({ id: `${prefix}-${index}` })),
    defensiveEvents: [],
  };
}

function snapshot(actionCount, prefix = "play") {
  return {
    plays: Array.from({ length: actionCount }, (_, index) => ({ id: `${prefix}-${index}` })),
    defensiveEvents: [],
  };
}

test("scheduled games accept live and final snapshots while in progress", () => {
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.IN_PROGRESS, state("IN_PROGRESS", 1)), true);
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.IN_PROGRESS, state("FINAL", 1)), true);
});

test("completed games accept only final snapshots that are not stale", () => {
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.FINAL, state("FINAL", 3), snapshot(3)), true);
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.FINAL, state("FINAL", 4), snapshot(3)), true);
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.FINAL, state("FINAL", 2), snapshot(3)), false);
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.FINAL, state("FINAL", 3, "older-play"), snapshot(3)), false);
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.FINAL, state("IN_PROGRESS", 4), snapshot(3)), false);
});

test("scheduled and cancelled games reject live stat snapshots", () => {
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.SCHEDULED, state("FINAL", 1)), false);
  assert.equal(canSaveScheduledGameSnapshot(PrismaGameStatus.CANCELLED, state("FINAL", 1)), false);
});

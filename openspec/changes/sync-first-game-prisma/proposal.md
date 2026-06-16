# Sync First Game State To Prisma

## Why

The Prisma backend can store the baseball tracker data, but the frontend still
saves live game state only to local browser storage. The app needs to start
mirroring first-game state into Prisma so plays, stats, team totals, and records
can persist outside the browser.

## What Changes

- Add a client-side sync helper that posts first-game snapshots to the Prisma API
  after local state changes.
- Add backend read/reset handling for the first-game API so the frontend can
  hydrate from Prisma and clear the persisted first-game snapshot.
- Wire first-game start, save play, undo, end game, and reset actions to the
  Prisma sync layer while preserving local fallback behavior.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `src/lib/firstGameStorage.ts`, `src/lib/prismaBackend.ts`,
  `src/app/api/first-game/route.ts`, first-game UI sections
- Follow-up: replace local storage as the source of truth once auth/team
  selection and production database setup are finalized.

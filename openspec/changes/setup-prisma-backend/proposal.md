# Set Up Prisma Backend Persistence

## Why

The app currently keeps the first-game flow in local browser storage. Prisma is
initialized, but the backend needs to represent all durable baseball tracker
data, including seeded team data, game records, player stats, team stats, game
rules, plays, and runner movements.

## What Changes

- Extend the Prisma data model with seasons, game rule settings, team game
  stats, team season stats, team records, saved base state, and current batter
  state.
- Add a server-side persistence module that seeds the starter team and can save
  a local first-game snapshot into Prisma tables.
- Keep the live UI on local state for this change; persistence helpers prepare
  the backend without changing the live scoring workflow.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `prisma/schema.prisma`, `src/lib/prisma*.ts`
- Follow-up: wire live scoring saves to the Prisma backend once the persistence
  behavior is approved for the UI flow.

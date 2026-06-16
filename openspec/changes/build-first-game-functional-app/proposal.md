# Build First-Game Functional App

## Why

The app currently demonstrates the main workflow with local UI interactions, but
the baseball/slowpitch logic is still split across screens and prototype state.
The next slice should let an analyst score the first game of a new season with a
seeded 10-player team, deterministic lineup recommendations, live runner/RBI
logic, undo, and zeroed player stats that update from saved plays.

## What Changes

- Add shared first-game seed data for a 10-player team with all stats starting
  at zero.
- Add shared domain logic for stat calculations, lineup recommendations, runner
  advancement defaults, RBI defaults, game state updates, pinch runners, undo,
  and next-batter looping.
- Update Roster, Game Setup, Batting Order, and Stats Entry screens to consume
  the shared first-game data and logic.
- Add Prisma baseball models that match the product entities, without requiring
  a live database connection for the local first-game flow.
- Extend the project manager Kanban script so this functional MVP work can be
  reflected on the board from repo signals.
- Verify with Yarn scripts.

## Non-Goals

- No authentication or multi-user support.
- No production database migration or hosted database writes in this slice.
- No advanced baseball metrics beyond the approved amateur slowpitch stats.
- No complex season dashboard beyond the first-game workflow.

## Impact

- Affected specs: `first-game-functional-app`, `project-manager-ui-intake`
- Affected code: `src/lib/*`, `src/types/*`, `src/sections/*`,
  `prisma/schema.prisma`, `scripts/project-manager.mjs`, `test/*`

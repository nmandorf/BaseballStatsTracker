# Change: Edit prior stats for existing roster players

## Why

Starting stats can be entered only while creating a player. After the team exists, coaches need a safe way to correct or import a roster player's prior offensive totals without deleting and recreating the player.

## What Changes

- Add an `Edit Prior Stats` action to each roster player.
- Open a mobile-friendly modal populated from the player's saved baseline season stats, excluding stats accumulated in the currently tracked game.
- Let the user edit games, batting outcomes, runs, and RBI while deriving Hits, At-Bats, and Plate Appearances from the entered outcomes.
- Save changes to the active-team mirror and existing backend team sync path.
- Keep an active game's lineup baseline synchronized without changing that game's recorded plays or game-only stats.

## Impact

- Affected spec: `team-onboarding-flow`
- Affected code: roster UI, prior-stat editor, team stat normalization, active game baseline synchronization, and tests


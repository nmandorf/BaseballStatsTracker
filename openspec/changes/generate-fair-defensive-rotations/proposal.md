# Change: Generate fair defensive rotations

## Why

The current defense generator assigns players by batting-order position and then copies the same alignment into later innings. It does not use the defensive preferences and ratings already stored on player profiles, rotate the bench fairly, keep one pitcher for the game, or guarantee the league minimum of three female defenders.

## What Changes

- Generate the starting defense from player position preferences, avoid-position notes, and defensive ratings.
- Generate a distinct proposed alignment for every defensive inning instead of copying the prior inning unchanged.
- Lock the starting pitcher at Pitcher for the full game and keep that player off the bench.
- Require at least three female players in every saved defensive alignment.
- Rotate bench assignments so repeat sits are avoided until other eligible players have sat when the hard constraints allow it.
- Show compact mobile-first pitcher, gender-rule, and bench-rotation status near the alignment editor.
- Normalize legacy free-text defensive position values into the app's supported defensive positions.

## Impact

- Affected specs: `defensive-tracking-tab`
- Affected code: defensive generation and validation helpers, game-state transitions and normalization, defensive alignment editor, starting-defense flow, and focused tests
- No new dependency or database migration is expected; the pitcher lock is stored in the existing game snapshot state.

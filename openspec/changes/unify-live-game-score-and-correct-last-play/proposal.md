# Change: Unify live-game score and correct the last saved play

## Why

Offense and defense currently present the same game situation with different components, spacing, and responsive widths. The batting-order strip also lets an analyst jump back to a hitter, but saving from there appends a second plate appearance instead of correcting the saved result.

## What Changes

- Add one shared, compact live-game score card and header gutter used at the top of both Offense and Defense.
- Keep mode-specific entry layouts below the shared header.
- Let the analyst edit the most recently saved offensive play while the same offensive half-inning is still active.
- Replace that play from its pre-play snapshot so score, outs, bases, stats, RBI, history, and next-batter position are recalculated together.
- Clearly label edit mode and provide a cancel action; older plays remain read-only because changing them could invalidate later runner movement.

## Impact

- Affected specs: `first-game-functional-app`, `defensive-tracking-tab`
- Affected code: live-game UI components, Stats Entry state, game engine, game-state persistence, and focused tests


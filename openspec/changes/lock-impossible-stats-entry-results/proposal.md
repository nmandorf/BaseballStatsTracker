# Lock Impossible Stats Entry Results

## Why

During live scoring, the analyst should not be able to select batter results
that cannot happen from the current base and out state. Keeping impossible
choices locked reduces bad scoring data and keeps the tap flow fast.

## What Changes

- Add result availability rules for the live Stats Entry state.
- Lock Sac Fly when there is no runner on 3B or there are already two outs.
- Lock Double Play when bases are empty or there are already two outs.
- Lock Fielder's Choice when bases are empty.
- Keep possible results selectable from any legal current state.

## Non-Goals

- No new league-rule configuration logic.
- No changes to runner movement defaults or saved play scoring.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `src/lib/gameEngine.ts`,
  `src/sections/StatsEntrySection/index.tsx`, `src/components/ResultButton`

# Align Stats Entry With Stitch Layout

## Why

The Stats Entry screen currently uses a dashboard-style layout that reads as
Stitch-informed but does not closely follow the Stitch MCP mobile design brief.
The live scoring surface should match the generated flow more directly so the
analyst can score from one compact current-batter screen.

## What Changes

- Reshape Stats Entry into the fixed Stitch flow: situation header, batting
  order strip, current batter card, result grid, occupied runners panel,
  conditional RBI controls, after-play summary, and sticky bottom actions.
- Apply the Stitch visual direction: warm off-white background, field-green
  primary action, amber current-batter highlight, restrained red states,
  compact cards with 8px maximum radius, and large tap targets.
- Preserve the existing scoring engine and data updates.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `src/sections/StatsEntrySection/index.tsx`,
  `src/components/BaseDiamond/index.tsx`,
  `src/components/ResultButton/index.tsx`, `src/app/globals.css`

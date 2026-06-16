# Add Static App Shell Screens

## Why

The app needs to feel complete as a mobile-first baseball tracker while the
feature logic remains gated by later OpenSpec changes. Users should be able to
review the intended Roster, Game Setup, Batting Order, and Stats Entry screens
without triggering game state, stats calculations, recommendations, or writes.

## What Changes

- Add static App Router routes for the main app areas.
- Add page-layer modules and section modules that preserve the existing folder
  structure.
- Add reusable display components for player cards, result buttons, stat tiles,
  screen headers, and a base diamond preview.
- Use the Stitch-informed palette and compact Google-app-style mobile surface.
- Keep every baseball tracker control display-only until future changes approve
  product behavior.

## Impact

- Affected specs: `static-app-shell`
- Affected code: `src/app/*`, `src/pages/*`, `src/sections/*`,
  `src/components/*`, `src/app/globals.css`

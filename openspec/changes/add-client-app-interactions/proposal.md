# Add Client App Interactions

## Why

The current app shell looks complete but most controls are inert. The app should
feel usable during review, with tap targets, filters, selections, runner
controls, RBI choices, and next-batter flow responding immediately.

## What Changes

- Add client-side state to the existing app shell screens.
- Make roster search, active filters, active toggles, and local player entry
  interactive.
- Make game setup opponent/home/lineup/rule/player controls interactive.
- Make batting order rows movable in the local UI.
- Make stats entry result selection, runner movement, pinch runner UI, RBI
  choice, undo, and save/next batter interactive in memory.
- Keep all state local to the browser session.

## Non-Goals

- No database writes.
- No API routes or Server Actions.
- No persisted player/game/stats records.
- No production batting-order recommendation engine.
- No permanent season/stat calculation system.

## Impact

- Affected specs: `client-app-interactions`
- Affected code: `src/sections/*`, `src/components/ResultButton`

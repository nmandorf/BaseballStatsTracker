# Clean Home Next Game

## Why

The current home page reads like a dashboard/explainer for the full product. The first screen should instead behave like a clean game-day home screen: show the next known game, make the opponent and time obvious, and provide a direct path to start game setup.

## What Changes

- Replace the home dashboard/explainer stack with a focused game-day home surface.
- Fetch the public QuickScores team schedule and display the next playable game for Kobe's Peeps.
- Show a clear fallback when the next listed schedule item is a bye or the schedule cannot be loaded.
- Add a dominant Start Game action with secondary lineup and roster actions.
- Follow the Stitch MCP sports-operations direction: dense, mobile-first, low-shadow cards, 48px tap targets, and no marketing-style feature copy.

## Non-Goals

- No new stats-entry calculations.
- No runner movement, RBI, batting order scoring, or database writes.
- No QuickScores mutations or authenticated integrations.

## Impact

- Affected specs: `home-page-foundation`
- Affected code: `src/app/page.tsx`, `src/pages/Home/index.tsx`, `src/sections/HomeHeroSection/index.tsx`, `src/lib/*`

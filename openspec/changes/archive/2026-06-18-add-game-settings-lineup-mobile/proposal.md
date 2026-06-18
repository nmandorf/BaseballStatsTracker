# Add Game Settings And Mobile Lineup Review

## Summary

Add a mobile-first Game Settings tab where the analyst can change game rules
before live scoring, and adjust Batting Order so the suggested lineup is the
first mobile content after the nav.

## Motivation

The current Batting Order page puts summary cards above the lineup on mobile,
which hides the main review task below the fold. The lineup can also appear
empty when generation has not been explicitly saved, leaving the coach without a
clear path to accept and start the game. Rule controls currently live inside
Game Setup as local UI state, so settings do not behave like a durable game
configuration surface.

## Scope

- Add a primary Game Settings route and nav item.
- Persist editable game rules in pregame setup state.
- Let Game Setup and Batting Order use the persisted rules.
- Reorder the Batting Order mobile layout so Suggested Lineup appears before
  summary/header/ranking content.
- Show a clear empty/setup state when a lineup cannot be generated.

## Non-Goals

- Do not add new stats-entry scoring rules beyond saving the configured rules
  into the game state.
- Do not change slowpitch lineup recommendation scoring.

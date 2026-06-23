# Add Full-Game Defensive Lineup PDF

## Why

Coaches need a printable, shareable defensive plan before the game starts. The
current Batting Order screen only reviews the starting defensive half, so bench
rotation and position assignments for later innings are hard to inspect.

## What Changes

- Add a full-game defensive lineup grid to Batting Order that defaults to seven
  defensive innings.
- Generate the grid with the existing defensive assignment engine, preserving
  the full-game pitcher lock and position-preference scoring.
- Protect female players from benching when the lineup has three or fewer female
  players.
- Avoid benching any player more than once when the roster size and inning count
  make that possible; otherwise show a clear warning.
- Add a landscape letter PDF download containing only the defensive grid, with
  bench cells shown as `B` and visually highlighted.

## Out of Scope

- No backend persistence for the full-game plan.
- No new scoring, runner movement, or batting lineup recommendation behavior.
- No changes to the live defensive event workflow beyond using the same
  generation rules.

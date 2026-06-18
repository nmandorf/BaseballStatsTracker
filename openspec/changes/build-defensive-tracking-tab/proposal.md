## Why

The app can track offense during a live game, but it cannot show who is reliable on defense, where players actually played, or which mistakes cost extra bases. A lightweight defensive tracking tab gives the team useful fielding information without turning live scoring into full official scorekeeping.

## What Changes

- Add a separate mobile-first `Defense` tab used when the team is in the field, while keeping `Stats Entry` focused on the team batting.
- Extend the game flow so the coach approves the batting order, sets a starting defensive alignment, then starts the game.
- Track home/away half-inning responsibility so home teams defend the Top half and hit the Bottom half, while away teams hit the Top half and defend the Bottom half.
- Support defensive positions for Pitcher, Catcher, First Base, Second Base, Shortstop, Third Base, Left Field, Left Center, Right Center, Right Field, and Bench.
- Store inning-by-inning defensive alignments, position changes, bench/sitting state, defensive innings by position, and undoable defensive events.
- Capture MVP defensive events: routine out made, misplay, great play, extra bases allowed, hit/no play, and double play.
- Add simple analyst defensive ratings for arm strength, throw accuracy, glove skill, range, and position confidence.
- Add defensive player summaries with defensive notes, calculated reliability stats, position innings, and basic best-fit labels.
- Persist the first implementation local-first in game state/local storage, with Prisma-ready schema and migration tasks for durable storage.

## Capabilities

### New Capabilities
- `defensive-tracking-tab`: Covers defensive setup, live defensive half-inning tracking, defensive events, defensive stats, analyst defensive ratings, and basic defensive best-fit labels.

### Modified Capabilities
- `team-authentication`: Defense becomes a protected team stats area that requires the same signed-in/team setup protections as Roster, Game Setup, Batting Order, and Stats Entry.

## Impact

- Affected UI: primary navigation, batting order start flow, new defensive setup/live defense route, player-card defense summaries, and mobile game-day controls.
- Affected data: game state gains half-inning mode, defensive alignments, defensive events, defensive ratings, defensive notes, and calculated defensive summaries.
- Affected persistence: local storage normalization must preserve existing saved games and support new defense fields; existing live-game snapshot sync should include defensive state where available; Prisma models/migrations should be prepared for alignments, events, ratings, and summaries.
- Affected game logic: half-inning transitions must update score, outs, current inning/half, offensive bases, opponent runs, defensive event history, and undo behavior consistently.
- Affected tests: add unit coverage for defensive stats, alignment helpers, half-inning transitions, event saving, undo, and mobile flow verification.
- No new third-party dependency is expected.

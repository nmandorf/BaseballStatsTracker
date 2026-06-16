# Add Pregame Lineup Approval

## Why

The first-game MVP can recommend and edit a batting order, but the user flow
should start from the Game tab: select today's players and opponent, generate
the best available lineup from season stats, let the coach accept or adjust it,
then start the game from that accepted order.

## What Changes

- Persist a local pregame setup with opponent, home/away choice, lineup size,
  selected player ids, generated lineup ids, and coach approval state.
- Update Game Setup so selecting active players and opponent generates the
  lineup for review.
- Update Batting Order so it reads the generated pregame lineup, allows coach
  edits, accepts the final order, and starts the game using that order.
- Keep the recommendation based on existing season stats and approved amateur
  slowpitch lineup priorities.

## Non-Goals

- No authentication or multi-team scheduling.
- No database-backed persistence in this slice.
- No new baseball scoring logic beyond using the accepted lineup to start the
  live game.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `src/lib/*`, `src/sections/GameSetupSection`,
  `src/sections/BattingOrderSection`

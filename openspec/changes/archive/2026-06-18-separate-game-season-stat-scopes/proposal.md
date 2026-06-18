## Why

Live scoring and final-game review currently risk showing season totals where
the analyst expects current-game numbers. That makes in-game decisions and
post-game review confusing.

## What Changes

- Initialize first-game stats from zero game totals instead of season totals.
- Keep live Stats Entry and final summary labels scoped to the current game.
- Preserve season/all-time stats for season-oriented surfaces.
- Align the final stats summary layout so desktop columns start together and
  mobile stacks cleanly.

## Non-Goals

- Do not replace the season stat system.
- Do not add multi-game history beyond the existing first-game persistence.
- Do not change the approved runner movement or RBI defaults.

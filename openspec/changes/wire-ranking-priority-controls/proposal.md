## Why

The Batting Order screen shows ranking-priority chips, but selecting a chip only
updates review text. Coaches expect those controls to recalculate the suggested
lineup around the selected priority before they accept the order.

## What Changes

- Make ranking-priority chips feed the batting-order recommendation logic.
- Keep the default recommendation aligned with the approved slowpitch stat
  priorities.
- Clear manual lineup moves when a different priority is selected so the
  regenerated recommendation is visible immediately.
- Let the ranking-priority panel span the full review width.

## Impact

- Affected code: batting order recommendation, pregame lineup generation, and
  Batting Order review UI.
- Affected tests: lineup recommendation unit tests.
- No Stats Entry, runner movement, RBI, or scoring persistence behavior changes
  are expected.

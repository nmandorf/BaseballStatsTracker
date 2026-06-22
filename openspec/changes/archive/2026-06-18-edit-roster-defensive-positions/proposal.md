## Why

Players can receive a primary defensive position when they are created, but the
roster provides no way to correct or update that assignment later. Team managers
need a fast, mobile-friendly way to keep defensive positions current from the
Roster tab.

## What Changes

- Show each player's saved defensive position in roster management.
- Let the user change or clear a player's defensive position from the player's
  roster card.
- Persist position edits in the local active-team mirror and through the existing
  team backend synchronization path.
- Constrain new roster edits to the supported slowpitch defensive positions while
  continuing to display legacy free-text values safely.

## Capabilities

### New Capabilities

- `roster-defensive-positions`: View, edit, clear, and persist a player's primary
  defensive position from roster management.

### Modified Capabilities

None.

## Impact

- Affected UI: roster player cards and roster management controls.
- Affected client behavior: active-team player updates and backend synchronization.
- Affected data: existing `Player.primaryPosition`; no schema migration or new
  dependency is required.

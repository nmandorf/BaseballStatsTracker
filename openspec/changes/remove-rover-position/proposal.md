## Why

The defensive tracker currently exposes an optional Rover position, but the team uses a fixed ten-position defense. Keeping Rover in the UI, engine, and persistence model creates an unsupported lineup state and complicates rotations.

## What Changes

- **BREAKING** Remove Rover from the supported defensive positions and alignment editor.
- Generate every defensive alignment against the fixed ten-position defense.
- Remove Rover enablement state from application types and persistence.
- Remove existing persisted Rover slots and clear Rover profile preferences during migration before narrowing the database enum.
- Update defensive rotation tests and product specifications to describe the fixed position set.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `defensive-tracking-tab`: Defensive alignments use ten supported fielding positions with no optional Rover state.

## Impact

- Affected code: defensive types, alignment generation and editing, game-state transitions, Prisma schema and migration, and focused tests.
- Affected data: existing Rover alignment slots are deleted; the obsolete alignment-level Rover flag is removed.
- Dependencies: none.

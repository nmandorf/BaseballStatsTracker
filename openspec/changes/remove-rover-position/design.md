## Context

Defensive alignments currently carry an optional eleventh `ROVER` slot and a separate `roverEnabled` flag through TypeScript state, generation helpers, UI controls, and PostgreSQL persistence. The product now requires one fixed set of ten defensive positions. Existing databases may contain both Rover slot rows and alignments whose flag is enabled.

## Goals / Non-Goals

**Goals:**

- Make the supported defensive-position type the single source of truth for the ten fielding positions.
- Remove all Rover-specific decisions and controls from runtime code.
- Safely remove persisted Rover data and schema state.
- Keep rotation fairness, pitcher locking, and gender validation unchanged.

**Non-Goals:**

- Redesign the alignment editor.
- Change how the ten remaining positions are scored or assigned.
- Preserve historical Rover innings after the migration.

## Decisions

1. Use one exported `defensivePositions` collection everywhere. A separate required/all distinction only existed to support Rover and would preserve accidental optional-position complexity.
2. Remove `roverEnabled` from alignment types and generator inputs instead of retaining a permanently false compatibility field. This makes the removed state impossible to represent in application code.
3. Delete persisted `ROVER` slot and event rows and clear Rover player-position preferences before replacing the PostgreSQL enum, then drop the alignment flag. PostgreSQL enum values are narrowed by creating a replacement enum and recasting the remaining columns.
4. Do not edit the original defensive-tracking migration. A forward migration keeps already-deployed databases reproducible and upgradeable.

Alternatives considered: hide only the UI control, or retain Rover in storage for history. Both leave unsupported states in the engine and reporting, conflicting with complete removal.

## Risks / Trade-offs

- [Historical Rover assignments and Rover-tagged events are discarded] → Delete them explicitly and document the breaking migration in the proposal.
- [Enum narrowing can fail if Rover rows remain] → Delete all rows referencing Rover before casting either enum-backed column.
- [Generated Prisma client can become stale] → Run Prisma generation and type checking after the schema update.

## Migration Plan

1. Delete defensive event and alignment-slot rows whose position is `ROVER`.
2. Drop the default on enum-backed position columns, create the ten-value replacement enum, cast both columns, and restore the slot default if one exists.
3. Drop the old enum and rename the replacement.
4. Drop `DefensiveAlignment.roverEnabled`.
5. Deploy application code that only understands the ten-position model with the migration.

Rollback requires restoring the enum value and flag schema, but deleted historical Rover rows cannot be reconstructed automatically.

## Open Questions

None.

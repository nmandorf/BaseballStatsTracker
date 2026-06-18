## 1. Product Contract and Data Model

- [x] 1.1 Update the defensive-tracking specification for a fixed ten-position defense.
- [x] 1.2 Remove Rover and Rover enablement from TypeScript and Prisma models.
- [x] 1.3 Add a forward migration that removes persisted Rover data and narrows the defensive-position enum.

## 2. Runtime Behavior

- [x] 2.1 Simplify defensive generation, normalization, assignment, and summaries to the ten supported positions.
- [x] 2.2 Remove Rover controls and conditional position display from the mobile alignment editor.
- [x] 2.3 Remove Rover state propagation from game transitions and snapshot normalization.

## 3. Verification

- [x] 3.1 Update focused defensive-engine tests for the fixed position set.
- [x] 3.2 Run OpenSpec validation, Prisma validation and generation, tests, lint, typecheck, and build.
- [x] 3.3 Complete a separate compliance review and resolve material findings.

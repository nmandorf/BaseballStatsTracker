## Context

The repository currently has strong static health, but raw file size still
hides several mixed concerns. A large pure algorithm can remain cohesive,
while a smaller file that combines browser storage, remote synchronization,
normalization, and business decisions is a better split candidate. The audit
therefore combines a complete source inventory with manual boundary review.

## Goals / Non-Goals

**Goals:**

- Include every hand-written source, script, unit-test, and E2E file in the
  audit inventory.
- Make large production modules navigable by product responsibility.
- Keep pure decisions separate from browser, network, database, and framework
  side effects.
- Preserve current public import paths through facade re-exports where
  consumers already depend on them.
- Reduce repeated UI structures by reusing focused components.
- Leave a concise audit record that explains both split and no-split choices.

**Non-Goals:**

- Editing generated Prisma client files.
- Splitting tests merely to reduce line counts when each test file represents
  one coherent behavior suite.
- Changing product rules, UI order, persistence formats, database schema, or
  API behavior.
- Introducing generic utility abstractions without a clear business name.

## Decisions

### Review every file, refactor by responsibility

The inventory covers all hand-written TS, TSX, JS, and MJS files. Files at or
below the normal review threshold remain eligible for action when complexity,
duplication, or coupling signals identify a problem. Large files remain
together only when their code forms one cohesive algorithm or test suite and a
split would increase navigation cost.

### Keep compatibility facades

Established modules such as `gameEngine`, `defenseEngine`, and storage/backend
entry points remain valid import locations. Focused modules own extracted
implementation, while facades re-export existing public contracts.

### Separate decisions from actions

Pure normalization, validation, scoring, ranking, and mapping logic moves away
from browser storage, network requests, Prisma transactions, and React state
where a coherent boundary exists.

### Preserve client/server boundaries

React client directives stay only on modules that use client hooks or browser
APIs. Server database helpers do not become reachable from client component
graphs. Next.js route handlers remain thin framework adapters.

### Verify in focused batches

Each extraction batch is checked with typecheck and relevant unit tests.
Completion requires lint, full unit tests, Prisma validation, production build,
strict OpenSpec validation, structural health analysis, browser E2E coverage,
and an independent compliance review.

## Risks / Trade-offs

- Facade re-exports can create circular imports if focused modules import the
  facade. Extracted modules will import shared types or lower-level helpers
  directly instead.
- Mechanical moves can alter initialization order. Constants and side-effectful
  storage code will keep their original execution order.
- Too many tiny files make navigation worse. Small helpers stay with their
  owning responsibility unless reused or independently testable.
- Source-contract tests may point at old implementation owners. They will be
  updated only to follow the new canonical owner, without weakening assertions.

## Migration Plan

1. Capture the complete hand-written file inventory and structural signals.
2. Extract domain responsibilities behind compatibility facades.
3. Extract persistence and backend mapping/normalization responsibilities.
4. Reduce remaining mixed presentation and script modules.
5. Record split and no-split audit decisions.
6. Run the complete verification and compliance review.

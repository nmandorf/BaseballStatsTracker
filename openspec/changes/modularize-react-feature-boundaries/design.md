## Context

Stats Entry already demonstrates the intended structure: a small entry module, a feature controller hook, pure decisions, and focused presentation components. Other major screens predate that boundary and still keep many independent components in a single file.

## Goals / Non-Goals

**Goals:**

- Make major feature entry modules readable as product-state orchestration.
- Put substantial presentation responsibilities in focused modules with explicit props.
- Reuse shared field and status components when the same interaction appears more than once.
- Reduce the largest hand-written React files without introducing generic abstractions that hide product meaning.
- Keep every user-visible and persistence behavior unchanged.

**Non-Goals:**

- Changing baseball, softball, scoring, lineup, schedule, defense, authentication, or storage rules.
- Splitting stable domain engines solely to meet an arbitrary line count.
- Restyling screens or changing their mobile-first information order.
- Replacing current storage or backend boundaries.

## Decisions

### Extract by product responsibility

Feature-local components stay beside their owning feature. Components used by multiple feature areas stay under `src/components`. Small helpers remain together when separating them would increase navigation cost.

### Keep state ownership close to the entry point

The entry module or a dedicated feature hook owns state and side effects. Extracted presentation components receive explicit values and callbacks and do not reach into browser storage or backend clients.

### Preserve imports during migration

Existing public component and section exports remain available from their current paths. No route or consumer should need to understand the internal module tree.

### Use behavior-preserving verification

Existing unit and source-contract tests remain the product authority. Typecheck, lint, tests, Prisma validation, production build, and an independent compliance review are required.

## Risks / Trade-offs

- Moving JSX can accidentally alter callback closure behavior. Keep stateful callbacks in their current controller and pass them through explicit props.
- Over-extraction can create prop noise. Extract only coherent cards, forms, lists, dialogs, and pure view decisions.
- A project-wide engine split would enlarge blast radius. Domain engine changes are intentionally excluded from this pass.

## Migration Plan

1. Add focused feature-local component and decision modules.
2. Replace in-file implementations with imports.
3. Keep public exports and product behavior stable.
4. Repair the malformed manual test artifact.
5. Run the full verification suite and independent review.


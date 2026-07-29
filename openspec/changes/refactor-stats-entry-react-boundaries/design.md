## Context

`src/sections/StatsEntrySection/index.tsx` currently owns route gating, live-play state, persistence actions, pure play-form decisions, more than a dozen UI components, and completed-game reporting. The screen works, but a developer must understand unrelated concerns before safely changing one part of the live workflow. The refactor must preserve the approved mobile-first sequence and cannot change baseball scoring rules.

## Goals / Non-Goals

**Goals:**

- Make the section entry point read as a small composition of named product states.
- Keep live form state and actions together in a custom hook with a business-meaning API.
- Keep pure play-form decisions outside React so they remain independently testable.
- Give substantial UI responsibilities their own modules and keep imports narrow.
- Preserve existing visible behavior and source-contract coverage.

**Non-Goals:**

- Changing scoring, RBI, runner movement, pinch-runner, correction, or inning-transition rules.
- Restyling the screen or changing the approved Stats Entry information order.
- Reworking `gameEngine.ts` or unrelated large sections in the same diff.
- Introducing a generic component framework or new dependency.

## Decisions

### Use a feature-local module tree

Stats Entry-specific components, hooks, types, and decisions will live under `src/sections/StatsEntrySection`. Shared completed-game display components that already have consumers outside Stats Entry will live under `src/components`.

This keeps local concepts close to the screen while preventing the section entry point from becoming a public grab bag. A project-wide generic `hooks` or `utils` folder was rejected because it would hide feature ownership.

### Extract by responsibility, not by line count alone

The section entry point will own state gating. A live-entry component will compose the approved screen order. A custom hook will own interactive state and persistence actions. Pure functions will own derived decisions. Presentational components will receive explicit props and avoid reaching into storage.

Arbitrary one-function-per-file extraction was rejected for tiny helpers because it creates navigation overhead without clarifying ownership. Small related pure decisions may share one focused module.

### Preserve client boundaries deliberately

Only modules that use hooks, event handlers, or browser APIs will declare `"use client"`. Pure decision modules remain normal TypeScript, and the App Router page remains a thin server-compatible route wrapper where possible.

### Preserve behavior with contract and workflow tests

Existing source-contract tests will be updated to inspect the new owner modules. Game-engine tests remain the authority for scoring behavior. Lint, typecheck, unit tests, and production build must pass before completion.

## Risks / Trade-offs

- [Risk] Moving code can accidentally change closure or reset behavior → Keep the hook API close to the existing state transitions and run live-game tests plus typecheck.
- [Risk] Excessive prop plumbing can make components noisy → Pass cohesive view models and named callbacks only where several values naturally belong together.
- [Risk] Source-contract tests can become coupled to file paths → Point each assertion at the module that owns the behavior and avoid aggregating unrelated source into one test fixture.
- [Risk] A project-wide cleanup would create an unsafe, unreviewable diff → Apply the pattern first to the largest product-critical React surface and document the boundary so later sections can migrate independently.

## Migration Plan

1. Add extracted modules while keeping existing exports available from their new canonical paths.
2. Update internal and external imports.
3. Remove the moved implementations from the original section.
4. Update ownership-focused tests.
5. Run verification and an independent compliance review.

Rollback is a normal source revert because no persisted data or public API changes.

## Open Questions

- None for this slice. Other large sections should be migrated in separate OpenSpec changes after this boundary is proven.

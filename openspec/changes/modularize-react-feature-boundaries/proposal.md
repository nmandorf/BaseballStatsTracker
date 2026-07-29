## Why

Several completed product surfaces still concentrate screen orchestration, local decisions, and substantial presentation trees in single React files. The behavior is covered and working, but the files are slow to review and make otherwise small UI changes carry unnecessary context.

## What Changes

- Keep each major screen or form entry module focused on state orchestration and composition.
- Extract substantial, reusable or feature-local presentation responsibilities into named components.
- Extract pure view decisions and formatting from React modules when they form a coherent boundary.
- Preserve existing routes, labels, mobile-first layouts, persistence, scoring, authentication, schedule, lineup, roster, and defense behavior.
- Repair the test-file ownership issue so manual login acceptance notes are not executed as JavaScript.

## Capabilities

### New Capabilities

- `react-feature-boundaries`: Defines maintainable composition boundaries across the app's major React features.

### Modified Capabilities

- None. This is a behavior-preserving maintainability change.

## Impact

- Affected code: large hand-written React modules for authentication/team selection, roster, schedule, game setup, batting order, defense, and player editing.
- APIs and data: no public API, persistence, database, or game-engine contract changes.
- Dependencies: no new runtime dependencies.


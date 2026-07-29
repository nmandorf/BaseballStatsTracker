## Why

The live Stats Entry implementation currently concentrates orchestration, interactive state, presentation, and completed-game reporting in one 1,500-line React file. Applying small, purpose-specific component and hook boundaries will make the highest-pressure game workflow easier to understand and change without altering approved scoring behavior.

## What Changes

- Keep the Stats Entry section as a thin state gate and screen composer.
- Move live-play interaction state and actions into a dedicated custom hook.
- Move pure preview, validation, correction, and pinch-runner decisions into focused non-React modules.
- Give each substantial UI responsibility its own small component file.
- Move completed-game reporting components out of the live-entry section.
- Update source-contract tests to follow the new ownership boundaries.
- Preserve the existing mobile-first flow, scoring rules, persistence, navigation, and rendered labels.

## Capabilities

### New Capabilities

- `react-module-boundaries`: Defines focused ownership boundaries for the live Stats Entry React implementation while preserving its approved behavior.

### Modified Capabilities

- None. Existing product requirements remain unchanged.

## Impact

- Affected code: `src/sections/StatsEntrySection`, extracted Stats Entry hooks/components, completed-game stats components, and the source-contract tests that assert their ownership.
- APIs and data: no public route, persistence, database, or game-engine contract changes.
- Dependencies: no new runtime or development dependencies.

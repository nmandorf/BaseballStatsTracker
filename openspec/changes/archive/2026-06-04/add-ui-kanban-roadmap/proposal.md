## Why

The project manager can already push roadmap work to the Kanban board, but it does not track when external UI work is ready to be added. Adding a UI intake signal lets the Kanban board capture design/UI implementation work without turning it into baseball feature logic prematurely.

## What Changes

- Add project-manager awareness of a committed UI intake artifact.
- Add a Kanban roadmap item for reviewing and integrating approved UI assets.
- Keep MCP and design-provider credentials local and out of tracked source.
- Update tests so dry-run and duplicate detection cover the new roadmap item.

## Capabilities

### New Capabilities
- `project-manager-ui-intake`: Covers how project-manager tooling detects UI intake artifacts and creates Kanban-ready work for them.

### Modified Capabilities
- None.

## Impact

- `scripts/project-manager.mjs`
- `test/project-manager.test.mjs`
- OpenSpec specs for project-manager UI intake
- Optional ignored local MCP configuration outside tracked source

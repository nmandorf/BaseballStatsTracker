# Delete Team Permanently With Confirmation

## Why

The roster's `Clear Team` action currently removes only local browser state and does so immediately. An accidental tap hides the team locally while leaving the team and its related records in the database.

## What Changes

- Require an explicit destructive confirmation before deleting a team.
- Delete the signed-in account's matching team from the database, including related records through existing cascade relationships.
- Clear local team and game state only after the database confirms deletion.
- Keep the team intact and show a useful error when permanent deletion fails.

## Non-Goals

- No bulk deletion across multiple teams.
- No soft-delete or restore workflow.
- No changes to roster, lineup, or live-game scoring behavior outside deletion cleanup.

## Impact

- Affected spec: `team-onboarding-flow`
- Affected code: roster confirmation UI, active-team client persistence, team API route, backend team persistence, and focused tests.

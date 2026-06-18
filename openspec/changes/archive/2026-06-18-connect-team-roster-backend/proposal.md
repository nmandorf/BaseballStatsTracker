## Why

Team onboarding currently creates the team and players only in browser storage.
That lets the first-run flow work on one device, but it does not actually use
the Prisma backend that already exists for teams and players. Users need the
team they create and the players they add to be persisted server-side so roster,
game setup, batting order, and stats entry can continue from backend data after
reloads or future sync work.

## What Changes

- Add backend-backed team creation for the onboarding gate.
- Add backend-backed player creation for onboarding and roster management.
- Load an existing backend team into the active team mirror when available.
- Keep local storage as a resilient client mirror when the backend is
  unavailable, without changing live stats entry behavior.

## Capabilities

### Modified Capabilities

- `team-onboarding-flow`: Team creation and adding players now persist through
  the backend in addition to the local active-team mirror.

## Impact

- Affected specs: `team-onboarding-flow`.
- Affected code: Prisma backend helpers, Next.js route handlers, active team
  storage/sync helpers, onboarding gate, and roster add-player flow.
- Affected UX: creating a team or adding a player shows saving feedback and
  remains usable if the backend request fails.

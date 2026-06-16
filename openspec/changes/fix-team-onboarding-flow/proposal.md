## Why

The current app direction assumes an existing seeded team, but the real first-run
flow should start empty so the analyst can create their own team and roster.
This change makes team setup the first required step and captures enough player
profile and starting-stat data for useful lineup recommendations later.

## What Changes

- Remove the first-run assumption that an existing team is already available to
  roster, game setup, batting order, and stats entry screens.
- Add an empty-state onboarding flow that requires the user to create a team
  before using team-dependent app areas.
- Add roster creation during onboarding so the user can enter players, speed,
  experience/profile notes, handedness/position details, and starting offensive
  stats.
- Add a later roster-management path for adding players to an existing team
  after onboarding is complete.
- Preserve the mobile-first app flow and avoid implementing new live stats
  entry or scoring logic before this OpenSpec change is approved.

## Capabilities

### New Capabilities

- `team-onboarding-flow`: Covers first-run team creation, initial roster/player
  setup with starting stats and profile data, empty-state routing, and adding
  players to a team after setup.

### Modified Capabilities

- None.

## Impact

- Affected specs: new `team-onboarding-flow` capability.
- Affected code: app shell/navigation guards, roster/team setup screens, shared
  team/player data model types, local seed/default data handling, and any
  Prisma persistence hooks used for teams and players.
- Affected UX: first-run users must create a team before reaching team-dependent
  workflows; existing team users can continue into roster, game setup, batting
  order, and stats entry after a team exists.

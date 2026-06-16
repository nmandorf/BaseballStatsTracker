## 1. Data Foundation

- [x] 1.1 Read the relevant Next.js 16 App Router guide in `node_modules/next/dist/docs/` before editing app routes or client boundaries.
- [x] 1.2 Add shared team/onboarding types for active team identity, player profile input, optional experience/profile notes, and starting offensive stats.
- [x] 1.3 Add a team roster persistence helper that can load, save, subscribe to, and reset a user-created active team without falling back to seeded players.
- [x] 1.4 Add legacy detection so previous seed-only local state is treated as incomplete setup rather than migrated into the active team.
- [x] 1.5 Update live game state creation so it derives lineup and stats from the active team when one exists and returns a no-team state when setup is incomplete.

## 2. Onboarding UI

- [x] 2.1 Build a mobile-first team setup gate that asks for a team name when no user-created team exists.
- [x] 2.2 Build a reusable player form for name, speed rating, active status, optional bats, throws, primary position, experience/profile notes, contact notes, role hint, and starting stats.
- [x] 2.3 Add initial roster setup that lets the user create one or more players after team creation.
- [x] 2.4 Default every starting stat field to zero and allow users to expand or edit starting stats only when needed.
- [x] 2.5 Require at least one player before finishing onboarding and unlocking team-dependent workflows.

## 3. Route And Screen Integration

- [x] 3.1 Gate roster, game setup, batting order, and stats entry behind the active-team check.
- [x] 3.2 Update roster to show the user-created team name, player count, active count, player profile data, and starting/current stats.
- [x] 3.3 Update game setup to select active players from the user-created team instead of seeded players.
- [x] 3.4 Update batting order to recommend from the active team's players and starting stats without adding new ranking rules.
- [x] 3.5 Update stats entry to show the setup gate when no team exists and to use the active team's lineup once setup is complete.

## 4. Roster Management After Setup

- [x] 4.1 Add an Add Player action to roster management for existing teams.
- [x] 4.2 Reuse the onboarding player form for post-onboarding player creation.
- [x] 4.3 Persist newly added players to the active team without replacing existing players or changing saved team identity.
- [x] 4.4 Remove or quarantine user-facing `Mavericks`, seeded-player, and `Reset First Game` copy that implies a default team exists.

## 5. Verification

- [x] 5.1 Add or update tests for team roster persistence, zero-stat defaults, non-zero starting stat saves, and seed-only state handling.
- [x] 5.2 Verify the first-run flow manually on a mobile viewport: create team, add player, enter starting stats, finish onboarding, and reach roster.
- [x] 5.3 Verify adding a player after onboarding makes that player available to roster, game setup, and batting order.
- [x] 5.4 Run `yarn lint`, `yarn typecheck`, and relevant tests before completing implementation.

## Context

The app currently presents a seeded first-game team from `src/lib/seedTeam.ts`
and rebuilds missing local game state from that seed in
`src/lib/firstGameStorage.ts`. Roster, game setup, batting order, and stats
entry therefore assume a playable team already exists.

The new flow needs to start from no team, guide the analyst through creating a
team and initial players, and keep team-dependent routes unavailable until that
setup exists. The implementation must stay mobile-first and should not add new
live scoring behavior as part of this change.

## Goals / Non-Goals

**Goals:**

- Replace seeded-team first-run behavior with an explicit team creation flow.
- Let the user add initial roster players with identity, speed, experience or
  profile notes, role/contact hints, and starting offensive stats.
- Let the user add more players to the same team later from roster management.
- Ensure roster, game setup, batting order, and stats entry all read from the
  user-created team instead of test seed data.
- Preserve zero-stat defaults while allowing non-zero starting stats for teams
  that already have history.

**Non-Goals:**

- Do not implement new at-bat scoring, runner movement, RBI, or lineup ranking
  behavior beyond consuming the team/player data needed for existing screens.
- Do not add authentication, multi-team account switching, import/export, or
  cloud sync unless already supported by the current persistence layer.
- Do not keep the seeded `Mavericks` roster as the default user-visible team.

## Decisions

1. Model onboarding as a team-state gate, not as a separate product tour.

   Team-dependent routes should check whether a user-created team exists. If no
   team exists, they show or route to the team setup experience with a focused
   create-team action. This keeps the app practical during game-day use and
   avoids a marketing-style onboarding layer.

   Alternative considered: keep a demo team and add a "replace team" button.
   That preserves existing screens but makes it too easy to accidentally score
   against placeholder players, which is the problem this change is solving.

2. Store team setup separately from transient first-game scoring state.

   Team, roster, player profile fields, and starting season stats should live in
   a team roster store or Prisma-backed team/player records. Live game state can
   continue to derive its lineup and `statsByPlayerId` snapshot from the active
   roster for now. Existing `firstGameStorage` should no longer create a seeded
   team when no durable team exists.

   Alternative considered: continue using `GameState.lineup` as the source of
   truth for roster data. That couples roster management to one game snapshot
   and makes later add-player behavior brittle.

3. Treat seeded data as development/demo data only.

   Implementation should remove imports of `seedPlayers` and `testTeamName`
   from user-facing first-run paths. If legacy local storage contains only the
   previous seeded team shape and no user-created team marker, the app should
   treat the user as not onboarded and ask them to create a team.

   Alternative considered: migrate the seeded roster into a user team. That
   would preserve local demos but violates the requested "clear out the existing
   team" behavior.

4. Use one player form pattern for initial roster setup and later additions.

   Initial setup can render multiple compact player cards or rows, while roster
   management can open the same form in an add-player sheet or modal. Required
   fields should be minimal: name and speed. Optional fields include bats,
   throws, primary position, experience/profile note, contact notes, role hint,
   active status, and starting stat values.

   Alternative considered: separate onboarding and roster forms. That increases
   duplication and risks divergent validation for the same player fields.

## Risks / Trade-offs

- Existing local users may lose the prior demo roster on reset or first load →
  Treat old seeded state as disposable placeholder data and keep this behavior
  explicit in empty-state copy.
- Asking for every stat at onboarding may slow first use → Default every stat to
  zero and allow the analyst to expand starting stats only when they have prior
  history to enter.
- Team creation touches several routes at once → Centralize the team existence
  check and keep screens consuming a common roster/team source.
- Prisma already has team/player/stat models but the live UI currently uses
  local state → Implement through the current persistence path first, then map
  to Prisma helpers where available without changing live scoring semantics.

## Migration Plan

1. Add or update team roster persistence so an empty app has no active team.
2. Replace seeded first-run state creation with a team-required empty state.
3. Build the mobile-first team setup flow and shared player form.
4. Wire existing roster, game setup, batting order, and stats entry screens to
   the created team.
5. Add a roster action for adding players after onboarding.
6. Remove or quarantine user-facing seeded-team labels and reset behavior.

Rollback: restore the previous seeded-state fallback in `firstGameStorage` and
re-enable the seed-team imports in user-facing screens.

## Open Questions

- Should experience be a structured field, free-text notes, or both? The first
  implementation can use a simple optional profile note unless product direction
  requires a fixed scale.
- Should users be allowed to finish onboarding with zero players, or should at
  least one player be required? The recommended behavior is to require at least
  one player before team-dependent routes unlock.

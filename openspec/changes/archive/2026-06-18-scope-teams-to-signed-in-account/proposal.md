# Scope Teams To Signed-In Account

## Why

Teams are currently persisted in the backend, but they are not tied to the
Firebase account that created them. A user can create a team on one device and
then sign in on another device without a reliable account-scoped team list to
load from, leaving the local browser mirror as the apparent source of truth.

## What Changes

- Store the creating Firebase account identity on backend team records.
- Filter signed-in team lists and team loads to the current account.
- Send the signed-in account identity with team, roster, and first-game sync
  requests.
- Preserve the local active-team mirror as an offline fallback only.

## Non-Goals

- No new batting, runner movement, or lineup recommendation behavior.
- No multi-member team sharing or role-based permissions.
- No Firebase Admin token verification in this change.

## Impact

- Affected specs: `team-authentication`, `team-onboarding-flow`,
  `first-game-functional-app`
- Affected code: `prisma/schema.prisma`, `src/app/api/team`,
  `src/app/api/first-game`, `src/lib/teamBackend.ts`,
  `src/lib/teamStorage.ts`, `src/lib/prismaBackend.ts`

# Add Signed-In Team Selection

## Why

After sign-in, analysts need to choose which team they are working on instead
of being dropped into whichever team was last stored locally. They also need a
fast way to create a new team and have that team immediately persisted to the
database so roster and stats changes have a stable backend team record.

## What Changes

- Add a signed-in team selection experience to the login flow.
- List the teams currently available from the Prisma backend.
- Allow signed-in users to create a new team from the same screen.
- Save the selected or newly created team as the active team for the app.
- Ensure newly created teams are persisted with a current season record so
  later roster and stat updates can write to the database.

## Non-Goals

- No team membership permission model.
- No Firebase Admin server-side token verification.
- No changes to slowpitch stat calculations or runner movement rules.
- No schema migration for user ownership.

## Impact

- Affected specs: `team-authentication`
- Affected code: `src/app/login`, `src/app/api/team`, `src/components/*`,
  `src/lib/teamBackend.ts`, `src/lib/teamStorage.ts`

# Add Firebase Google Auth

## Why

Team stats should only be available after the analyst signs in. Firebase
Authentication with Google sign-in provides a familiar, low-friction login flow
without changing the baseball stat entry logic.

## What Changes

- Add Firebase client configuration through `NEXT_PUBLIC_` environment
  variables.
- Add a `/login` route with FirebaseUI configured for Google sign-in.
- Show signed-in user status and sign-out from the app header.
- Require authentication before rendering team stat app sections.

## Non-Goals

- No team membership authorization model.
- No server-side session cookies or Firebase Admin token verification.
- No database ownership migration.
- No changes to stat calculation, runner movement, or lineup recommendation
  logic.

## Impact

- Affected specs: `team-authentication`
- Affected code: `src/app/layout.tsx`, `src/app/login`, `src/components/*`,
  `src/lib/firebase.ts`, `.env.example`

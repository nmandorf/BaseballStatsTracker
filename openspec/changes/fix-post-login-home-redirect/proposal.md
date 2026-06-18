# Fix Post-Login Home Redirect

## Why

Signing out while viewing a protected Game route leaves the browser on that route. The next sign-in can therefore appear to default to Game, even though returning to Game is correct when the user deliberately selected it.

## What Changes

- Make Home the default destination after sign-in and team selection when no protected destination was intentionally selected.
- Return to a protected page, including Game, when the user deliberately opens it and then signs in.
- Return to Home after sign-out so the old Game route does not become the next login's accidental starting point.
- Keep redirect sanitization available for login surfaces that intentionally provide an explicit destination.

## Non-Goals

- No changes to Firebase providers, team persistence, game setup, lineup logic, or Stats Entry behavior.
- No changes to the mobile navigation layout.

## Impact

- Affected specs: `team-authentication`
- Affected code: `src/components/AuthGate/index.tsx`, `src/components/AuthStatus/index.tsx`, `src/components/FirebaseLogin/index.tsx`, `src/lib/authNavigation.ts`, and focused auth navigation tests.

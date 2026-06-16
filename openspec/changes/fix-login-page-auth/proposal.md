## Why

Signed-out users currently land on the app home experience instead of a clear login-first screen, which makes first use confusing and weakens the auth gate. Google sign-in is also blocked in the current environment by Firebase `auth/unauthorized-domain`, so the change needs to pair UI fixes with the Firebase project configuration needed for OAuth.

## What Changes

- Make the first page a signed-out user sees behave like a mobile-first login page, with clear options for Google sign-in and email account sign-in or sign-up.
- Preserve the signed-in path into the team stats app after authentication and team selection.
- Handle Firebase OAuth domain configuration explicitly so Google login works on the local and deployed app origins.
- Improve login error handling/copy so unauthorized-domain failures tell the developer or owner what domain must be added in Firebase.
- Keep this change scoped to authentication and first-load presentation; do not add new stat tracking, lineup, runner movement, or baseball scoring behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `team-authentication`: Require the root signed-out experience to route to or render the login-first auth flow, and require actionable handling for Firebase unauthorized-domain errors.
- `home-page-foundation`: Clarify that the game-day home/dashboard experience is shown only after the signed-in auth path is satisfied, while signed-out first load presents login instead of the home dashboard.

## Impact

- Affected code: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/components/FirebaseLogin/index.tsx`, `src/components/AuthProvider/index.tsx`, `src/components/AuthGate/index.tsx`, and any home/login sections needed to support the first-load auth experience.
- Affected configuration: Firebase Console Authentication settings for authorized domains, plus `.env.example` or project documentation if the deployed domain needs to be documented for setup.
- Affected tests/verification: first-load signed-out route behavior, login page rendering, Google/email FirebaseUI options, unauthorized-domain messaging, signed-in redirect/team-selection flow, and mobile layout checks.
- No database schema changes are expected.

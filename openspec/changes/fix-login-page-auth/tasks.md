## 1. Orientation

- [x] 1.1 Read the relevant `node_modules/next/dist/docs/` guide for the route/rendering APIs touched by the login-first root change.
- [x] 1.2 Review the existing auth and home files: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/components/FirebaseLogin/index.tsx`, `src/components/AuthProvider/index.tsx`, `src/components/AuthGate/index.tsx`, and `src/screens/Home/index.tsx`.
- [x] 1.3 Confirm the Firebase providers and domains needed for the current environment: Google provider enabled, Email/Password provider enabled, and the current browser host listed in Firebase Console Authentication authorized domains.

## 2. Auth-First Root Flow

- [x] 2.1 Add a client-safe root entry decision that waits for Firebase auth state before showing either the login-first experience or the signed-in home experience.
- [x] 2.2 Ensure signed-out visits to `/` present the same Google, email login, and email account-creation options available on `/login`.
- [x] 2.3 Ensure signed-in visits to `/` render the existing game-day home experience without requiring a second login.
- [x] 2.4 Preserve sanitized `next` redirect behavior so successful sign-in returns users to the intended team stats route without open redirects or loops.

## 3. Login Page and Error Handling

- [x] 3.1 Update login copy and layout so the first viewport clearly reads as a login page for Baseball Stat Tracker, with mobile-first tap targets and no protected team data.
- [x] 3.2 Keep FirebaseUI configured for Google sign-in and add explicit email/password controls for existing-account login and new-account creation.
- [x] 3.3 Add actionable handling for Firebase `auth/unauthorized-domain`, telling the developer or owner to add the current host in Firebase Console Authentication authorized domains.
- [x] 3.4 Keep auth error messages safe by excluding secrets, private config, tokens, and raw provider payloads.

## 4. Firebase Setup Documentation

- [x] 4.1 Document the Firebase Console steps needed to fix Google OAuth: open Firebase Console, select the project, go to Authentication, enable Google and Email/Password providers if needed, then add the app host under Settings > Authorized domains.
- [x] 4.2 Document expected authorized hosts for local development, including `localhost` and `127.0.0.1` if both are used.
- [x] 4.3 Add a placeholder or note for the stable deployed hostname once it is known, and explain that preview hostnames must also be authorized if Google sign-in is tested there.

## 5. Verification

- [x] 5.1 Run the relevant Yarn validation scripts available in `package.json`.
- [x] 5.2 Verify `/` as a signed-out user shows the login-first experience and does not show protected team stats data.
- [x] 5.3 Verify `/login` shows Google, email login, and email account-creation options and supports the existing signed-in team selection path.
- [x] 5.4 Verify a protected route still shows an auth prompt for signed-out users and links to `/login`.
- [x] 5.5 Verify mobile and desktop layouts for `/` and `/login` with browser screenshots or equivalent visual checks.
- [x] 5.6 Run a separate sub-agent/code-compliance review against `AGENTS.md`, `docs/engineering-principles.md`, this OpenSpec change, mobile-first UI direction, and Stats Entry product constraints.

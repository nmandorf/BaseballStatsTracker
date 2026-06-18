## Context

The app already has Firebase client setup, an `AuthProvider`, a `/login` route, a `FirebaseLogin` component, and protected team routes. The current root route still renders the home experience directly, so a signed-out first visit does not feel like an intentional login screen even though protected areas are gated. The reported Google OAuth failure is Firebase `auth/unauthorized-domain`, which is caused when the browser origin used for sign-in is not listed in the Firebase project's Authentication authorized domains.

This change should stay inside the existing Next.js app structure and UI system. It should not introduce new baseball tracker feature logic before an approved OpenSpec change covers that behavior.

## Goals / Non-Goals

**Goals:**

- Make `/` login-first for signed-out users while keeping the signed-in user path into the team stats workspace.
- Keep `/login` as the explicit login route and support both Google sign-in and email account sign-in/sign-up through FirebaseUI.
- Show useful, safe feedback for Firebase auth startup and OAuth domain failures.
- Document or surface the Firebase Console setup required to authorize the local and deployed domains used by the app.
- Verify the login experience on mobile-first layouts and confirm the protected routes still require a signed-in Firebase user.

**Non-Goals:**

- Do not add team membership authorization, server-side Firebase Admin verification, session cookies, or role-based access.
- Do not change Prisma schema, team stat persistence, lineup logic, runner movement, RBI logic, or Stats Entry behavior.
- Do not replace FirebaseUI with a custom credential form unless the existing component cannot meet the requirements.
- Do not commit private Firebase secrets or provider credentials.

## Decisions

1. Use the existing FirebaseUI-based auth flow instead of building a custom auth form.
   - Rationale: FirebaseUI already supports Google and email/password flows, including account creation for new email users, and keeps provider-specific edge cases in the external library.
   - Alternative considered: implement custom Google and email/password controls with Firebase SDK methods. This would create more UI and state-handling surface for the same user-facing capability.

2. Make the signed-out root route route to or render the login-first experience.
   - Rationale: The user's first-load requirement is about the first page a signed-out user sees, not a new dashboard capability. Reusing `/login` keeps one auth surface and avoids duplicating sign-in behavior.
   - Alternative considered: keep `/` as home and add a larger login card inside home. This leaves the signed-out first load mixed with dashboard/navigation content and makes the auth path less direct.

3. Preserve signed-in dashboard access after auth state resolves.
   - Rationale: The existing home-page foundation remains useful for authenticated game-day context. Auth loading should avoid briefly showing the wrong screen while Firebase resolves the current user.
   - Alternative considered: always redirect `/` to `/login`. This would force signed-in users through the login/team-selection surface unnecessarily.

4. Treat `auth/unauthorized-domain` as both an app-message concern and an external Firebase configuration task.
   - Rationale: Code cannot authorize a domain for a Firebase project at runtime. Implementation should catch or recognize the error and tell the developer or owner to add the current host in Firebase Console > Authentication > Settings > Authorized domains.
   - Alternative considered: change only code-side auth flow settings. That would not fix OAuth on an untrusted origin.

5. Authorize exact hosts used for development and deployment.
   - Rationale: Firebase Auth checks the sign-in origin. The project owner should add the host used in the browser, such as `localhost`, `127.0.0.1` if used, and the production or preview deployment host without protocol or path.
   - Alternative considered: rely only on the default Firebase auth domain. That supports the Firebase project callback domain but not necessarily every app origin where users initiate OAuth.

## Risks / Trade-offs

- Firebase auth state can be unknown on initial render -> Use an explicit loading state before deciding whether `/` should show login or the signed-in home experience.
- Redirect loops between `/` and `/login` -> Keep `next` parameters sanitized and ensure signed-in users are not redirected back to login after team selection unless explicitly requested.
- Firebase unauthorized-domain cannot be fixed in source code alone -> Add a clear implementation task and developer-facing guidance for the Firebase Console configuration.
- Email sign-in/sign-up labels are partly controlled by FirebaseUI -> Prefer FirebaseUI configuration and surrounding copy over brittle DOM manipulation.
- Preview deployments can use many hostnames -> Document that every active preview or production host used for Google sign-in must be authorized, or use a stable deployment domain for auth testing.

## Migration Plan

1. Implement the auth-first root behavior and login UI/error copy changes on this branch.
2. Add or update documentation for Firebase authorized domains and provider setup.
3. In Firebase Console, enable the Google and Email/Password providers if needed and add the current app hosts under Authentication authorized domains.
4. Verify locally with `yarn` scripts: lint/typecheck/build as available, plus browser checks for `/`, `/login`, and one protected route.
5. Rollback by reverting the route/UI changes; Firebase Console authorized-domain additions are non-destructive and can remain unless they are no longer trusted.

## Open Questions

- What is the deployed production hostname that should be documented as required in Firebase authorized domains?
- Should preview deployment hostnames be supported individually, or should Google sign-in testing happen only on `localhost` and the stable production domain?

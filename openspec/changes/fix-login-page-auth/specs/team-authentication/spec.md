## MODIFIED Requirements

### Requirement: Firebase Sign-In Options
The app SHALL provide a Firebase Authentication login screen for Google sign-in and explicit email/password controls for both existing-account login and new-account creation.

#### Scenario: User opens the login screen
- **WHEN** the user visits `/login`
- **THEN** the app renders a FirebaseUI Google sign-in flow
- **AND** Google is offered as a sign-in provider
- **AND** the app shows an explicit email/password Log in control for existing users
- **AND** the app shows an explicit Create account control for new email users
- **AND** successful sign-in returns the user to the team stats app

### Requirement: Team Stats Auth Gate
The app SHALL require a signed-in Firebase user before showing team stats areas.

#### Scenario: Signed-out user opens a protected team stats route
- **WHEN** the user is not signed in
- **AND** the user opens Roster, Game Setup, Batting Order, or Stats Entry
- **THEN** the app shows a sign-in prompt instead of team data
- **AND** the prompt links to `/login`

## ADDED Requirements

### Requirement: Login-First Root Entry
The app SHALL present a login-first experience to signed-out users who open the root route.

#### Scenario: Signed-out user opens the root route
- **WHEN** the user is not signed in
- **AND** the user visits `/`
- **THEN** the first screen presents the Firebase login experience
- **AND** the screen offers Google sign-in, email login, and email account creation
- **AND** the screen does not expose protected team stats data

#### Scenario: Signed-in user opens the root route
- **WHEN** the user is signed in
- **AND** the user visits `/`
- **THEN** the app shows the signed-in team stats home experience
- **AND** the app does not require the user to sign in again

### Requirement: Firebase OAuth Domain Guidance
The app SHALL provide actionable guidance when Google sign-in fails because the current domain is not authorized for Firebase OAuth.

#### Scenario: Google sign-in starts from an unauthorized domain
- **WHEN** Firebase returns `auth/unauthorized-domain` during Google sign-in
- **THEN** the login screen shows a safe error message
- **AND** the message tells the developer or project owner to add the current host in Firebase Console Authentication authorized domains
- **AND** the message does not expose secrets or Firebase private configuration

#### Scenario: Developer configures Firebase OAuth domains
- **WHEN** the app is prepared for local or deployed Google sign-in
- **THEN** project documentation identifies that the browser host used for sign-in must be listed in Firebase Console Authentication authorized domains
- **AND** the documented hosts include local development and the stable deployed app host when those hosts are known

## MODIFIED Requirements

### Requirement: Firebase Sign-In Options
The app SHALL provide a Firebase Authentication login screen for Google sign-in and explicit email/password controls for both existing-account login and new-account creation.

#### Scenario: User completes sign-in without an intentional destination
- **WHEN** the user signs in and selects a team
- **AND** no login surface intentionally supplies an explicit destination
- **THEN** the app opens Home
- **AND** the app does not reuse a protected route left behind by an earlier sign-out

#### Scenario: User selects a protected destination before signing in
- **WHEN** a signed-out user opens a protected page such as Game
- **AND** the page sends the user to sign in with an explicit local destination
- **THEN** successful sign-in navigates to that destination
- **AND** external or protocol-relative destinations fall back to Home

#### Scenario: User signs out from a protected page
- **WHEN** a signed-in user signs out while viewing Game or another protected page
- **THEN** the app navigates to Home
- **AND** a later sign-in does not default to the previously open protected page

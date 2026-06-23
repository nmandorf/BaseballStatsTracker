## ADDED Requirements

### Requirement: Account Team Visibility

The signed-in home page SHALL show the teams owned by the current account in place of the static game checklist.

#### Scenario: Signed-in user has teams

- **WHEN** a signed-in user with a selected team opens `/`
- **THEN** the home page lists the teams available to that account
- **AND** the currently selected team is clearly identified
- **AND** each team row shows its roster size

#### Scenario: The account has more teams than fit beside Game Day

- **WHEN** the team rows would make the desktop side column taller than the Game Day card
- **THEN** the teams card remains aligned with the bottom of the Game Day card
- **AND** the team rows can be scrolled within the card

#### Scenario: Team data is loading or unavailable

- **WHEN** the account team request is pending or cannot return teams
- **THEN** the card shows a clear loading or empty state without hiding the Game Day content

#### Scenario: User starts creating another team

- **WHEN** a signed-in user selects New team from the Your Teams card
- **THEN** the app opens the existing signed-in team workspace
- **AND** the new-team form is available without duplicating team-creation behavior on the home page

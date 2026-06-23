## ADDED Requirements

### Requirement: Confirmed Permanent Team Deletion

The app SHALL require confirmation before permanently deleting the active team and SHALL keep browser and database state consistent.

#### Scenario: Open deletion confirmation

- **WHEN** the user selects `Clear Team` from roster management
- **THEN** the app opens a destructive confirmation dialog naming the active team
- **AND** no local or database data is deleted before confirmation
- **AND** the user can cancel and return to the unchanged roster

#### Scenario: Confirm permanent deletion

- **WHEN** the user confirms permanent deletion
- **THEN** the backend verifies that the team belongs to the current account
- **AND** the backend deletes the team and its related database records
- **AND** the app clears local team and game state only after the backend confirms deletion
- **AND** the app returns to the team creation empty state

#### Scenario: Database deletion fails

- **WHEN** the user confirms deletion but the backend cannot delete the team
- **THEN** the app keeps the local team and game state intact
- **AND** the confirmation dialog shows a useful retryable error
- **AND** the user can cancel without losing data

#### Scenario: Account does not own requested team

- **WHEN** a deletion request names a team outside the current account
- **THEN** the backend does not delete that team
- **AND** the API returns a stable not-found response without exposing another account's team details

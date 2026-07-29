## ADDED Requirements

### Requirement: Major React features use focused ownership boundaries

The application SHALL keep major feature entry modules focused on state orchestration and composition, while substantial forms, cards, lists, dialogs, and pure view decisions are owned by purpose-specific modules.

#### Scenario: Developer inspects a major feature entry module

- **WHEN** a developer opens authentication, roster, schedule, game setup, batting order, defense, or player-form entry code
- **THEN** the primary workflow and state ownership are visible without reading every presentation detail
- **AND** substantial independent presentation responsibilities are delegated to named modules

#### Scenario: User completes an existing workflow

- **WHEN** a user signs in, selects or creates a team, edits the roster, manages the schedule, prepares a lineup, records defense, or edits a player
- **THEN** existing behavior, validation, persistence, labels, routes, and mobile-first ordering remain unchanged

### Requirement: Manual acceptance notes are not executable tests

Manual acceptance documentation SHALL use a non-executable documentation format, while executable browser tests SHALL live in the E2E test suite.

#### Scenario: Project unit tests run

- **WHEN** the unit-test runner scans the `test` directory
- **THEN** manual login acceptance notes are not parsed as JavaScript
- **AND** missing private E2E credentials do not prevent unrelated project verification


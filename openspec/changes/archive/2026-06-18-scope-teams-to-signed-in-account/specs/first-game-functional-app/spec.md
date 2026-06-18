## ADDED Requirements

### Requirement: Account-Scoped First Game Sync
The app SHALL sync the active first-game snapshot through the signed-in
account's selected backend team.

#### Scenario: User saves game progress on one device
- **WHEN** a signed-in user saves first-game progress for the selected team
- **THEN** the backend stores the snapshot under that account team
- **AND** another device signed into the same account and team can load the
  latest snapshot

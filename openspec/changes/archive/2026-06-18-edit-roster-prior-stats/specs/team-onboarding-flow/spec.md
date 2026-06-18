## ADDED Requirements

### Requirement: Edit Existing Player Prior Stats

The app SHALL let the user edit prior offensive stats for a player after the team and player have been created.

#### Scenario: Open prior stats editor

- **WHEN** the user selects `Edit Prior Stats` for an existing roster player
- **THEN** the app opens a mobile-friendly modal populated with that player's saved baseline season stats
- **AND** stats from the currently tracked game are not included in the editable baseline

#### Scenario: Save prior stats

- **WHEN** the user changes prior games, batting outcomes, runs, or RBI and saves
- **THEN** the app derives Hits from singles, doubles, triples, and home runs
- **AND** the app derives At-Bats from hits, reached on error, fielder's choice, and outs
- **AND** the app derives Plate Appearances from at-bats, walks, and sacrifice flies
- **AND** the updated stats are saved to the existing player without changing player identity or other roster members
- **AND** the update is sent through the existing backend team persistence path when available

#### Scenario: Edit while a game exists

- **WHEN** prior stats are changed while an active or completed local game state references that player
- **THEN** the player's lineup baseline is updated
- **AND** saved plays, current-game stats, score, outs, and bases remain unchanged

#### Scenario: Cancel prior stats edit

- **WHEN** the user cancels the prior stats editor
- **THEN** the modal closes without changing the player's saved stats


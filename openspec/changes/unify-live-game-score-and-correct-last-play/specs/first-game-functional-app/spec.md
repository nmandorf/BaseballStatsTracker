## ADDED Requirements

### Requirement: Correct Latest Saved Offensive Play

The app SHALL let the analyst replace the most recently saved offensive play while the same offensive half-inning remains active.

#### Scenario: Replace an out with a home run

- **WHEN** the analyst opens the latest saved play in the active offensive half, changes an Out to HR, and saves
- **THEN** the original out and out type are removed
- **AND** the home run, run, RBI choice, score, outs, bases, player stats, and next batter are recalculated from the state before that play
- **AND** the saved play count does not increase

#### Scenario: Replace a home run with an out

- **WHEN** the analyst opens the latest saved play in the active offensive half, changes HR to an Out with an out type, and saves
- **THEN** the original home run, run, and RBI are removed
- **AND** the out, out type, score, outs, bases, player stats, and next batter are recalculated from the state before that play
- **AND** the saved play count does not increase

#### Scenario: Older play is not editable inline

- **WHEN** later offensive plays have already been saved after a batter's earlier appearance
- **THEN** that older appearance remains read-only in the batting-order strip
- **AND** the app does not silently change the current batter or append a duplicate correction

#### Scenario: Analyst cancels a correction

- **WHEN** the analyst enters correction mode and selects Cancel
- **THEN** the live game state remains unchanged
- **AND** scoring returns to the current batter


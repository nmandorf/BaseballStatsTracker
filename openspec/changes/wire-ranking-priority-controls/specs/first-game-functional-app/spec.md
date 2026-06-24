## MODIFIED Requirements

### Requirement: Batting Order Recommendation
The app SHALL recommend a batting order using simple amateur slowpitch stats and
approved review priorities.

#### Scenario: Coach selects a ranking priority
- **WHEN** the coach selects a ranking-priority chip on the Batting Order screen
- **THEN** the suggested lineup is recalculated for the selected priority
- **AND** the visible lineup row signal reflects the selected priority
- **AND** manual lineup moves are cleared so the regenerated recommendation is
  visible before coach approval

#### Scenario: Coach reviews ranking-priority controls
- **WHEN** the coach opens the Batting Order screen on a desktop viewport
- **THEN** the ranking-priority panel spans the full review width
- **AND** each ranking-priority chip fills the panel width

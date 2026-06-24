## MODIFIED Requirements

### Requirement: Female Leadoff League Rule
The app SHALL generate league-compliant lineup recommendations with a female
player batting first whenever the active player pool allows it.

#### Scenario: Active lineup includes female players
- **WHEN** the app generates a recommended batting order
- **THEN** lineup slot 1 is the active female player with the strongest
  stats-based lineup score
- **AND** every other player remains ranked by the approved slowpitch stats
  priorities unless spacing female players or protecting the female leadoff
  wraparound requires a local adjustment

#### Scenario: Female leadoff has an available male wraparound hitter
- **WHEN** the app generates a recommended batting order with a female leadoff
  hitter
- **AND** at least one male hitter is available after the leadoff spot
- **THEN** the final lineup slot is assigned to a male hitter so the male hitter
  bats directly before the female leadoff hitter when the order turns over
- **AND** the selected final hitter causes the smallest practical disruption to
  female spacing and the generated stats-based order

#### Scenario: Edited lineup misses male wraparound hitter
- **WHEN** the coach edits a generated lineup that has a female leadoff hitter
- **AND** at least one male hitter is available after the leadoff spot
- **AND** the final lineup slot is not assigned to a male hitter
- **THEN** the app warns that a male hitter should bat directly before the
  female leadoff hitter to maximize the two-base walk rule
- **AND** the app keeps female-leadoff league compliance separate from this
  optimization warning

#### Scenario: No active female player is available
- **WHEN** the selected active players do not include an eligible female player
- **THEN** the app shows a clear warning that the generated lineup cannot satisfy
  the league rule
- **AND** the app does not claim that the lineup is league-compliant

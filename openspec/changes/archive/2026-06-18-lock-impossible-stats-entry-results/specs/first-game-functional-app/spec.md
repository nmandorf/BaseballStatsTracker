## ADDED Requirements

### Requirement: Current-State Result Locking
The Stats Entry screen SHALL lock batter result options that are impossible for
the current base and out state before the analyst saves a play.

#### Scenario: Bases are empty
- **WHEN** there are no runners on base
- **THEN** Sac Fly, Fielder's Choice, and Double Play are locked
- **AND** hit, walk, reached-on-error, home run, and ordinary out results remain selectable

#### Scenario: Sac fly is possible only with a runner on third
- **WHEN** there is a runner on 3B and fewer than two outs
- **THEN** Sac Fly is selectable
- **AND** when 3B is empty or there are two outs, Sac Fly is locked

#### Scenario: Double play requires a runner and fewer than two outs
- **WHEN** at least one base is occupied and there are fewer than two outs
- **THEN** Double Play is selectable
- **AND** when bases are empty or there are two outs, Double Play is locked

#### Scenario: Fielder's choice requires a runner
- **WHEN** at least one base is occupied
- **THEN** Fielder's Choice is selectable
- **AND** when bases are empty, Fielder's Choice is locked

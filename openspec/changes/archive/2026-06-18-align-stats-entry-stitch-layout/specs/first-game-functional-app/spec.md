## ADDED Requirements

### Requirement: Stitch-Aligned Stats Entry Layout
The Stats Entry screen SHALL present live scoring in the Stitch MCP mobile
layout order while keeping the analyst on the current batter screen.

#### Scenario: Live scoring screen order
- **WHEN** a game is active and the analyst opens Stats Entry
- **THEN** the screen shows, from top to bottom, the game situation header,
  batting order strip, current batter card, batter result buttons, compact
  occupied runners-on-base panel, conditional RBI controls, after-play summary,
  and sticky Undo / Save Play + Next Batter controls
- **AND** the layout uses the Stitch visual direction: warm off-white app
  background, field-green primary action, amber current batter highlight,
  restrained red out/destructive states, compact cards, and large tap targets

#### Scenario: Runners panel stays compact
- **WHEN** bases are occupied
- **THEN** only occupied base rows are shown with editable movement controls
  and pinch runner actions
- **AND** no separate runner advancement screen is introduced

#### Scenario: Bases are empty
- **WHEN** no bases are occupied
- **THEN** the runners panel shows "Bases empty"

# Change: Unify pregame accept actions

## Why

The batting order and starting defense currently use different commit language and different save paths. Coaches can see a saved defense locally while the backend still rejects game start, and the Start Game action is embedded inside the batting order card even though it depends on both offense and defense preparation.

## What Changes

- Present offense and defense preparation with the same action pattern: Generate, Reset, Accept.
- Treat Accept as the backend-confirmed save for both the batting order and starting defense.
- Keep Start Game as a standalone action outside the offense and defense cards.
- Keep game start locked until the accepted batting order and accepted first-fielding-half defense are both backend-confirmed and the scheduled start window is open.

## Non-goals

- Changing lineup recommendation logic, defensive assignment logic, live scoring, or stats calculations.
- Adding new baseball scoring rules.

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: Batting Order screen, suggested lineup card, starting defense card, pregame persistence helpers, and focused tests

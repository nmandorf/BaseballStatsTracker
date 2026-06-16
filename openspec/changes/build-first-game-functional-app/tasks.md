## 1. Product / OpenSpec / Kanban

- [x] Consult PM on first-game MVP scope.
- [x] Create OpenSpec change for functional first-game app.
- [x] Extend project manager Kanban signals for functional MVP milestones.
- [x] Apply Kanban updates after implementation signals are present.

## 2. Domain Logic

- [x] Add 10-player first-game seed team with zeroed stats.
- [x] Add stats calculation helpers for AVG, OBP, SLG, OPS, XBH%, and Out%.
- [x] Add batting order recommendation logic.
- [x] Add live game state engine for result, runner, RBI, pinch runner, save,
  undo, score, outs, bases, and next batter.
- [x] Add Prisma baseball models matching the first-game entities.

## 3. App Screens

- [x] Update roster screen to show seeded team and zeroed first-game stats.
- [x] Update game setup to use the seeded active players and first-game rules.
- [x] Update batting order to use the recommendation engine.
- [x] Update stats entry to use the shared live game state engine.

## 4. Verification

- [x] Add focused tests for project manager and domain logic where practical.
- [x] Run `yarn lint`.
- [x] Run `yarn typecheck`.
- [x] Run `yarn prisma:validate`.
- [x] Run `yarn test`.
- [x] Run `yarn build`.

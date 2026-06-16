## 1. OpenSpec

- [x] 1.1 Create a focused OpenSpec change for gender-aware lineup rules.
- [x] 1.2 Document roster gender capture and lineup recommendation behavior.

## 2. Roster Data

- [x] 2.1 Add a required player gender field with Female and Male options to
  player profile types.
- [x] 2.2 Add the gender selection to initial roster setup and add-player/edit
  player forms.
- [x] 2.3 Persist gender through local storage, backend APIs, and Prisma player
  records.
- [x] 2.4 Handle existing saved players with a migration/default prompt that
  asks the user to set missing gender before generating a compliant lineup.

## 3. Lineup Rules

- [x] 3.1 Update lineup recommendation so slot 1 is the highest-ranked active
  female player.
- [x] 3.2 Rank all remaining players by the approved stats-based lineup score,
  then place remaining female players as close to their earned value as
  possible while avoiding back-to-back female hitters when feasible.
- [x] 3.3 Add warnings for no active female player, missing gender on selected
  players, or coach-edited lineups that violate the female leadoff rule.
- [x] 3.4 Add tests for female leadoff, female distribution, unavoidable
  back-to-back female hitters, missing gender, and no-active-female cases.

## 4. Verification

- [x] 4.1 Run `yarn typecheck`.
- [x] 4.2 Run `yarn test`.
- [x] 4.3 Run `yarn lint`.

## 1. Domain And Persistence

- [x] 1.1 Add an `OutType` domain type with `GROUNDOUT`, `FLYOUT`, `LINEOUT`, `STRIKEOUT_LOOKING`, `STRIKEOUT_SWINGING`, and `OTHER_OUT`.
- [x] 1.2 Add optional `outType` support to scored play and at-bat data shapes while preserving existing main batter results.
- [x] 1.3 Add a nullable Prisma `AtBat.outType` field and matching `OutType` enum if persisted at-bat storage is part of the current implementation path.
- [x] 1.4 Update Prisma save/load mapping so normal outs persist the selected out type and non-out results leave it empty.

## 2. Game Engine And Stats

- [x] 2.1 Update the live game engine so selecting `Out` cannot save a finalized play until an out type has been selected.
- [x] 2.2 Keep `DP` as a separate result that records double-play behavior without requiring an out type.
- [x] 2.3 Extend player stat aggregation with out-type counters for groundouts, flyouts, lineouts, strikeouts looking, strikeouts swinging, other outs, double plays, and productive outs.
- [x] 2.4 Add calculated strikeout totals/rates, ball-in-play totals/rates, and productive out rate without changing existing AVG, OBP, SLG, OPS, and Out Rate formulas.
- [x] 2.5 Detect productive outs from saved runner movement when a batter out advances a runner, scores a runner, or receives an RBI.

## 3. Stats Entry UI

- [x] 3.1 Create `src/components/OutTypeModal/index.tsx` with `isOpen`, `onSelect`, and `onClose` props.
- [x] 3.2 Create `src/components/OutTypeModal/OutTypeModal.css` with mobile-first modal styling and large tap targets.
- [x] 3.3 Wire the Stats Entry `Out` button to open the modal before generating the ordinary-out play preview.
- [x] 3.4 Close the modal immediately after selection and continue the existing current-batter runner movement, RBI, and summary flow.
- [x] 3.5 Ensure the `DP` button bypasses the out-type modal and continues through the existing double-play flow.

## 4. Lineup Logic

- [x] 4.1 Add small contact and out-quality adjustments to lineup scoring using strikeout rate, ball-in-play rate, productive outs, lineout contact, strikeout penalties, and double-play penalties.
- [x] 4.2 Favor lower-strikeout, higher-ball-in-play players in leadoff, second, and second-leadoff decisions when primary stats are similar.
- [x] 4.3 Penalize double plays more strongly than normal outs, especially for comparable middle-order power candidates.
- [x] 4.4 Avoid stacking multiple high-strikeout hitters in lower-lineup slots when a comparable contact hitter can separate them.
- [x] 4.5 Keep reach-base ability, power, out avoidance, run production, speed, and analyst role hints ahead of out quality in the main recommendation score.

## 5. Verification

- [x] 5.1 Add or update unit tests for out-type basic stat behavior and new calculated contact/out-quality stats.
- [x] 5.2 Add or update game-engine tests proving normal `Out` requires out type while `DP` does not.
- [x] 5.3 Add or update lineup-rule tests for similar-player strikeout-rate tiebreakers, ball-in-play tiebreakers, and double-play penalties.
- [ ] 5.4 Verify the Stats Entry UI flow on mobile width: tap `Out`, choose out type, confirm runner movement, and save play. Blocked: in-app Browser returned `ERR_BLOCKED_BY_CLIENT` for the local dev server on localhost, 127.0.0.1, and the network URL.
- [x] 5.5 Run the project’s Yarn test, lint, or build script that best covers the changed files.

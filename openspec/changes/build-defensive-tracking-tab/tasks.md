## 1. OpenSpec And Domain Scope

- [x] 1.1 Confirm the `defensive-tracking-tab` spec requirements before changing app code.
- [x] 1.2 Read `docs/engineering-principles.md`, `BestPracticesAGENT.md`, and the relevant Next.js docs in `node_modules/next/dist/docs/` before implementation edits.
- [x] 1.3 Keep the implementation scoped to defensive tracking and avoid unrelated app refactors.

## 2. Defensive Domain And Calculations

- [x] 2.1 Add defensive domain types for positions, alignment slots, defensive events, ball types, misplay types, great-play impacts, ratings, and summaries.
- [x] 2.2 Add pure alignment helpers for assigning players, swapping players, moving players, and benching players.
- [x] 2.3 Add pure half-inning helpers that derive batting/fielding phase from `isHome` and `half`.
- [x] 2.4 Add pure defensive stat helpers for chances, routine success rate, misplay rate, great-play rate, extra bases allowed per inning, and defensive innings by position.
- [x] 2.5 Add basic best-fit label helpers using defensive ratings, position innings, defensive event rates, and sample-size context.

## 3. Game Engine And Persistence

- [x] 3.1 Extend live game state with defensive alignments, current defensive event history, defensive ratings/notes references, and backward-compatible default values.
- [x] 3.2 Update offensive save flow to advance from offensive half-innings into defensive half-innings without breaking current batter, bases, score, RBI, or undo behavior.
- [x] 3.3 Add defensive event save flow that updates opponent score, defensive outs, half-inning transitions, alignment context, event history, and undo history.
- [x] 3.4 Normalize missing defensive fields in local storage so existing saved games continue to load.
- [x] 3.5 Include defensive alignments, events, rating references, and notes in the existing first-game snapshot sync where that sync path is available.
- [x] 3.6 Add additive Prisma-ready schema and migration work for defensive alignments, defensive events, and player defensive ratings/notes.

## 4. Defense Setup And Live UI

- [x] 4.1 Add a protected Defense route/page and primary navigation item using the existing app shell and auth/team gate patterns.
- [x] 4.2 Add starting defensive setup after batting-order acceptance and before game start.
- [x] 4.3 Build a mobile-first field alignment editor with P, C, 1B, 2B, SS, 3B, LF, LC, RC, RF, and Bench.
- [x] 4.4 Build defensive inning controls for keeping the same defense, swapping players, moving players, marking players sitting, and adding substitutes.
- [x] 4.5 Build quick defensive event controls for routine out, hit/no play, misplay, great play, extra bases allowed, and double play.
- [x] 4.6 Show clear phase messaging when the user opens Defense while the team is batting.

## 5. Player Profiles And Summaries

- [x] 5.1 Add optional defensive ratings to player profile editing for arm strength, throw accuracy, glove skill, range, and position confidence.
- [x] 5.2 Add defensive notes fields for strengths, weaknesses, best position, avoid position, backup position, communication, injury, or comfort context.
- [x] 5.3 Show defensive summaries on player cards with innings by position, routine plays, great plays, misplays, extra bases allowed, notes, and basic best-fit labels.

## 6. Verification

- [x] 6.1 Add unit tests for home/away half-inning phase and transition behavior.
- [x] 6.2 Add unit tests for defensive event saves, opponent runs, defensive outs, inning advancement, and undo.
- [x] 6.3 Add unit tests for alignment helpers, including swaps, moves, and bench/sit behavior.
- [x] 6.4 Add unit tests for defensive stat calculations and best-fit labels.
- [ ] 6.5 Verify the mobile UI flow: set starting defense, start game, enter a defensive event, save it, advance to offense, and return to defense next inning.
- [ ] 6.6 Run `yarn test`, `yarn lint`, `yarn typecheck`, and `yarn build`.
- [ ] 6.7 Run a separate sub-agent/code-compliance review against `AGENTS.md`, `docs/engineering-principles.md`, OpenSpec artifacts, mobile-first UI direction, and Stats Entry product constraints.
- [x] 6.8 Resolve material compliance findings or document any remaining risks before marking implementation complete.

Verification notes:

- `yarn test`, `yarn lint`, `yarn typecheck`, `yarn build`, Prisma validation, and OpenSpec validation pass.
- Mobile browser verification confirms the public shell loads without an error overlay, console errors, or horizontal overflow and shows only Home, Roster, Game Settings, and Stats. The authenticated live-game flow could not be exercised without signing in.
- A separate compliance reviewer found stale-sync, queued-alignment, and route-test gaps; each finding was addressed with focused logic and regression coverage.

## 7. Locked Game View Follow-Up

- [x] 7.1 Limit primary navigation to Home, Roster, Game Settings, and Stats.
- [x] 7.2 Lock non-game routes while game status is `IN_PROGRESS` and restore navigation after the game ends.
- [x] 7.3 Add a shared in-game Offense/Defense mode control with an End Game action.
- [x] 7.4 Automatically switch routes after a saved third out and after undo restores the opposite phase.
- [x] 7.5 Remove the large top header boxes from Stats, Defense, Batting Order, and Game Settings.
- [x] 7.6 Add focused route/phase tests and rerun project verification.
- [x] 7.7 Run the required compliance review and resolve or document findings.

## 8. Faster Defensive Event Entry

- [x] 8.1 Add pure alignment helpers that resolve a player's position, a position's player, and a ball-type defensive-area suggestion.
- [x] 8.2 Link the defensive event fielder and position controls while preserving manual edits.
- [x] 8.3 Preselect an assigned infield or outfield defender from ball type before the coach manually chooses one.
- [x] 8.4 Move defensive event entry before the alignment editor in mobile and keyboard order.
- [x] 8.5 Add focused tests and rerun project verification.
- [x] 8.6 Run the required compliance review and resolve or document findings.

Follow-up verification notes:

- `yarn test` passes 72 tests; `yarn lint`, `yarn typecheck`, OpenSpec validation, and `git diff --check` pass.
- The production build passed before this focused follow-up. Re-running it afterward was blocked by the account execution limit.
- In-app mobile verification could not be repeated because the browser security policy rejected direct localhost navigation.
- The separate compliance reviewer was invoked but reached the account usage limit before returning findings. A direct review against the required guidance found no material issue; the remaining risk is the unavailable independent review and browser pass.

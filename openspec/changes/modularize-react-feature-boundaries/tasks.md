## 1. Test Ownership

- [x] 1.1 Move manual login acceptance notes out of the JavaScript unit-test tree.
- [x] 1.2 Keep the executable Playwright login flow in the E2E suite and make missing credentials skip safely.

## 2. Feature Boundaries

- [x] 2.1 Extract focused authentication and team-selection presentation modules.
- [x] 2.2 Extract focused roster dialogs and view decisions.
- [x] 2.3 Extract schedule editor model decisions from presentation.
- [x] 2.4 Extract game setup presentation and batting order decision responsibilities.
- [x] 2.5 Extract defensive event form decisions from presentation.
- [x] 2.6 Extract reusable player-form fields and focused field groups.

## 3. Verification

- [x] 3.1 Validate this OpenSpec change.
- [x] 3.2 Run lint, typecheck, unit tests, Prisma validation, and production build.
- [x] 3.3 Run a separate compliance review against project instructions, engineering principles, OpenSpec, mobile-first direction, and Stats Entry constraints.
- [x] 3.4 Resolve material findings and record the final size/health results.

Final result: the compliance re-review passed with no material findings. Fallow
reports 92/A health. The principal controller/entry modules are now 92 lines for
Stats Entry, 129 for Schedule Editor, 146 for Defense, 159 for Game Setup, 194
for Roster, 124 for Player Form, 226 for Firebase Login, and 298 for Batting
Order.

## 4. Section Decomposition Continuation

- [x] 4.1 Re-audit every module under `src/sections` for independent presentation, state, action, and decision boundaries.
- [x] 4.2 Split Roster, Game Setup, Game Settings, Header, Defense event entry, and Batting Order into focused section-local modules.
- [x] 4.3 Preserve established section imports through compatibility facades and update source-contract tests to inspect the canonical extracted modules.
- [x] 4.4 Run the full verification suite and a separate compliance review.

Continuation result: every `src/sections` file was re-audited. The full 165-test
suite, lint, typecheck, Prisma validation, production build, strict OpenSpec
validation, and three-browser login E2E pass. Fallow health reports 91/A. The
independent re-review passed after the Defense ordering source-contract test was
updated to inspect its canonical composition owner.

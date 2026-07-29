# File Modularity Audit

## Scope and method

This audit covers every hand-written TypeScript, TSX, JavaScript, and MJS file in
`src`, `scripts`, `test`, and `e2e`, plus the root code configuration files.
Generated Prisma output, dependencies, build output, and archived/generated
artifacts are excluded because they are not maintained source.

Each file was checked by:

1. a repository-wide line-count and responsibility scan;
2. import/export, reachability, cycle, duplication, and complexity analysis;
3. deeper manual review for files over 300 lines and files flagged by static
   analysis; and
4. targeted tests after every extracted boundary.

The complete per-file record is in
[`file-modularity-inventory.md`](./file-modularity-inventory.md).

## Refactors applied

| Original responsibility hub | Before | After | Extracted focused modules |
| --- | ---: | ---: | --- |
| `src/lib/gameEngine.ts` | 1,710 | 801 | play rules, movement rules, play validation, game stats, completed games, team totals, defensive state, snapshots |
| `src/lib/defenseEngine.ts` | 1,256 | 559 | constants, event summaries, assignment optimizer |
| `src/lib/scheduleBackend.ts` | 1,212 | 454 | game preparation backend |
| `src/lib/prismaBackend.ts` | 1,168 | 608 | snapshot mappers and snapshot stat persistence |
| `scripts/project-manager.mjs` | 918 | 538 | declarative project overview and roadmap planning |
| `src/lib/teamStorage.ts` | 742 | 604 | player creation and team normalization |
| `src/lib/lineupRules.ts` | 689 | 533 | lineup gender validation |
| `src/lib/firstGameStorage.ts` | 672 | 568 | stored game-state normalization |
| `src/lib/pregameSetupStorage.ts` | 658 | 382 | pure pregame lineup decisions |
| `src/lib/teamBackend.ts` | 574 | 400 | Prisma/team record mappers |
| `src/sections/DefenseSection/DefenseView.tsx` | 587 | 113 | event card, alignment panel, and prompts |
| `src/sections/DefenseSection/DefensiveEventCard.tsx` | 394 | 112 | identity, conditional outcome, and numeric event fields |
| `src/sections/RosterSection/RosterView.tsx` | 311 | 3 | summary, toolbar, and player grid modules |
| `src/sections/RosterSection/RosterDialogs.tsx` | 223 | 8 | player dialogs and destructive-confirmation focus boundary |
| `src/sections/GameSetupSection/GameSetupCards.tsx` | 298 | 42 | details, schedule selector, lineup controls, player selector, and rules card |
| `src/sections/BattingOrderSection/index.tsx` | 298 | 18 | model, actions, view, lineup decisions, and defense decisions |
| `src/sections/GameSettingsSection/index.tsx` | 286 | 60 | scoring-limit and rule-toggle cards |
| `src/sections/HeaderSection/index.tsx` | 223 | 36 | navigation presentation and redirect/scroll hook |

## Intentional larger files

The remaining files over 300 lines were not split merely to meet a line-count
target. They were retained when their contents form one workflow or algorithm
and another boundary would add prop plumbing, duplicate state, or obscure the
business sequence.

| File | Decision |
| --- | --- |
| `src/lib/gameEngine.ts` | Retains the atomic offensive-play transition and correction workflow; supporting policies and persistence are now external. |
| `src/lib/prismaBackend.ts` | Retains transaction orchestration and snapshot record writes; mapping and stat aggregation are external. |
| `src/lib/teamStorage.ts` | Retains one browser-store lifecycle, including cache, hydration, and ordered synchronization. |
| `src/lib/firstGameStorage.ts` | Retains one browser-game persistence lifecycle, including local-first reconciliation and bounded remote retry. |
| `src/lib/defenseEngine.ts` | Retains defensive alignment state operations; optimization, constants, and event analytics are external. |
| `src/lib/lineupRules.ts` | Retains the ranking and role-assignment algorithm; gender compliance is external. |
| `scripts/project-manager.mjs` | Retains CLI inspection, operation proposal/application, environment parsing, and filesystem discovery; roadmap content is external. |
| `src/lib/defensiveAssignmentOptimizer.ts` | One constrained assignment algorithm whose internal scoring state is intentionally colocated. |
| `src/lib/scheduleBackend.ts` | One schedule CRUD and cancellation transaction boundary; game preparation is external. |
| `src/lib/gamePreparationBackend.ts` | One preparation persistence/start authorization workflow; validation and mapping are external. |
| `src/lib/teamBackend.ts` | One team CRUD transaction boundary; serialization is external. |
| `src/lib/pregameLineup.ts` | One pure lineup preparation decision module. |
| `src/lib/prismaSnapshotMappers.ts` | One persistence mapping layer with no orchestration. |
| `src/lib/statCalculations.ts` | One stat formula/update library. |
| `src/components/TeamSetupGate/index.tsx` | One authentication/team-selection state boundary shared across routes. |
| `src/lib/defensiveLineupPlanner.ts` | One full-game defensive rotation planner. |
| `src/sections/StatsEntrySection/useLiveStatsEntry.ts` | One live-play controller that keeps selection, correction, preview, persistence, undo, pinch-runner, and phase transitions atomic; its presentation and pure decision rules are already external. |
| `src/sections/RosterSection/index.tsx` | One roster controller coordinating backend mutations, dialog state, and season-stat persistence; presentation and decisions are external. |
| `src/sections/GameSetupSection/index.tsx` | One pregame controller coordinating schedule selection and lineup generation; all substantial cards are external. |

Large test files remain organized by business workflow so setup and assertions
for the same behavior stay together. Splitting tests by arbitrary line count
would make scenario coverage harder to follow.

## Static-analysis disposition

- No unreachable files, circular dependencies, unresolved imports, boundary
  violations, dependency duplication, or code-clone groups were found.
- Compatibility exports on established facades are retained even when
  production-only reachability analysis marks them unused; tests and existing
  callers import those public entry points.
- Complexity findings were reviewed at the function level. The only critical
  changed-code hotspot, team-player serialization, was reduced by extracting
  defensive-profile construction.
- The repository has zero detected duplicated lines across the analyzed
  production files.

The combined changed-file audit reports a failing dead-export gate solely for
seven compatibility re-exports. Those exports are intentionally retained to
satisfy the approved OpenSpec compatibility requirement. With tests included,
the same audit reports zero complexity findings at the reviewed threshold, no
dead files, and no duplication. The default health scan reports zero critical
complexity, average cyclomatic complexity of 1.9, p90 cyclomatic complexity of
3, and average maintainability of 91.1; its remaining CRAP warnings use
static-estimated zero coverage rather than the passing runtime test suite.

## Boundary rules used

- Pages and route handlers remain thin entry points.
- Components own rendering; hooks own interactive state; pure decision modules
  own business rules.
- Prisma transaction orchestration is separate from record mapping and stat
  aggregation.
- Compatibility facades preserve existing imports while implementation moves
  into focused modules.
- No product behavior, Stats Entry sequence, or mobile-first interaction was
  changed by this audit.

## Section decomposition continuation

Every file under `src/sections` was rechecked. Substantial presentation,
navigation, dialog, form-field, and decision groups were extracted where they
had an independent name and reason to change:

- Roster now composes separate summary, toolbar, player-grid, player-dialog,
  and destructive-confirmation modules.
- Game Setup now composes separate game details, schedule selection, lineup
  controls, active-player selection, and league-rule modules.
- Batting Order now separates state/derivation, user actions, composition,
  lineup decisions, and defensive decisions.
- Defense now separates the event shell from identity, conditional outcome,
  and numeric field groups.
- Game Settings now separates scoring-limit and rule-toggle cards.
- Header now separates navigation presentation from live-game redirect and
  active-mobile-tab behavior.

The Stats Entry controller, Roster controller, Game Setup controller, and small
section entry points were retained after review because they each express one
stateful workflow and already delegate presentation and pure decisions.

## Independent compliance review

The required independent review passed after one project-manager detection
regression was corrected. The detector now recognizes the canonical extracted
final-game component and both active and archived OpenSpec proposals, with a
real-repository regression test confirming the completed roadmap item remains
complete.

The section-continuation review also passed after its one finding was resolved:
the Defense ordering source-contract test now reads `DefenseView.tsx`, the
canonical composition owner, instead of inferring order from concatenated field
files.

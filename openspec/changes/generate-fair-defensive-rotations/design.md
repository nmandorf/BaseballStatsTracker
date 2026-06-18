## Context

Player profiles already store gender, a primary position, global defensive ratings, and best/backup/avoid defensive position notes. Defensive alignments are stored as immutable inning snapshots in game state. The existing default aligns roster order to position order, and later defensive innings copy the most recent snapshot.

## Decisions

1. Keep generation as pure domain logic.

   A deterministic generator receives players, inning context, prior alignments, rover state, and the locked pitcher. UI and persistence call this helper but do not contain placement rules.

2. Treat pitcher continuity and three female defenders as hard constraints.

   The player assigned to Pitcher in the starting defense becomes the locked pitcher, stays at Pitcher, and is never benched. Every valid alignment assigns at least three players whose stored gender is `Female`. If fewer than three female players are available, validation returns a structured issue and the game cannot start with a falsely compliant defense.

3. Treat bench fairness as an optimization.

   Prior saved alignments provide each player's bench count. Players who have already sat receive priority to field in the next inning. A second sit is avoided until comparably eligible players have sat once when pitcher and gender constraints allow. Repeats may be unavoidable over long games or constrained rosters.

4. Rank position fit with explicit, deterministic signals.

   Normalized best and primary positions rank above backup positions. Avoid positions receive a prohibitive penalty unless no legal filled alignment exists. Relevant arm, accuracy, glove, range, and confidence ratings break preference ties. Seed order and current lineup order provide stable final tie-breaks.

5. Generate once per defensive inning and preserve manual review.

   Entering a new defensive half creates and saves a new alignment snapshot. The coach can review and edit it, but the editor prevents changes that move the locked pitcher or reduce assigned female defenders below three. Prior inning snapshots remain unchanged.

6. Keep the UI compact.

   The existing mobile position grid remains. A short status row identifies the locked pitcher, female-defender count, and bench rotation. Bench players show their sit count so fairness is inspectable without adding another screen.

## Risks / Trade-offs

- Free-text legacy position values may not match supported positions -> Normalize common abbreviations and full labels in one domain helper; unknown values remain neutral.
- A greedy assignment can strand a hard-to-fill position -> Apply hard roster constraints before fit scoring and use deterministic candidate evaluation for every slot.
- Manual edits can violate generated guarantees -> Validate inside the editor and again at game start/save boundaries.
- Bench-once cannot always be achieved -> Present it as best-effort and expose sit counts rather than promising an impossible invariant.

## Migration Plan

1. Existing saved games normalize a missing pitcher lock to the player assigned at Pitcher in the earliest alignment.
2. Existing player profile strings remain readable through position normalization.
3. No destructive data migration is required.

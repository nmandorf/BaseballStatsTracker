## Context

The app already has a mobile-first Stats Entry flow, a shared game engine, player stat calculation helpers, lineup recommendation rules, and Prisma models for `AtBat`, `PlayerGameStats`, and `PlayerSeasonStats`. Today the live result model treats ordinary outs as a single `Out` result, which preserves basic stat correctness but loses contact-quality context that matters for amateur slowpitch lineup decisions.

This change adds out detail without changing the main live scoring rhythm. The analyst still taps the simple `Out` result first, then answers a short modal question before runner movement and RBI confirmation continue on the current batter screen.

## Goals / Non-Goals

**Goals:**

- Capture a required out type whenever the analyst records a normal `Out`.
- Keep `DP` as its own result and penalize it separately in lineup scoring.
- Preserve existing basic stat behavior for PA, AB, outs, AVG, OBP, SLG, OPS, runs, and RBI.
- Add derived contact and out-quality stats for strikeout rates, ball-in-play rate, and productive out rate.
- Use out quality as a small lineup tiebreaker for contact-heavy spots and bottom-order balancing.
- Keep the UI fast, modal-based, and mobile-first.

**Non-Goals:**

- Do not add advanced baseball metrics such as exit velocity, sprint speed, pitch-type performance, or barrel rate.
- Do not make out type more important than reaching base, power, or run production.
- Do not require out type selection for double plays.
- Do not implement post-approval product code as part of this proposal step.

## Decisions

1. Store out type separately from the main batter result.

   The main result remains the existing simple result set (`1B`, `2B`, `3B`, `HR`, `BB`, `ROE`, `FC`, `SF`, `Out`, `DP`) while normal outs gain an optional `outType` value. This preserves existing result-based UI and scoring logic while adding enough detail for stats and lineup recommendations.

   Alternative considered: split `Out` into six main result buttons. That would make the live button grid slower and noisier, especially on mobile.

2. Gate `Out` with a quick modal before runner movement preview.

   The `OutTypeModal` component should open immediately after tapping `Out`, present six large options, then close after selection and continue the existing play preview/update flow. This keeps the analyst on the current batter card and avoids a bulky separate screen.

   Alternative considered: show a dropdown in the runner panel after selecting `Out`. That risks saving an incomplete play and makes the required choice easier to miss.

3. Treat out-type stats as derived from recorded plays, with optional counters cached where needed.

   The play record is the source of truth for `outType` and productive-out detection. `PlayerStats` and persisted game/season stat rows can add aggregate fields if needed for performance and display, but calculated helpers should remain able to derive rates safely from available counters.

   Alternative considered: only store aggregate counters and not the play-level out type. That would make audits, game history, and future detail views weaker.

4. Define ball in play from contact-producing outcomes.

   Balls in play include groundouts, flyouts, lineouts, hits, reached on error, and fielder's choice. Strikeouts, walks, other outs, sac flies, and double plays are handled outside this core ball-in-play formula unless future scoring detail explicitly classifies them.

   Alternative considered: include sac flies as fly balls in play. Sac flies already carry separate productive-out/RBI meaning, and keeping them separate avoids double-counting the same value in early scoring.

5. Add out quality as a small lineup adjustment, not a primary score.

   Existing lineup priorities remain OBP/reach-base, out avoidance, SLG/OPS, extra-base hit rate, run production, speed, and analyst role hints. Out quality should mostly affect contact score, out-quality score, low-strikeout leadoff and second-batter preferences, double-play risk for power spots, and bottom-order spacing.

   Alternative considered: heavily reweight the main score around strikeout rate. That would overvalue players who make contact but rarely reach base or drive the ball.

## Risks / Trade-offs

- Required out type selection could add a tap during live entry -> Keep the modal short, large-tap, and auto-closing with no separate route.
- Historical saved plays may not have `outType` -> Treat missing out type on old `Out` plays as unknown/other for derived stats and avoid blocking display.
- Persisted Prisma/generated client changes may require a migration and regeneration -> Add the enum/field in a focused migration and update mapping helpers in the same implementation pass.
- Tiebreaker weights may feel too strong or too weak -> Keep weights small and cover ranking behavior with tests using players with similar reach-base and power stats.
- Productive out detection can be ambiguous -> Define it from saved runner movement: a batter out is productive when a runner advances, scores, or the batter receives an RBI on the play.

## Migration Plan

1. Add an `OutType` domain type and, if persistence is in scope for implementation, add an `OutType` Prisma enum plus nullable `AtBat.outType`.
2. Backfill is not required because existing rows can keep `outType` null.
3. Update save/load mapping so new `OUT` plays persist the selected type while old plays remain readable.
4. Rollback by ignoring the nullable `outType` field in application code; no destructive data migration is needed.

## Open Questions

- Should sac flies eventually count as balls in play for display while remaining separate for productive-out logic?
- Should `DP` gain optional detail later, such as ground-ball double play versus line-drive double play?

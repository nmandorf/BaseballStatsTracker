# Restyle Stats Entry Stitch Layout

## Why

The live Stats Entry screen has the approved scoring engine controls, but its
presentation is still too broad and explanatory for fast mobile use during a
game. The user requested a Stitch-guided mobile-first layout with a strict
top-to-bottom flow that keeps runner confirmation on the current batter screen.

## What Changes

- Rework the in-progress Stats Entry screen into the Stitch mobile flow:
  situation header, batting order strip, current batter card, result buttons,
  compact occupied runners panel, conditional RBI controls, after-play summary,
  and sticky Undo / Save Play + Next Batter controls.
- Keep the runners panel compact by showing occupied base rows only, with a
  clear Bases empty state.
- Keep RBI controls hidden unless the current play preview has scored runs.
- Move the primary save action into a sticky mobile-first action bar.
- Preserve existing scoring, runner movement, pinch runner, RBI default, undo,
  and end-game behavior.

## Non-Goals

- No changes to baseball scoring logic or stat calculations.
- No new data model fields.
- No separate runner advancement screen.
- No new dependencies.

## Stitch Reference

- Project: `projects/12171432897591281052`
- Screen instance: `8697260444590070204`
- Design system asset: `192a7788a35c423aa45dd2519bc18c86`

## Impact

- Affected specs: `first-game-functional-app`
- Affected code: `src/sections/StatsEntrySection/index.tsx`

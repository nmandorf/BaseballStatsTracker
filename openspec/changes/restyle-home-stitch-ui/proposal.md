# Restyle Home UI With Stitch Direction

## Why

The current home UI does not sufficiently match the Stitch MCP / Google app-style direction captured in UI intake. The home page should feel like a mobile-first baseball tracker interface preview rather than a generic landing page.

## What Changes

- Restyle the approved home page scope with a polished mobile app aesthetic.
- Update shared display components so cards, status pills, and links feel consistent.
- Keep all future baseball tracker flows visible as static, non-functional orientation content.
- Preserve the OpenSpec boundary: no stats calculations, runner state, RBI logic, ranking logic, or database writes.

## Impact

- Affected specs: `home-page-foundation`
- Affected code: `src/app/globals.css`, `src/components/*`, `src/sections/*`, `src/pages/Home/*`

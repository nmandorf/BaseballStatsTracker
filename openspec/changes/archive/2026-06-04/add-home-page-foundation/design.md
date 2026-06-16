## Context

The project uses Next.js App Router under `src/app`, Tailwind CSS v4, shadcn-compatible configuration in `components.json`, lucide icons, and a source-owned `cn()` helper. The homepage should be the first screen the user can inspect before the rest of the app is implemented.

## Decisions

- Keep the route component in `src/app/page.tsx` because App Router exposes `/` through that file, and delegate screen assembly to `src/pages/Home/index.tsx`.
- Put larger screen regions in `src/sections` and small reusable display elements in dedicated folders under `src/components`.
- Use static arrays and presentational copy only. No stat calculations, runner movement, RBI rules, lineup ranking, persistence, or database reads are introduced.
- Make the layout mobile-first, then expand to tablet and desktop with responsive grid classes.
- Use existing design-system ingredients: Tailwind utilities, CSS variables, the `cn()` helper, and lucide icons.

## Risks

- Static product copy could look like implemented functionality. Mitigation: label future workflow areas as planned and waiting for later OpenSpec approval.
- Adding files under `src/pages` can create Pages Router routes. Mitigation: keep the public `/` route in `src/app/page.tsx`, and use `src/pages/Home/index.tsx` only as the project page-layer module for composing sections.
- Pulling shadcn registry components may require network. Mitigation: use local source-owned components compatible with the configured aliases and tokens.

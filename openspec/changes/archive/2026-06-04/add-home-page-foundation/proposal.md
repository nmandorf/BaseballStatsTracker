## Why

The app needs a first usable home page that establishes the mobile-first product direction and confirms the project structure before additional baseball tracker screens are built.

## What Changes

- Replace the scaffold landing screen with a mobile-first home page.
- Show static orientation content for app scope, build order, and code organization.
- Keep baseball tracker feature logic out of the homepage.
- Use source-owned React components, sections, Tailwind tokens, shadcn-compatible utilities, and lucide icons already configured in the project.

## Capabilities

### New Capabilities
- `home-page-foundation`: Defines the first home page surface and its boundaries.

### Modified Capabilities
- None.

## Impact

- `src/app/page.tsx`
- `src/components/*`
- `src/sections/*`
- `src/app/globals.css`

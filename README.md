# Baseball Stat Tracker

Mobile-first baseball stat tracker scaffolded with Next.js, TypeScript,
Tailwind CSS, shadcn/ui, Prisma, and PostgreSQL.

## Setup

Install dependencies:

```bash
yarn install
```

Copy `.env.example` to `.env` and fill in local values when needed. The
database target is PostgreSQL, with Neon as the default hosted provider.

Generate the Prisma client:

```bash
yarn prisma:generate
```

Run the development server:

```bash
yarn dev
```

Push the current branch to GitHub:

```bash
yarn push
```

## Project Scripts

```bash
yarn lint
yarn typecheck
yarn prisma:validate
yarn test
yarn pm
```

## OpenSpec

OpenSpec is initialized for Codex and Cursor. Use OpenSpec changes before
building app features so implementation stays aligned with the approved spec.

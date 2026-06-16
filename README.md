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

### Firebase Authentication

The app uses Firebase Authentication for Google and Email/Password sign-in.
In Firebase Console:

1. Open the Firebase project.
2. Go to Authentication.
3. Enable the Google provider.
4. Enable the Email/Password provider.
5. Open Authentication settings and add each browser host used for sign-in
   under Authorized domains.

For local development, authorize `localhost`. Also authorize `127.0.0.1` if
you open the app with that host. For deployed Google sign-in, authorize the
stable production host. Preview deployment hosts must also be added if Google
sign-in will be tested from those preview URLs.

If Google sign-in shows `auth/unauthorized-domain`, the current browser host is
missing from Firebase Authentication authorized domains.

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

## Agent Workflow

Project-specific agent instructions live in `AGENTS.md`. Engineering standards
and the code-review checklist live in `docs/engineering-principles.md`; app
implementation prompts should include a separate sub-agent compliance review
when that capability is available.

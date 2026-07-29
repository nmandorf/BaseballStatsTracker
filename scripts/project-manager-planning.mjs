export function buildProjectOverview(project) {
  const gitSummary = project.gitStatus.available
    ? `${project.gitStatus.changedFiles.length} changed file(s)`
    : "git is not initialized for this workspace";

  return [
    "Baseball Stats Tracker Project Manager",
    "",
    "Project Goal",
    "Build a simple, fast, mobile-friendly baseball/slowpitch softball stats tracking app for a team analyst. The app should manage the roster, guide game setup, recommend batting orders, support fast live stats entry with runner/RBI logic, track player history, and improve lineup decisions over time.",
    "",
    "Product Direction",
    "The experience should feel like a guided workflow, not a spreadsheet.",
    "Primary sections: Roster, Game Setup, Batting Order, Stats Entry, Player Cards / Player Review, and Team Dashboard.",
    "The app should use clear calculations and rules first, with any AI-style analyst layer used only for explanation or optional adjustment.",
    "ClickUp is the source of truth for delivery progress and roadmap tracking.",
    "",
    "Current Repo Signals",
    `Package scaffold: ${formatYesNo(project.hasPackageJson)}`,
    `Project manager CLI: ${formatYesNo(project.hasProjectManagerScript && project.hasClickUpClient)}`,
    `PM tests: ${formatYesNo(project.hasProjectManagerTests)}`,
    `App entrypoint: ${formatYesNo(project.hasAppEntrypoint)}`,
    `Workflow placeholders: ${formatYesNo(project.hasWorkflowPlaceholders)}`,
    `Domain types: ${formatYesNo(project.hasDomainTypes)}`,
    `Lineup rules helper: ${formatYesNo(project.hasLineupRules)}`,
    `Stat calculations helper: ${formatYesNo(project.hasStatCalculations)}`,
    `Prisma scaffold: ${formatYesNo(project.hasPrismaScaffold)}`,
    `UI intake artifact: ${formatYesNo(project.hasUiIntakeArtifact)}`,
    `Functional MVP OpenSpec: ${formatYesNo(project.hasFunctionalMvpOpenSpec)}`,
    `Seed 10-player team: ${formatYesNo(project.hasSeedTeam)}`,
    `Live game engine: ${formatYesNo(project.hasGameEngine)}`,
    `End-game stats summary: ${formatYesNo(project.hasEndGameSummary)}`,
    `First-game local persistence: ${formatYesNo(project.hasFirstGameStorage)}`,
    `Prisma baseball models: ${formatYesNo(project.hasPrismaBaseballModels)}`,
    `Git status: ${gitSummary}`,
    "",
    "Near-Term Focus",
    "Convert placeholders into guided workflow screens.",
    "Finalize the SQL/Prisma data model.",
    "Build roster and game setup first because lineup and stats entry depend on them.",
    "Build fast live stats entry with runner advancement, RBI, game state, and undo logic.",
    "Use player stats and analyst notes to power batting order recommendations."
  ].join("\n");
}

export function buildPlannedWork(project) {
  return [
    {
      name: "Set up project manager CLI",
      complete: hasProjectManagerCli(project),
      markdownContent: [
        "Create the local CLI that reviews repo progress and proposes ClickUp Kanban updates.",
        "",
        "Acceptance:",
        "- `yarn pm` performs a dry-run review.",
        "- `yarn pm -- --apply` applies proposed ClickUp task operations."
      ].join("\n")
    },
    {
      name: "Add project manager CLI tests",
      complete: project.hasProjectManagerTests,
      markdownContent: [
        "Cover the ClickUp request builder, duplicate task matching, dry-run behavior, and apply behavior.",
        "",
        "Acceptance:",
        "- `yarn test` passes locally.",
        "- Dry-run mode performs no ClickUp writes."
      ].join("\n")
    },
    {
      name: "Bootstrap baseball stats tracker app shell",
      complete: project.hasAppEntrypoint,
      markdownContent: [
        "Create the first usable app shell for the baseball stats tracker.",
        "",
        "Acceptance:",
        "- The app opens locally.",
        "- The first screen is the tracker workflow, not a marketing page."
      ].join("\n")
    },
    {
      name: "Add starter domain helpers and workflow placeholders",
      complete: hasStarterDomainWorkflow(project),
      markdownContent: [
        "Add the first project structure for domain types, stat calculations, lineup rules, and the main workflow areas.",
        "",
        "Acceptance:",
        "- Domain type files exist for players, games, stats, and runners.",
        "- Shared helpers exist for stat calculations and lineup rules.",
        "- Workflow areas exist for roster, game setup, batting order, stats entry, and player review."
      ].join("\n")
    },
    {
      name: "Set up Prisma and SQL backend scaffold",
      complete: project.hasPrismaScaffold,
      markdownContent: [
        "Configure Prisma for the SQL backend and keep the generated client out of the authored app surface.",
        "",
        "Acceptance:",
        "- Prisma schema exists.",
        "- Prisma client helper exists.",
        "- Generated Prisma files are ignored by PM project scans."
      ].join("\n")
    },
    {
      name: "Add UI intake to project manager Kanban",
      complete: project.hasUiIntakeArtifact,
      markdownContent: [
        "Capture approved external UI source material so the project manager can add it to the Kanban board without committing provider credentials.",
        "",
        "Acceptance:",
        "- `docs/ui-intake.md` exists and identifies the UI source, scope, constraints, and follow-up work.",
        "- MCP provider API keys stay in local or ignored configuration.",
        "- Generated UI is treated as an input artifact until a matching OpenSpec change approves implementation."
      ].join("\n")
    },
    {
      name: "Define guided app workflow navigation",
      complete: false,
      markdownContent: [
        "Organize the app around the analyst's before-game, during-game, and after-game flow.",
        "",
        "Acceptance:",
        "- Main sections are Roster, Game Setup, Batting Order, Stats Entry, Player Cards / Player Review, and Team Dashboard.",
        "- Users can always tell where they are and what comes next.",
        "- Mobile layout keeps the primary action visible."
      ].join("\n")
    },
    {
      name: "Build roster player management",
      complete: false,
      markdownContent: [
        "Create the permanent team roster that every game, lineup, and stats flow depends on.",
        "",
        "Acceptance:",
        "- Add, edit, and view players.",
        "- Track name, position preferences, batting side, availability, notes, ratings, strengths, and weaknesses.",
        "- Roster data is reusable from game setup and player review."
      ].join("\n")
    },
    {
      name: "Build offensive stats and game history on players",
      complete: false,
      markdownContent: [
        "Attach player performance history to roster records so recommendations improve over time.",
        "",
        "Acceptance:",
        "- Players expose offensive stats and game history.",
        "- Recent performance can be derived.",
        "- Player cards can summarize strengths, weaknesses, and trends."
      ].join("\n")
    },
    {
      name: "Build game setup flow",
      complete: false,
      markdownContent: [
        "Let the analyst create a game and choose who is active before moving into lineup review.",
        "",
        "Acceptance:",
        "- Capture opponent, date, game type, active players, starting lineup, bench players, and notes.",
        "- Make it easy to move from roster selection to batting order review.",
        "- Active player choices drive the available lineup pool."
      ].join("\n")
    },
    {
      name: "Build batting order recommendation engine",
      complete: project.hasLineupRules,
      markdownContent: [
        "Recommend a batting order from ratings, stats, and clear softball/baseball logic.",
        "",
        "Acceptance:",
        "- Consider OBP, batting average, slugging, consistency, power, RBI production, speed/base-running value, recent performance, analyst notes, and reliability.",
        "- Use deterministic calculations and rules first.",
        "- Keep recommendation inputs inspectable."
      ].join("\n")
    },
    {
      name: "Build batting order review and manual lock controls",
      complete: false,
      markdownContent: [
        "Give the analyst final control over the lineup after recommendations are generated.",
        "",
        "Acceptance:",
        "- Analyst can reorder players manually.",
        "- Analyst can lock players into lineup slots.",
        "- App can explain why the suggested order was chosen."
      ].join("\n")
    },
    {
      name: "Build live stats entry screen layout",
      complete: false,
      markdownContent: [
        "Design the Stats Entry screen for fast in-game use with as few taps as possible.",
        "",
        "Acceptance:",
        "- Include game situation header, batting order strip, current batter card, result buttons, compact runner panel, RBI controls, after-play summary, undo, save play, and next batter.",
        "- Layout works comfortably on mobile.",
        "- Primary controls are reachable during live scoring."
      ].join("\n")
    },
    {
      name: "Build batter result tracking",
      complete: false,
      markdownContent: [
        "Record the outcome of each plate appearance and use it to drive stat and runner updates.",
        "",
        "Acceptance:",
        "- Support 1B, 2B, 3B, HR, BB, ROE, FC, SF, Out, and DP.",
        "- Result selection triggers suggested runner movement.",
        "- Analyst can edit before saving."
      ].join("\n")
    },
    {
      name: "Build runner advancement tracking",
      complete: false,
      markdownContent: [
        "Track where every runner started, where they ended, who scored, and who was out.",
        "",
        "Acceptance:",
        "- Runner movement is handled inside the current batter screen.",
        "- Compact visual runner panel or diamond layout is available.",
        "- Runner movement updates runs, RBIs, outs, base state, player value, and future recommendations."
      ].join("\n")
    },
    {
      name: "Build RBI suggestion and override logic",
      complete: false,
      markdownContent: [
        "Only show RBI controls when someone scores and suggest likely RBI credit automatically.",
        "",
        "Acceptance:",
        "- HR credits batter and scoring runners by default.",
        "- Sac fly can credit RBI.",
        "- Error and fielder's choice allow analyst override.",
        "- Analyst can override all auto-suggestions before saving."
      ].join("\n")
    },
    {
      name: "Build live game state engine",
      complete: project.hasGameEngine,
      markdownContent: [
        "Keep the game state correct after every saved play.",
        "",
        "Acceptance:",
        "- Track inning, top/bottom if needed, outs, score, current batter, lineup position, runners on base, saved plays, and undo history.",
        "- Saving a play advances game state automatically.",
        "- Undo restores the previous state."
      ].join("\n")
    },
    {
      name: "Build player stats calculation system",
      complete: project.hasStatCalculations,
      markdownContent: [
        "Store and calculate player stats in a structured way across games and seasons.",
        "",
        "Acceptance:",
        "- Track games played, PA, AB, hits, singles, doubles, triples, HR, walks, runs, RBIs, outs, sac flies, and ROE.",
        "- Calculate batting average, OBP, slugging, OPS, and recent performance.",
        "- Formulas are simple enough for amateur league use and useful for lineup decisions."
      ].join("\n")
    },
    {
      name: "Define SQL and Prisma data models",
      complete: project.hasPrismaBaseballModels,
      markdownContent: [
        "Create the relational data model that supports teams, players, games, lineups, plays, runner movement, stats, notes, and ratings.",
        "",
        "Acceptance:",
        "- Prisma schema includes User, Team, Player, Game, GameLineup, AtBat / Play, RunnerMovement, PlayerStats, Notes / Ratings.",
        "- Relationships match the product flow.",
        "- Schema can support game-level and season-level stat queries."
      ].join("\n")
    },
    {
      name: "Build backend persistence and APIs",
      complete: false,
      markdownContent: [
        "Connect the Next.js app to Prisma-backed persistence for the core workflows.",
        "",
        "Acceptance:",
        "- Roster, game setup, lineup, plays, runner movements, stats, notes, and ratings can be saved and loaded.",
        "- Writes validate required data.",
        "- API/server actions keep client state and database state consistent."
      ].join("\n")
    },
    {
      name: "Create functional first-game OpenSpec",
      complete: project.hasFunctionalMvpOpenSpec,
      markdownContent: [
        "Create the approved OpenSpec slice for the first functional scoring loop.",
        "",
        "Acceptance:",
        "- OpenSpec change exists for first-game functional app work.",
        "- Scope covers seed team, lineup logic, stats entry engine, runner movement, RBI, stats, and data model."
      ].join("\n")
    },
    {
      name: "Seed 10-player first-game test team",
      complete: project.hasSeedTeam,
      markdownContent: [
        "Provide a starter team for the first game of the season.",
        "",
        "Acceptance:",
        "- The app has 10 named active players.",
        "- Every tracked player stat starts at zero.",
        "- Roster, setup, order, and stats entry share the same team data."
      ].join("\n")
    },
    {
      name: "Persist first-game local scoring state",
      complete: project.hasFirstGameStorage,
      markdownContent: [
        "Keep the local first-game state available across refreshes and screen navigation during review.",
        "",
        "Acceptance:",
        "- Saved plays update local browser state.",
        "- Roster and batting order can read updated first-game stats.",
        "- The user can reset to the zero-stat first-game state."
      ].join("\n")
    },
    {
      name: "Build end-game stats summary",
      complete: project.hasEndGameSummary,
      markdownContent: [
        "Let the analyst end the current first game and review the final stats.",
        "",
        "Acceptance:",
        "- Stats Entry has an End Game action.",
        "- Ending the game persists a final state and clears live bases.",
        "- Final score, team totals, saved plays, and player offensive stats are shown.",
        "- Live scoring controls are hidden once the game is final."
      ].join("\n")
    },
    {
      name: "Build player cards and player review",
      complete: false,
      markdownContent: [
        "Create player review screens that help the analyst understand each player's current value.",
        "",
        "Acceptance:",
        "- Show stats, game history, notes, ratings, strengths, weaknesses, and recent performance.",
        "- Make player trends easy to scan.",
        "- Link player review back into lineup decisions."
      ].join("\n")
    },
    {
      name: "Build team dashboard",
      complete: false,
      markdownContent: [
        "Create an after-game and season-level overview for the team analyst.",
        "",
        "Acceptance:",
        "- Show team performance, recent games, leaders, and lineup insights.",
        "- Surface useful next actions.",
        "- Keep the dashboard mobile-friendly and scannable."
      ].join("\n")
    },
    {
      name: "Polish mobile guided workflow UX",
      complete: false,
      markdownContent: [
        "Refine the app so it feels fast, guided, and purpose-built instead of spreadsheet-like.",
        "",
        "Acceptance:",
        "- Core flows are usable on mobile.",
        "- Common actions require minimal taps.",
        "- Empty, loading, and error states guide the analyst forward."
      ].join("\n")
    }
  ];
}

function hasProjectManagerCli(project) {
  return project.hasProjectManagerScript && project.hasClickUpClient;
}

function hasStarterDomainWorkflow(project) {
  return [
    project.hasDomainTypes,
    project.hasLineupRules,
    project.hasStatCalculations,
    project.hasWorkflowPlaceholders
  ].every(Boolean);
}

function formatYesNo(value) {
  return value ? "yes" : "no";
}

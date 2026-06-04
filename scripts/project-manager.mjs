#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClickUpClient } from "./clickup-client.mjs";

export const PM_TASK_NAME = "Project Manager: Baseball Stats Tracker";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

export function normalizeTaskTitle(title) {
  return String(title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function inspectProject(rootDir = repoRoot) {
  const files = listProjectFiles(rootDir);
  const hasAnyAppEntrypoint = files.some((file) =>
    [
      "src",
      "app",
      "pages",
      "components",
      "index.html",
      "main.js",
      "main.ts",
      "main.jsx",
      "main.tsx"
    ].some((entry) => file === entry || file.startsWith(`${entry}/`))
  );

  return {
    rootDir,
    files,
    gitStatus: readGitStatus(rootDir),
    hasPackageJson: files.includes("package.json"),
    hasProjectManagerScript: files.includes("scripts/project-manager.mjs"),
    hasClickUpClient: files.includes("scripts/clickup-client.mjs"),
    hasProjectManagerTests: files.some((file) => file.startsWith("test/") && file.endsWith(".test.mjs")),
    hasAppEntrypoint: hasAnyAppEntrypoint,
    hasPrismaScaffold: files.includes("prisma/schema.prisma") && files.includes("src/lib/prisma.ts"),
    hasDomainTypes: ["src/types/player.ts", "src/types/game.ts", "src/types/stats.ts", "src/types/runner.ts"].every((file) =>
      files.includes(file)
    ),
    hasLineupRules: files.includes("src/lib/lineupRules.ts"),
    hasStatCalculations: files.includes("src/lib/statCalculations.ts"),
    hasWorkflowPlaceholders: [
      "src/pages/Roster/.gitkeep",
      "src/pages/GameSetup/.gitkeep",
      "src/pages/BattingOrder/.gitkeep",
      "src/pages/StatsEntry/.gitkeep",
      "src/pages/PlayerCards/.gitkeep"
    ].every((file) => files.includes(file))
  };
}

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
      complete: project.hasProjectManagerScript && project.hasClickUpClient,
      markdownContent: [
        "Create the local CLI that reviews repo progress and proposes ClickUp Kanban updates.",
        "",
        "Acceptance:",
        "- `npm run pm` performs a dry-run review.",
        "- `npm run pm -- --apply` applies proposed ClickUp task operations."
      ].join("\n")
    },
    {
      name: "Add project manager CLI tests",
      complete: project.hasProjectManagerTests,
      markdownContent: [
        "Cover the ClickUp request builder, duplicate task matching, dry-run behavior, and apply behavior.",
        "",
        "Acceptance:",
        "- `npm test` passes locally.",
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
      complete:
        project.hasDomainTypes &&
        project.hasLineupRules &&
        project.hasStatCalculations &&
        project.hasWorkflowPlaceholders,
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
      complete: false,
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
      complete: false,
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
      complete: false,
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
      complete: false,
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

export function proposeOperations({ tasks, project }) {
  const existingByTitle = new Map();
  for (const task of tasks) {
    const normalized = normalizeTaskTitle(task.name);
    if (normalized && !existingByTitle.has(normalized)) {
      existingByTitle.set(normalized, task);
    }
  }

  const operations = [];
  const doneStatus = findDoneStatus(tasks);
  const overviewMarkdown = buildProjectOverview(project);
  const existingOverview = existingByTitle.get(normalizeTaskTitle(PM_TASK_NAME));

  if (existingOverview) {
    if (existingOverview.description !== overviewMarkdown && existingOverview.text_content !== overviewMarkdown) {
      operations.push({
        type: "update_task",
        reason: "Refresh the project-wide direction and repo signal summary.",
        taskId: existingOverview.id,
        taskName: existingOverview.name,
        patch: {
          description: overviewMarkdown
        }
      });
    }
  } else {
    operations.push({
      type: "create_task",
      reason: "Create the project manager overview task.",
      taskName: PM_TASK_NAME,
      task: {
        name: PM_TASK_NAME,
        description: overviewMarkdown
      }
    });
  }

  for (const item of buildPlannedWork(project)) {
    const existingTask = existingByTitle.get(normalizeTaskTitle(item.name));

    if (!existingTask) {
      operations.push({
        type: "create_task",
        reason: item.complete ? "Track completed scaffold work in ClickUp." : "Add missing roadmap work to the Kanban board.",
        taskName: item.name,
        task: {
          name: item.name,
          markdownContent: item.markdownContent
        }
      });
      continue;
    }

    if (item.complete && doneStatus && !isTaskInDoneStatus(existingTask, doneStatus)) {
      operations.push({
        type: "update_task",
        reason: "Local repo signals show this work is complete.",
        taskId: existingTask.id,
        taskName: existingTask.name,
        patch: {
          status: doneStatus
        }
      });
    }
  }

  return operations;
}

export async function applyOperations(client, operations) {
  const results = [];

  for (const operation of operations) {
    if (operation.type === "create_task") {
      const result = await client.createTask(operation.task);
      results.push({ operation, result });
      continue;
    }

    if (operation.type === "update_task") {
      const result = await client.updateTask(operation.taskId, operation.patch);
      results.push({ operation, result });
      continue;
    }

    throw new Error(`Unsupported operation type: ${operation.type}`);
  }

  return results;
}

export function formatOperations({ project, operations, apply }) {
  const lines = [
    "Baseball Stats Tracker Project Manager",
    "======================================",
    "",
    `Mode: ${apply ? "apply" : "dry-run"}`,
    `Files inspected: ${project.files.length}`,
    `Git: ${project.gitStatus.available ? `${project.gitStatus.changedFiles.length} changed file(s)` : "not initialized"}`,
    "",
    "Proposed ClickUp operations:"
  ];

  if (operations.length === 0) {
    lines.push("- No changes proposed.");
    return lines.join("\n");
  }

  for (const operation of operations) {
    if (operation.type === "create_task") {
      lines.push(`- create task: ${operation.taskName}`);
      lines.push(`  reason: ${operation.reason}`);
      continue;
    }

    if (operation.type === "update_task") {
      const patchFields = Object.keys(operation.patch).join(", ");
      lines.push(`- update task: ${operation.taskName} (${operation.taskId})`);
      lines.push(`  fields: ${patchFields}`);
      lines.push(`  reason: ${operation.reason}`);
    }
  }

  return lines.join("\n");
}

export function validateEnvironment(env = process.env) {
  const missing = [];
  if (!env.CLICKUP_API_TOKEN) {
    missing.push("CLICKUP_API_TOKEN");
  }

  if (!env.CLICKUP_LIST_ID) {
    missing.push("CLICKUP_LIST_ID");
  }

  return missing;
}

export function loadDotEnvFile(rootDir = repoRoot) {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) {
    return {};
  }

  const values = {};
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) {
      values[key] = stripOptionalQuotes(value);
    }
  }

  return values;
}

export async function runProjectManager({
  argv = process.argv.slice(2),
  env = process.env,
  rootDir = repoRoot,
  fetchImpl = globalThis.fetch,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  const apply = argv.includes("--apply");
  const mergedEnv = {
    ...loadDotEnvFile(rootDir),
    ...env
  };
  const missingEnv = validateEnvironment(mergedEnv);

  if (missingEnv.length > 0) {
    stderr.write(
      [
        `Missing required environment variable(s): ${missingEnv.join(", ")}`,
        "",
        "Create a local .env file or export these values in your shell:",
        "  export CLICKUP_API_TOKEN=pk_your_clickup_api_token",
        "  export CLICKUP_LIST_ID=your_clickup_list_id",
        "",
        "Credentials must stay local and should not be committed."
      ].join("\n") + "\n"
    );
    return 1;
  }

  const client = new ClickUpClient({
    token: mergedEnv.CLICKUP_API_TOKEN,
    listId: mergedEnv.CLICKUP_LIST_ID,
    fetchImpl
  });
  const project = inspectProject(rootDir);
  const tasks = await client.getTasks();
  const operations = proposeOperations({ tasks, project });

  stdout.write(formatOperations({ project, operations, apply }) + "\n");

  if (apply && operations.length > 0) {
    const results = await applyOperations(client, operations);
    stdout.write(`\nApplied ${results.length} ClickUp operation(s).\n`);
  } else if (!apply) {
    stdout.write("\nDry-run only. Re-run with `npm run pm -- --apply` to apply these operations.\n");
  }

  return 0;
}

function findDoneStatus(tasks) {
  const statusNames = tasks
    .map((task) => task.status)
    .filter(Boolean)
    .map((status) => (typeof status === "string" ? status : status.status))
    .filter(Boolean);

  return statusNames.find((status) => /^(done|complete|completed|closed)$/i.test(status)) ?? null;
}

function isTaskInDoneStatus(task, doneStatus) {
  const status = typeof task.status === "string" ? task.status : task.status?.status;
  return normalizeTaskTitle(status) === normalizeTaskTitle(doneStatus);
}

function formatYesNo(value) {
  return value ? "yes" : "no";
}

function stripOptionalQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function listProjectFiles(rootDir) {
  const ignoredDirectories = new Set([
    ".git",
    ".next",
    ".vercel",
    "build",
    "coverage",
    "node_modules",
    "out"
  ]);
  const ignoredFiles = [/\.tsbuildinfo$/];
  const files = [];

  function walk(currentDir) {
    for (const entry of readdirSync(currentDir)) {
      if (ignoredDirectories.has(entry)) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry);
      const relativePath = path.relative(rootDir, absolutePath).replaceAll(path.sep, "/");
      const stat = statSync(absolutePath);

      if (stat.isDirectory()) {
        if (relativePath === "src/generated" || relativePath.startsWith("src/generated/")) {
          continue;
        }

        walk(absolutePath);
      } else if (stat.isFile() && !ignoredFiles.some((pattern) => pattern.test(relativePath))) {
        files.push(relativePath);
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

function readGitStatus(rootDir) {
  if (!existsSync(path.join(rootDir, ".git"))) {
    return {
      available: false,
      changedFiles: []
    };
  }

  try {
    const output = execFileSync("git", ["status", "--short"], {
      cwd: rootDir,
      encoding: "utf8"
    });

    return {
      available: true,
      changedFiles: output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    };
  } catch {
    return {
      available: false,
      changedFiles: []
    };
  }
}

if (process.argv[1] === __filename) {
  runProjectManager()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

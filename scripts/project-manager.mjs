#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClickUpClient } from "./clickup-client.mjs";
import {
  buildPlannedWork,
  buildProjectOverview,
} from "./project-manager-planning.mjs";

export {
  buildPlannedWork,
  buildProjectOverview,
} from "./project-manager-planning.mjs";

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
    hasUiIntakeArtifact: files.includes("docs/ui-intake.md"),
    hasFunctionalMvpOpenSpec: files.includes("openspec/changes/build-first-game-functional-app/proposal.md"),
    hasSeedTeam: files.includes("src/lib/seedTeam.ts"),
    hasFirstGameStorage: files.includes("src/lib/firstGameStorage.ts"),
    hasGameEngine: files.includes("src/lib/gameEngine.ts"),
    hasEndGameSummary: hasOpenSpecProposal(files, "add-end-game-summary") &&
      fileIncludesText(rootDir, "src/lib/gameEngine.ts", "export function endGame") &&
      fileIncludesText(
        rootDir,
        "src/components/FinalGameStatsView/index.tsx",
        "export function FinalGameStatsView",
      ) &&
      fileIncludesText(
        rootDir,
        "src/sections/StatsEntrySection/index.tsx",
        "FinalGameStatsView",
      ),
    hasPrismaBaseballModels: fileIncludesText(rootDir, "prisma/schema.prisma", "model RunnerAdvancement"),
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

export function proposeOperations({ tasks, project }) {
  const existingByTitle = mapTasksByNormalizedTitle(tasks);
  const operations = [];
  const doneStatus = findDoneStatus(tasks);
  const overviewOperation = proposeOverviewOperation(existingByTitle, project);

  if (overviewOperation) {
    operations.push(overviewOperation);
  }

  operations.push(...proposePlannedWorkOperations(existingByTitle, buildPlannedWork(project), doneStatus));

  return operations;
}

function mapTasksByNormalizedTitle(tasks) {
  const existingByTitle = new Map();

  for (const task of tasks) {
    addTaskByNormalizedTitle(existingByTitle, task);
  }

  return existingByTitle;
}

function addTaskByNormalizedTitle(existingByTitle, task) {
  const normalized = normalizeTaskTitle(task.name);

  if (normalized && !existingByTitle.has(normalized)) {
    existingByTitle.set(normalized, task);
  }
}

function proposeOverviewOperation(existingByTitle, project) {
  const overviewMarkdown = buildProjectOverview(project);
  const existingOverview = existingByTitle.get(normalizeTaskTitle(PM_TASK_NAME));

  if (!existingOverview) {
    return createOverviewTaskOperation(overviewMarkdown);
  }

  return shouldUpdateOverviewTask(existingOverview, overviewMarkdown)
    ? updateOverviewTaskOperation(existingOverview, overviewMarkdown)
    : null;
}

function createOverviewTaskOperation(overviewMarkdown) {
  return {
    type: "create_task",
    reason: "Create the project manager overview task.",
    taskName: PM_TASK_NAME,
    task: {
      name: PM_TASK_NAME,
      description: overviewMarkdown
    }
  };
}

function updateOverviewTaskOperation(existingOverview, overviewMarkdown) {
  return {
    type: "update_task",
    reason: "Refresh the project-wide direction and repo signal summary.",
    taskId: existingOverview.id,
    taskName: existingOverview.name,
    patch: {
      description: overviewMarkdown
    }
  };
}

function shouldUpdateOverviewTask(existingOverview, overviewMarkdown) {
  return existingOverview.description !== overviewMarkdown && existingOverview.text_content !== overviewMarkdown;
}

function proposePlannedWorkOperations(existingByTitle, plannedWork, doneStatus) {
  const operations = [];

  for (const item of plannedWork) {
    const operation = proposePlannedWorkOperation(existingByTitle, item, doneStatus);
    if (operation) operations.push(operation);
  }

  return operations;
}

function proposePlannedWorkOperation(existingByTitle, item, doneStatus) {
  const existingTask = existingByTitle.get(normalizeTaskTitle(item.name));

  if (!existingTask) {
    return createPlannedWorkOperation(item);
  }

  return shouldMarkPlannedWorkDone(item, existingTask, doneStatus)
    ? updatePlannedWorkDoneOperation(existingTask, doneStatus)
    : null;
}

function createPlannedWorkOperation(item) {
  return {
    type: "create_task",
    reason: item.complete ? "Track completed scaffold work in ClickUp." : "Add missing roadmap work to the Kanban board.",
    taskName: item.name,
    task: {
      name: item.name,
      markdownContent: item.markdownContent
    }
  };
}

function shouldMarkPlannedWorkDone(item, existingTask, doneStatus) {
  return item.complete && doneStatus && !isTaskInDoneStatus(existingTask, doneStatus);
}

function updatePlannedWorkDoneOperation(existingTask, doneStatus) {
  return {
    type: "update_task",
    reason: "Local repo signals show this work is complete.",
    taskId: existingTask.id,
    taskName: existingTask.name,
    patch: {
      status: doneStatus
    }
  };
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
  const lines = buildOperationReportHeader(project, apply);

  if (operations.length === 0) {
    lines.push("- No changes proposed.");
    return lines.join("\n");
  }

  for (const operation of operations) {
    lines.push(...formatOperationLines(operation));
  }

  return lines.join("\n");
}

function buildOperationReportHeader(project, apply) {
  return [
    "Baseball Stats Tracker Project Manager",
    "======================================",
    "",
    `Mode: ${formatApplyMode(apply)}`,
    `Files inspected: ${project.files.length}`,
    `Git: ${formatGitStatus(project.gitStatus)}`,
    "",
    "Proposed ClickUp operations:"
  ];
}

function formatApplyMode(apply) {
  return apply ? "apply" : "dry-run";
}

function formatGitStatus(gitStatus) {
  return gitStatus.available ? `${gitStatus.changedFiles.length} changed file(s)` : "not initialized";
}

function formatOperationLines(operation) {
  if (operation.type === "create_task") {
    return [
      `- create task: ${operation.taskName}`,
      `  reason: ${operation.reason}`
    ];
  }

  return formatUpdateOperationLines(operation);
}

function formatUpdateOperationLines(operation) {
  const patchFields = Object.keys(operation.patch).join(", ");

  return [
    `- update task: ${operation.taskName} (${operation.taskId})`,
    `  fields: ${patchFields}`,
    `  reason: ${operation.reason}`
  ];
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
    assignDotEnvLine(values, line);
  }

  return values;
}

function assignDotEnvLine(values, line) {
  const parsed = parseDotEnvLine(line);

  if (parsed) {
    values[parsed.key] = parsed.value;
  }
}

function parseDotEnvLine(line) {
  const trimmed = line.trim();

  if (shouldSkipDotEnvLine(trimmed)) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const value = stripOptionalQuotes(trimmed.slice(separatorIndex + 1).trim());

  return key ? { key, value } : null;
}

function shouldSkipDotEnvLine(trimmed) {
  return !trimmed || trimmed.startsWith("#");
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

  await writeRunResult({ apply, client, operations, stdout });

  return 0;
}

async function writeRunResult({ apply, client, operations, stdout }) {
  if (shouldApplyOperations(apply, operations)) {
    const results = await applyOperations(client, operations);
    stdout.write(`\nApplied ${results.length} ClickUp operation(s).\n`);
    return;
  }

  if (!apply) {
    stdout.write("\nDry-run only. Re-run with `yarn pm -- --apply` to apply these operations.\n");
  }
}

function shouldApplyOperations(apply, operations) {
  return apply && operations.length > 0;
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

function stripOptionalQuotes(value) {
  if (isQuotedValue(value)) {
    return value.slice(1, -1);
  }

  return value;
}

function isQuotedValue(value) {
  return hasMatchingQuotes(value, '"') || hasMatchingQuotes(value, "'");
}

function hasMatchingQuotes(value, quote) {
  return value.startsWith(quote) && value.endsWith(quote);
}

function fileIncludesText(rootDir, relativePath, text) {
  const absolutePath = path.join(rootDir, relativePath);

  if (!existsSync(absolutePath)) {
    return false;
  }

  return readFileSync(absolutePath, "utf8").includes(text);
}

function hasOpenSpecProposal(files, changeName) {
  const activeProposal = `openspec/changes/${changeName}/proposal.md`;
  const archivedProposalSuffix = `-${changeName}/proposal.md`;

  return files.some((file) => (
    file === activeProposal ||
    (
      file.startsWith("openspec/changes/archive/") &&
      file.endsWith(archivedProposalSuffix)
    )
  ));
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
      visitProjectFileEntry({ currentDir, entry, files, ignoredDirectories, ignoredFiles, rootDir, walk });
    }
  }

  walk(rootDir);
  return files.sort();
}

function visitProjectFileEntry({ currentDir, entry, files, ignoredDirectories, ignoredFiles, rootDir, walk }) {
  if (ignoredDirectories.has(entry)) {
    return;
  }

  const absolutePath = path.join(currentDir, entry);
  const relativePath = path.relative(rootDir, absolutePath).replaceAll(path.sep, "/");
  const stat = statSync(absolutePath);

  if (shouldWalkDirectory(stat, relativePath)) {
    walk(absolutePath);
    return;
  }

  if (shouldIncludeProjectFile(stat, relativePath, ignoredFiles)) {
    files.push(relativePath);
  }
}

function shouldWalkDirectory(stat, relativePath) {
  return stat.isDirectory() && !isGeneratedSourcePath(relativePath);
}

function isGeneratedSourcePath(relativePath) {
  return relativePath === "src/generated" || relativePath.startsWith("src/generated/");
}

function shouldIncludeProjectFile(stat, relativePath, ignoredFiles) {
  return stat.isFile() && !ignoredFiles.some((pattern) => pattern.test(relativePath));
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

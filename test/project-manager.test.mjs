import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  applyOperations,
  buildPlannedWork,
  buildProjectOverview,
  inspectProject,
  loadDotEnvFile,
  normalizeTaskTitle,
  proposeOperations,
  runProjectManager
} from "../scripts/project-manager.mjs";

test("normalizeTaskTitle prevents punctuation and case based duplicates", () => {
  assert.equal(normalizeTaskTitle("Define: Baseball Stats Data Model!"), "define baseball stats data model");
  assert.equal(normalizeTaskTitle("define baseball stats data model"), "define baseball stats data model");
});

test("proposeOperations does not create duplicate tasks with matching normalized names", () => {
  const project = {
    hasPackageJson: true,
    hasProjectManagerScript: true,
    hasClickUpClient: true,
    hasProjectManagerTests: true,
    hasAppEntrypoint: false,
    hasPrismaScaffold: true,
    hasUiIntakeArtifact: true,
    hasDomainTypes: true,
    hasLineupRules: true,
    hasStatCalculations: true,
    hasWorkflowPlaceholders: true,
    files: ["package.json", "scripts/project-manager.mjs", "scripts/clickup-client.mjs", "test/project-manager.test.mjs"],
    gitStatus: { available: false, changedFiles: [] }
  };
  const tasks = [
    { id: "pm", name: "Project Manager: Baseball Stats Tracker", markdown_content: "old", status: { status: "to do" } },
    ...buildPlannedWork(project).map((item, index) => ({
      id: `task-${index}`,
      name: item.name.toLowerCase(),
      status: { status: item.complete ? "done" : "to do" }
    }))
  ];

  const operations = proposeOperations({ tasks, project });

  assert.equal(operations.some((operation) => operation.type === "create_task"), false);
});

test("proposeOperations is idempotent when ClickUp already matches the roadmap", () => {
  const project = createCompleteProjectSignals();
  const tasks = [
    {
      id: "pm",
      name: "Project Manager: Baseball Stats Tracker",
      description: buildProjectOverview(project),
      status: { status: "to do" }
    },
    ...buildPlannedWork(project).map((item, index) => ({
      id: `task-${index}`,
      name: item.name,
      status: { status: item.complete ? "done" : "to do" }
    }))
  ];

  assert.deepEqual(proposeOperations({ tasks, project }), []);
});

test("dry-run prints operations without performing ClickUp writes", async () => {
  const rootDir = createProjectFixture();
  const fetchCalls = [];
  const fetchImpl = async (url, options) => {
    fetchCalls.push({ url, options });
    return jsonResponse({ tasks: [] });
  };
  const stdout = createWritableCapture();
  const stderr = createWritableCapture();

  const exitCode = await runProjectManager({
    argv: [],
    env: {
      CLICKUP_API_TOKEN: "token",
      CLICKUP_LIST_ID: "list-123"
    },
    rootDir,
    fetchImpl,
    stdout,
    stderr
  });

  assert.equal(exitCode, 0);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].options.method, "GET");
  assert.match(stdout.text, /Mode: dry-run/);
  assert.match(stdout.text, /create task: Project Manager: Baseball Stats Tracker/);
  assert.match(stdout.text, /Dry-run only/);
  assert.equal(stderr.text, "");
});

test("apply mode writes proposed ClickUp operations", async () => {
  const calls = [];
  const client = {
    async createTask(task) {
      calls.push({ type: "create", task });
      return { id: "created" };
    },
    async updateTask(taskId, patch) {
      calls.push({ type: "update", taskId, patch });
      return { id: taskId };
    }
  };
  const operations = [
    {
      type: "create_task",
      taskName: "New task",
      task: { name: "New task", markdownContent: "Details" }
    },
    {
      type: "update_task",
      taskId: "task-1",
      taskName: "Old task",
      patch: { status: "done" }
    }
  ];

  await applyOperations(client, operations);

  assert.deepEqual(calls, [
    { type: "create", task: { name: "New task", markdownContent: "Details" } },
    { type: "update", taskId: "task-1", patch: { status: "done" } }
  ]);
});

test("missing env exits with setup instructions before network access", async () => {
  const rootDir = createProjectFixture();
  const stdout = createWritableCapture();
  const stderr = createWritableCapture();
  let fetched = false;

  const exitCode = await runProjectManager({
    argv: [],
    env: {},
    rootDir,
    fetchImpl: async () => {
      fetched = true;
      return jsonResponse({ tasks: [] });
    },
    stdout,
    stderr
  });

  assert.equal(exitCode, 1);
  assert.equal(fetched, false);
  assert.match(stderr.text, /CLICKUP_API_TOKEN/);
  assert.match(stderr.text, /CLICKUP_LIST_ID/);
  assert.equal(stdout.text, "");
});

test("runProjectManager loads ClickUp config from local .env", async () => {
  const rootDir = createProjectFixture();
  writeFileSync(
    path.join(rootDir, ".env"),
    ["CLICKUP_API_TOKEN=token-from-file", "CLICKUP_LIST_ID=list-from-file", ""].join("\n")
  );
  const fetchCalls = [];
  const stdout = createWritableCapture();
  const stderr = createWritableCapture();

  const exitCode = await runProjectManager({
    argv: [],
    env: {},
    rootDir,
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      return jsonResponse({ tasks: [] });
    },
    stdout,
    stderr
  });

  assert.equal(exitCode, 0);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].options.headers.Authorization, "token-from-file");
  assert.match(fetchCalls[0].url, /list-from-file/);
  assert.equal(stderr.text, "");
});

test("loadDotEnvFile parses simple quoted and unquoted values", () => {
  const rootDir = createProjectFixture();
  writeFileSync(
    path.join(rootDir, ".env"),
    ["# local config", "CLICKUP_API_TOKEN='token'", 'CLICKUP_LIST_ID="list"', ""].join("\n")
  );

  assert.deepEqual(loadDotEnvFile(rootDir), {
    CLICKUP_API_TOKEN: "token",
    CLICKUP_LIST_ID: "list"
  });
});

test("inspectProject detects the PM scaffold", () => {
  const rootDir = createProjectFixture();
  const project = inspectProject(rootDir);

  assert.equal(project.hasPackageJson, true);
  assert.equal(project.hasProjectManagerScript, true);
  assert.equal(project.hasClickUpClient, true);
  assert.equal(project.hasProjectManagerTests, true);
});

test("inspectProject detects the UI intake artifact", () => {
  const rootDir = createProjectFixture();

  assert.equal(inspectProject(rootDir).hasUiIntakeArtifact, false);

  addUiIntakeArtifact(rootDir);

  assert.equal(inspectProject(rootDir).hasUiIntakeArtifact, true);
});

test("buildProjectOverview includes the UI intake signal", () => {
  const overview = buildProjectOverview({
    ...createCompleteProjectSignals(),
    hasUiIntakeArtifact: true
  });

  assert.match(overview, /UI intake artifact: yes/);
});

test("inspectProject detects functional first-game MVP signals", () => {
  const rootDir = createProjectFixture();
  mkdirSync(path.join(rootDir, "openspec", "changes", "build-first-game-functional-app"), { recursive: true });
  mkdirSync(path.join(rootDir, "src", "lib"), { recursive: true });
  mkdirSync(path.join(rootDir, "prisma"), { recursive: true });
  writeFileSync(path.join(rootDir, "openspec", "changes", "build-first-game-functional-app", "proposal.md"), "# Build\n");
  writeFileSync(path.join(rootDir, "src", "lib", "seedTeam.ts"), "export const seedPlayers = [];\n");
  writeFileSync(path.join(rootDir, "src", "lib", "gameEngine.ts"), "export {};\n");
  writeFileSync(path.join(rootDir, "src", "lib", "firstGameStorage.ts"), "export {};\n");
  writeFileSync(path.join(rootDir, "prisma", "schema.prisma"), "model RunnerAdvancement { id String @id }\n");

  const project = inspectProject(rootDir);

  assert.equal(project.hasFunctionalMvpOpenSpec, true);
  assert.equal(project.hasSeedTeam, true);
  assert.equal(project.hasGameEngine, true);
  assert.equal(project.hasFirstGameStorage, true);
  assert.equal(project.hasPrismaBaseballModels, true);
});

test("inspectProject detects end-game stats summary signal", () => {
  const rootDir = createProjectFixture();
  mkdirSync(path.join(rootDir, "openspec", "changes", "add-end-game-summary"), { recursive: true });
  mkdirSync(path.join(rootDir, "src", "components", "FinalGameStatsView"), { recursive: true });
  mkdirSync(path.join(rootDir, "src", "lib"), { recursive: true });
  mkdirSync(path.join(rootDir, "src", "sections", "StatsEntrySection"), { recursive: true });
  writeFileSync(path.join(rootDir, "openspec", "changes", "add-end-game-summary", "proposal.md"), "# End Game\n");
  writeFileSync(
    path.join(rootDir, "src", "components", "FinalGameStatsView", "index.tsx"),
    "export function FinalGameStatsView() {}\n",
  );
  writeFileSync(path.join(rootDir, "src", "lib", "gameEngine.ts"), "export function endGame() {}\n");
  writeFileSync(
    path.join(rootDir, "src", "sections", "StatsEntrySection", "index.tsx"),
    "import { FinalGameStatsView } from '../../../components/FinalGameStatsView';\n",
  );

  assert.equal(inspectProject(rootDir).hasEndGameSummary, true);
});

test("inspectProject recognizes the repository end-game summary after component extraction", () => {
  const project = inspectProject(process.cwd());
  const endGameWork = buildPlannedWork(project).find(
    (item) => item.name === "Build end-game stats summary",
  );

  assert.equal(project.hasEndGameSummary, true);
  assert.equal(endGameWork?.complete, true);
});

test("proposeOperations does not duplicate the UI intake roadmap item", () => {
  const project = {
    ...createCompleteProjectSignals(),
    hasUiIntakeArtifact: true
  };
  const tasks = [
    {
      id: "pm",
      name: "Project Manager: Baseball Stats Tracker",
      description: buildProjectOverview(project),
      status: { status: "to do" }
    },
    {
      id: "ui-intake",
      name: "add ui intake to project manager kanban",
      status: { status: "to do" }
    }
  ];

  const operations = proposeOperations({ tasks, project });

  assert.equal(
    operations.some((operation) => operation.type === "create_task" && operation.taskName === "Add UI intake to project manager Kanban"),
    false
  );
});

test("proposeOperations marks existing UI intake item done when artifact exists", () => {
  const project = {
    ...createCompleteProjectSignals(),
    hasUiIntakeArtifact: true
  };
  const tasks = [
    {
      id: "done-reference",
      name: "Already done",
      status: { status: "done" }
    },
    {
      id: "ui-intake",
      name: "Add UI intake to project manager Kanban",
      status: { status: "to do" }
    }
  ];

  const operations = proposeOperations({ tasks, project });

  assert.deepEqual(
    operations.find((operation) => operation.taskId === "ui-intake")?.patch,
    { status: "done" }
  );
});

function createProjectFixture() {
  const rootDir = mkdtempSync(path.join(tmpdir(), "baseball-pm-"));
  mkdirSync(path.join(rootDir, "scripts"));
  mkdirSync(path.join(rootDir, "test"));
  writeFileSync(path.join(rootDir, "package.json"), "{}");
  writeFileSync(path.join(rootDir, "scripts", "project-manager.mjs"), "");
  writeFileSync(path.join(rootDir, "scripts", "clickup-client.mjs"), "");
  writeFileSync(path.join(rootDir, "test", "project-manager.test.mjs"), "");
  return rootDir;
}

function addUiIntakeArtifact(rootDir) {
  mkdirSync(path.join(rootDir, "docs"));
  writeFileSync(path.join(rootDir, "docs", "ui-intake.md"), "# UI Intake\n");
}

function createCompleteProjectSignals() {
  return {
    hasPackageJson: true,
    hasProjectManagerScript: true,
    hasClickUpClient: true,
    hasProjectManagerTests: true,
    hasAppEntrypoint: true,
    hasPrismaScaffold: true,
    hasUiIntakeArtifact: true,
    hasFunctionalMvpOpenSpec: true,
    hasSeedTeam: true,
    hasFirstGameStorage: true,
    hasGameEngine: true,
    hasEndGameSummary: true,
    hasPrismaBaseballModels: true,
    hasDomainTypes: true,
    hasLineupRules: true,
    hasStatCalculations: true,
    hasWorkflowPlaceholders: true,
    files: [
      "package.json",
      "scripts/project-manager.mjs",
      "scripts/clickup-client.mjs",
      "test/project-manager.test.mjs",
      "docs/ui-intake.md",
      "src/app/page.tsx",
      "src/lib/prisma.ts",
      "prisma/schema.prisma"
    ],
    gitStatus: { available: false, changedFiles: [] }
  };
}

function createWritableCapture() {
  return {
    text: "",
    write(chunk) {
      this.text += chunk;
    }
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    }
  };
}

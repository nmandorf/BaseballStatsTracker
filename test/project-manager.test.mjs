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

function createCompleteProjectSignals() {
  return {
    hasPackageJson: true,
    hasProjectManagerScript: true,
    hasClickUpClient: true,
    hasProjectManagerTests: true,
    hasAppEntrypoint: true,
    hasPrismaScaffold: true,
    hasDomainTypes: true,
    hasLineupRules: true,
    hasStatCalculations: true,
    hasWorkflowPlaceholders: true,
    files: [
      "package.json",
      "scripts/project-manager.mjs",
      "scripts/clickup-client.mjs",
      "test/project-manager.test.mjs",
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

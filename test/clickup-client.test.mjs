import assert from "node:assert/strict";
import { test } from "node:test";
import { ClickUpClient } from "../scripts/clickup-client.mjs";

test("ClickUpClient builds paginated list task requests", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ tasks: [] });
  };
  const client = new ClickUpClient({
    token: "token",
    listId: "list-123",
    fetchImpl,
    baseUrl: "https://example.test"
  });

  const tasks = await client.getTasks();

  assert.deepEqual(tasks, []);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://example.test/list/list-123/task?archived=false&include_closed=true&subtasks=true&page=0"
  );
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.Authorization, "token");
});

test("ClickUpClient creates tasks without custom fields", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ id: "abc" });
  };
  const client = new ClickUpClient({
    token: "token",
    listId: "list-123",
    fetchImpl,
    baseUrl: "https://example.test"
  });

  await client.createTask({
    name: "Define baseball stats data model",
    markdownContent: "Model the core records."
  });

  assert.equal(calls[0].url, "https://example.test/list/list-123/task");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    name: "Define baseball stats data model",
    markdown_content: "Model the core records."
  });
});

test("ClickUpClient updates only provided task fields", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ id: "task-1" });
  };
  const client = new ClickUpClient({
    token: "token",
    listId: "list-123",
    fetchImpl,
    baseUrl: "https://example.test"
  });

  await client.updateTask("task-1", {
    status: "done"
  });

  assert.equal(calls[0].url, "https://example.test/task/task-1");
  assert.equal(calls[0].options.method, "PUT");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: "done"
  });
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    }
  };
}

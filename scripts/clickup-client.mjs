const CLICKUP_API_BASE_URL = "https://api.clickup.com/api/v2";

class ClickUpApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "ClickUpApiError";
    this.status = status;
    this.body = body;
  }
}

export class ClickUpClient {
  constructor({ token, listId, fetchImpl = globalThis.fetch, baseUrl = CLICKUP_API_BASE_URL }) {
    if (!token) {
      throw new Error("ClickUpClient requires a token.");
    }

    if (!listId) {
      throw new Error("ClickUpClient requires a listId.");
    }

    if (typeof fetchImpl !== "function") {
      throw new Error("ClickUpClient requires a fetch implementation.");
    }

    this.token = token;
    this.listId = listId;
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getTasks({ includeClosed = true, subtasks = true } = {}) {
    const tasks = [];
    let page = 0;

    while (true) {
      const params = new URLSearchParams({
        archived: "false",
        include_closed: String(includeClosed),
        subtasks: String(subtasks),
        page: String(page)
      });

      const data = await this.request(`/list/${this.listId}/task?${params.toString()}`);
      const batch = Array.isArray(data.tasks) ? data.tasks : [];
      tasks.push(...batch);

      if (batch.length === 0) {
        break;
      }

      page += 1;
    }

    return tasks;
  }

  async createTask({ name, description, markdownContent, status, priority }) {
    const body = buildTaskMutationBody({ name, description, markdownContent, status, priority });

    return this.request(`/list/${this.listId}/task`, {
      method: "POST",
      body
    });
  }

  async updateTask(taskId, { name, description, markdownContent, status, priority }) {
    const body = buildTaskMutationBody({ name, description, markdownContent, status, priority });

    return this.request(`/task/${taskId}`, {
      method: "PUT",
      body
    });
  }

  async request(path, { method = "GET", body } = {}) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    const data = text ? parseJsonResponse(text) : {};

    if (!response.ok) {
      throw new ClickUpApiError(`ClickUp API request failed with status ${response.status}.`, {
        status: response.status,
        body: data
      });
    }

    return data;
  }
}

function buildTaskMutationBody({ name, description, markdownContent, status, priority }) {
  const body = {};

  if (name) {
    body.name = name;
  }

  if (description) {
    body.description = description;
  } else if (markdownContent) {
    body.markdown_content = markdownContent;
  }

  if (status) {
    body.status = status;
  }

  if (priority) {
    body.priority = priority;
  }

  return body;
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

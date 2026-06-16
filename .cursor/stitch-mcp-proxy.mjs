#!/usr/bin/env node

import { request } from "node:https";
import { createInterface } from "node:readline";

const API_KEY = process.env.STITCH_API_KEY;
const STITCH_URL = "https://stitch.googleapis.com/mcp";

if (!API_KEY) {
  process.stderr.write("STITCH_API_KEY env var is required\n");
  process.exit(1);
}

function postToStitch(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const endpoint = new URL(STITCH_URL);
    const req = request(
      {
        hostname: endpoint.hostname,
        path: endpoint.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "X-Goog-Api-Key": API_KEY,
        },
      },
      (res) => {
        let raw = "";

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error(`Stitch MCP returned invalid JSON: ${error.message}`));
          }
        });
      },
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function trimToolsList(response) {
  if (!Array.isArray(response?.result?.tools)) {
    return response;
  }

  response.result.tools = response.result.tools.map((tool) => {
    const toolWithoutOutputSchema = { ...tool };
    delete toolWithoutOutputSchema.outputSchema;
    return toolWithoutOutputSchema;
  });

  return response;
}

const lines = createInterface({ input: process.stdin, terminal: false });

lines.on("line", async (line) => {
  const trimmed = line.trim();

  if (!trimmed) {
    return;
  }

  let message;

  try {
    message = JSON.parse(trimmed);
  } catch {
    return;
  }

  if (message.id === undefined) {
    postToStitch(message).catch(() => {});
    return;
  }

  try {
    const response = trimToolsList(await postToStitch(message));
    process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      })}\n`,
    );
  }
});

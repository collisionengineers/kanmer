import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadTokenMaterial } from "../../dist/http-secret.js";
import { REMOTE_HTTP_EXCLUDED_TOOLS, remoteHttpToolNames } from "../../dist/index.js";
import { evaluateRemotePublicBoundary } from "../../dist/integration/remote-public.js";

function safeFailure(error) {
  return error instanceof Error && /^(MCP_|REMOTE_|WRONG_PROJECT|fetch failed)/.test(error.message)
    ? error.message.slice(0, 160)
    : "remote client failed";
}

function textResult(value) {
  const content = value && typeof value === "object" ? value.content : undefined;
  const first = Array.isArray(content) ? content[0] : undefined;
  if (!first || first.type !== "text") return undefined;
  try { return JSON.parse(first.text); } catch { return undefined; }
}

function hasToolError(value) {
  return Boolean(value && typeof value === "object" && value.isError === true);
}

export async function runRemotePublicClient({ endpoint, token, expectedProject, mutate = false }) {
  assert.equal(typeof endpoint, "string");
  assert.equal(typeof token, "string");
  const headers = { authorization: `Bearer ${token}` };
  const missing = await fetch(endpoint, { method: "POST", headers: { accept: "application/json, text/event-stream" }, body: "{}" });
  const wrong = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${"0".repeat(43)}`, accept: "application/json, text/event-stream" }, body: "{}" });
  const client = new Client({ name: "kanmer-mcp-028-worker-client", version: "1" });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers } });
  let initialized = false;
  let projectMatched = false;
  let mutation = false;
  let gateBlocked = false;
  let wrongProjectBlocked = false;
  try {
    await client.connect(transport);
    initialized = true;
    const tools = (await client.listTools()).tools.map((tool) => tool.name).sort();
    const status = textResult(await client.callTool({ name: "get_status", arguments: {} }));
    projectMatched = status?.project?.fingerprint === expectedProject;
    const wrongProject = await client.callTool({ name: "create_item", arguments: { title: "MCP-028 wrong project probe", expected_project: "kanmer-proj-v1:" + "0".repeat(64) } });
    wrongProjectBlocked = hasToolError(wrongProject) || /WRONG_PROJECT|expected project/i.test(JSON.stringify(wrongProject));
    if (mutate) {
      const created = await client.callTool({ name: "create_item", arguments: { title: "MCP-028 disposable remote fixture", expected_project: expectedProject, docs_todo: true } });
      mutation = !hasToolError(created) && Boolean(textResult(created)?.id);
      const createdId = textResult(created)?.id;
      if (createdId) {
        const gate = await client.callTool({ name: "move_item", arguments: { id: createdId, status: "done", expected_project: expectedProject } });
        gateBlocked = hasToolError(gate) || /gate|require|blocked|questions/i.test(JSON.stringify(gate));
      }
    }
    return {
      initialized,
      projectMatched,
      tools,
      mutation,
      gateBlocked,
      wrongProjectBlocked,
      boundaryChecks: evaluateRemotePublicBoundary({
        missingAuthStatus: missing.status,
        wrongAuthStatus: wrong.status,
        expectedProjectMatched: projectMatched,
        remoteTools: tools,
        canonicalTools: remoteHttpToolNames(),
        dispatchTools: [...REMOTE_HTTP_EXCLUDED_TOOLS],
      }),
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function runRemotePublicDescriptor(descriptorPath) {
  const raw = JSON.parse(await readFile(descriptorPath, "utf8"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => /token|bearer|authorization|secret/i.test(key))) {
    throw new Error("REMOTE_PUBLIC_DESCRIPTOR_UNSAFE");
  }
  if (typeof raw.endpoint !== "string" || typeof raw.tokenFile !== "string" || typeof raw.expectedProject !== "string") {
    throw new Error("REMOTE_PUBLIC_DESCRIPTOR_INVALID");
  }
  const material = await loadTokenMaterial(raw.tokenFile);
  return runRemotePublicClient({ endpoint: raw.endpoint, token: material.token, expectedProject: raw.expectedProject, mutate: raw.mutate === true });
}

if (process.argv[1]?.endsWith("remote-public-client.mjs")) {
  const descriptorFlag = process.argv[2];
  if (descriptorFlag !== "--descriptor" || process.argv.length !== 4) {
    process.stderr.write("remote-public-client: use --descriptor <protected-json-reference>\n");
    process.exitCode = 2;
  } else {
    try {
      const result = await runRemotePublicDescriptor(process.argv[3]);
      process.stdout.write(`${JSON.stringify(result)}\n`);
      process.exitCode = result.boundaryChecks.some((item) => item.status === "fail") ? 1 : 0;
    } catch {
      process.stdout.write(`${JSON.stringify({ outcome: "inconclusive", reason: "protected remote client run unavailable" })}\n`);
      process.exitCode = 2;
    }
  }
}

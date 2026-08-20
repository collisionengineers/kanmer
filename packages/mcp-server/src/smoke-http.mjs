import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function mcpPayload(response) {
  const body = await response.text();
  const data = body.startsWith("event:") ? body.split("\n").find((line) => line.startsWith("data: "))?.slice(6) : body;
  assert.ok(data, "MCP response contains a payload");
  return JSON.parse(data);
}

const root = await mkdtemp(path.join(os.tmpdir(), "kanmer-http-smoke-"));
process.env.KANMER_ROOT = root;
const { createKanmerHttpHost } = await import("../dist/http.js");

const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../dist/http-cli.js", import.meta.url))], { encoding: "utf8" });
assert.equal(cli.status, 1);
assert.match(cli.stderr, /no production HTTP authorizer/i);

assert.throws(() => createKanmerHttpHost({}), /authorizer/);
assert.throws(() => createKanmerHttpHost({ authorizer: { authorize: async () => ({ principal: "x" }) }, host: "0.0.0.0" }), /bind only/i);
assert.throws(() => createKanmerHttpHost({ authorizer: { authorize: async () => ({ principal: "x" }) }, port: 65_536 }), /65535/);

const host = createKanmerHttpHost({
  authorizer: {
    authorize: async ({ headers }) => {
      if (headers.authorization === "Bearer smoke") return { principal: "smoke-principal" };
      if (headers.authorization === "Bearer other") return { principal: "other-principal" };
      throw new Error("unauthorized");
    },
  },
  idleTtlMs: 60_000,
});

try {
  const ready = await host.start();
  assert.equal(ready.host, "127.0.0.1");
  assert.equal(ready.authRequired, true);
  assert.match(ready.projectFingerprint, /^[a-f0-9]{16}$/);
  const endpoint = ready.endpoint;
  const missing = await fetch(endpoint, { method: "POST" });
  assert.equal(missing.status, 401);
  const deniedOrigin = await fetch(endpoint, { method: "POST", headers: { authorization: "Bearer smoke", origin: "https://not-allowed.example" } });
  assert.equal(deniedOrigin.status, 403);
  const notFound = await fetch(endpoint.replace("/mcp", "/other"), { headers: { authorization: "Bearer smoke" } });
  assert.equal(notFound.status, 404);
  const method = await fetch(endpoint, { method: "PUT", headers: { authorization: "Bearer smoke" } });
  assert.equal(method.status, 405);
  const initialize = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: "Bearer smoke", "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "http-smoke", version: "1" } } }),
  });
  assert.equal(initialize.status, 200);
  const session = initialize.headers.get("mcp-session-id");
  assert.ok(session, "initialize returned a session id");
  const tools = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: "Bearer smoke", "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": session, "mcp-protocol-version": "2025-11-25" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  });
  assert.equal(tools.status, 200);
  const toolsPayload = await mcpPayload(tools);
  assert.equal(toolsPayload.result.tools.length, 30);
  const foreign = await fetch(endpoint, { method: "GET", headers: { authorization: "Bearer other", "mcp-session-id": session } });
  assert.equal(foreign.status, 404);
  const deleted = await fetch(endpoint, { method: "DELETE", headers: { authorization: "Bearer smoke", "mcp-session-id": session, "mcp-protocol-version": "2025-11-25" } });
  assert.equal(deleted.status, 200);
  const malformed = await fetch(endpoint, { method: "POST", headers: { authorization: "Bearer smoke", "content-type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  await host.invalidatePrincipal("smoke-principal");
  await host.close();
  await host.close();
  process.stdout.write("PASS  HTTP initialize/tools/list/session/delete smoke\n");
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true });
}

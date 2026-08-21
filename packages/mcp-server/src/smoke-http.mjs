import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function mcpPayload(response) {
  const body = await response.text();
  const data = body.startsWith("event:") ? body.split("\n").find((line) => line.startsWith("data: "))?.slice(6) : body;
  assert.ok(data, "MCP response contains a payload");
  return JSON.parse(data);
}

async function startHttpCli(entry, tokenFile) {
  const child = spawn(process.execPath, [entry], {
    env: { ...process.env, KANMER_HTTP_TOKEN_FILE: tokenFile },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("HTTP CLI did not become ready")), 5_000);
    child.once("error", reject);
    child.stdout.once("data", () => { clearTimeout(timeout); resolve(); });
    child.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`HTTP CLI exited ${code}: ${stderr}`)); });
  });
  return { child, stdout, stderr };
}

const root = await mkdtemp(path.join(os.tmpdir(), "kanmer-http-smoke-"));
process.env.KANMER_ROOT = root;
const { createKanmerHttpHost, BearerAuthorizer, createTokenFile, generateBearerToken, loadTokenFile } = await import("../dist/http.js");

const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../dist/http-cli.js", import.meta.url))], { encoding: "utf8" });
assert.equal(cli.status, 1);
assert.match(cli.stderr, /REMOTE_AUTH_MISSING/i);

const tokenPath = path.join(root, "remote-token");
const tokenResult = await createTokenFile(tokenPath);
assert.match(tokenResult.fingerprint, /^sha256:[a-f0-9]{12}$/);
assert.deepEqual(await loadTokenFile(tokenPath), tokenResult.verifier);
await assert.rejects(() => createTokenFile(tokenPath), /EEXIST/);
const spacedTokenPath = path.join(root, "remote token with spaces");
await createTokenFile(spacedTokenPath);
await loadTokenFile(spacedTokenPath);
const failedTokenPath = path.join(root, "partial-token");
await assert.rejects(() => createTokenFile(failedTokenPath, { write: async (_handle, token) => { throw new Error(`injected ${token}`); } }), /REMOTE_AUTH_SECRET_FILE_WRITE_FAILED/);
await assert.rejects(() => readFile(failedTokenPath), /ENOENT/, "failed creation removes only its partial output");
const cliTokenPath = path.join(root, "remote-token-cli");
const tokenCli = spawnSync(process.execPath, [fileURLToPath(new URL("../dist/remote-token-cli.js", import.meta.url)), cliTokenPath], { encoding: "utf8" });
assert.equal(tokenCli.status, 0);
assert.match(tokenCli.stdout, /"fingerprint":"sha256:[a-f0-9]{12}"/);
assert.equal(tokenCli.stdout.includes((await readFile(cliTokenPath, "utf8")).trim()), false, "generator never prints the raw token");
await loadTokenFile(cliTokenPath);
const cliHost = await startHttpCli(fileURLToPath(new URL("../dist/http-cli.js", import.meta.url)), cliTokenPath);
const cliReady = JSON.parse(cliHost.stdout.trim());
assert.equal(cliReady.authRequired, true);
assert.equal(cliHost.stdout.includes((await readFile(cliTokenPath, "utf8")).trim()), false, "HTTP CLI never prints its raw token");
cliHost.child.kill("SIGTERM");

assert.throws(() => createKanmerHttpHost({}), /authorizer/);
assert.throws(() => createKanmerHttpHost({ authorizer: { authorize: async () => ({ principal: "x" }) }, host: "0.0.0.0" }), /bind only/i);
assert.throws(() => createKanmerHttpHost({ authorizer: { authorize: async () => ({ principal: "x" }) }, port: 65_536 }), /65535/);

const generated = generateBearerToken();
const other = generateBearerToken();
const securityEvents = [];
assert.equal(JSON.stringify(generated.verifier).includes(generated.token), false, "verifier serialization never contains raw token");
assert.equal(JSON.stringify(generated.verifier).includes(generated.verifier.digest.toString("hex")), false, "verifier serialization never contains digest");
const directAuthorizer = new BearerAuthorizer(generated.verifier);
for (const authorization of [undefined, "", "Basic x", `Bearer ${generated.token} extra`, `Bearer ${generated.token}\t`, ["Bearer x", "Bearer y"]]) {
  await assert.rejects(() => directAuthorizer.authorize({ headers: { authorization } }));
}
await assert.rejects(() => directAuthorizer.authorize({ headers: { authorization: `Bearer ${generated.verifier.digest.toString("hex")}` } }), /UNAUTHORIZED/);
const unsafeTokenPath = path.join(root, "unsafe-token");
await writeFile(unsafeTokenPath, "not-a-token\n", { mode: 0o600 });
await chmod(unsafeTokenPath, 0o600);
await assert.rejects(() => loadTokenFile(unsafeTokenPath), /REMOTE_AUTH_INVALID_TOKEN/);
if (process.platform !== "win32") {
  await chmod(tokenPath, 0o644);
  await assert.rejects(() => loadTokenFile(tokenPath), /REMOTE_AUTH_SECRET_FILE_UNSAFE/);
  await chmod(tokenPath, 0o600);
}
const host = createKanmerHttpHost({
  authorizer: new BearerAuthorizer(generated.verifier),
  onEvent: (event) => securityEvents.push(event),
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
  const queryCredential = await fetch(`${endpoint}?token=${generated.token}`, { method: "POST" });
  assert.equal(queryCredential.status, 404, "query credentials never select the MCP route");
  const cookieCredential = await fetch(endpoint, { method: "POST", headers: { cookie: `token=${generated.token}` } });
  assert.equal(cookieCredential.status, 401, "cookies never authenticate MCP");
  const deniedOrigin = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${generated.token}`, origin: "https://not-allowed.example" } });
  assert.equal(deniedOrigin.status, 403);
  const notFound = await fetch(endpoint.replace("/mcp", "/other"), { headers: { authorization: `Bearer ${generated.token}` } });
  assert.equal(notFound.status, 404);
  const method = await fetch(endpoint, { method: "PUT", headers: { authorization: `Bearer ${generated.token}` } });
  assert.equal(method.status, 405);
  const initialize = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${generated.token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "http-smoke", version: "1" } } }),
  });
  assert.equal(initialize.status, 200);
  const session = initialize.headers.get("mcp-session-id");
  assert.ok(session, "initialize returned a session id");
  const tools = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${generated.token}`, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": session, "mcp-protocol-version": "2025-11-25" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  });
  assert.equal(tools.status, 200);
  const toolsPayload = await mcpPayload(tools);
  assert.equal(toolsPayload.result.tools.length, 30);
  // Keep two independently-negotiated sessions live. Session B advertises
  // elicitation, while A does not: a mutable registry-level server reference
  // used to make this A mutation inherit B's identity/capabilities.
  const initializeSecond = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${generated.token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: { elicitation: {} }, clientInfo: { name: "http-smoke-second", version: "1" } } }),
  });
  assert.equal(initializeSecond.status, 200);
  const secondSession = initializeSecond.headers.get("mcp-session-id");
  assert.ok(secondSession, "second initialize returned a session id");
  assert.notEqual(secondSession, session);
  const created = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${generated.token}`, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": session, "mcp-protocol-version": "2025-11-25" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "create_item", arguments: { title: "HTTP session isolation smoke" } } }),
  });
  assert.equal(created.status, 200);
  const createdPayload = await mcpPayload(created);
  assert.notEqual(createdPayload.result.isError, true);
  const createdItem = JSON.parse(createdPayload.result.content[0].text);
  const activity = (await readFile(path.join(root, ".kanmer", "data", "activity.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(activity.at(-1).actor, "http-smoke", "Session A write keeps Session A identity after Session B initializes");
  const deletedItem = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${generated.token}`, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": session, "mcp-protocol-version": "2025-11-25" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "delete_item", arguments: { id: createdItem.id } } }),
  });
  assert.equal(deletedItem.status, 200, "Session A destructive operation keeps Session A's no-elicitation capability");
  assert.notEqual((await mcpPayload(deletedItem)).result.isError, true);
  const foreign = await fetch(endpoint, { method: "GET", headers: { authorization: `Bearer ${other.token}`, "mcp-session-id": session } });
  assert.equal(foreign.status, 401, "authentication runs before session lookup");
  const rotated = generateBearerToken();
  assert.notEqual(rotated.verifier.tokenId, generated.verifier.tokenId, "rotation gets a new opaque token identity");
  await host.rotateBearerVerifier(rotated.verifier);
  const oldAfterRotation = await fetch(endpoint, { method: "GET", headers: { authorization: `Bearer ${generated.token}`, "mcp-session-id": session } });
  assert.equal(oldAfterRotation.status, 401, "old token fails immediately after rotation");
  const oldSessionAfterRotation = await fetch(endpoint, { method: "GET", headers: { authorization: `Bearer ${rotated.token}`, "mcp-session-id": session } });
  assert.equal(oldSessionAfterRotation.status, 400, "rotation invalidates old sessions");
  await host.revokeBearer();
  const revoked = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${rotated.token}` } });
  assert.equal(revoked.status, 401, "revocation fails closed");
  const malformed = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${generated.token}`, "content-type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 401, "revoked auth runs before JSON parsing");
  assert.ok(securityEvents.some((event) => event.kind === "auth-rotated" && event.fingerprint === rotated.verifier.fingerprint));
  assert.ok(securityEvents.some((event) => event.kind === "auth-revoked"));
  assert.equal(JSON.stringify(securityEvents).includes(generated.token), false, "security events never contain raw tokens");
  await host.close();
  await host.close();
  process.stdout.write("PASS  HTTP initialize/tools/list/session/delete smoke\n");
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true });
}

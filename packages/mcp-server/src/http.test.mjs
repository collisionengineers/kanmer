import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { connect as connectSocket } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { removeTreeWithRetry } from "@kanmer/core";

const root = await mkdtemp(path.join(os.tmpdir(), "kanmer-http-test-"));
process.env.KANMER_ROOT = root;
const httpEntry = new URL("../dist/http.js", import.meta.url);
const stdioEntry = new URL("../dist/index.js", import.meta.url);
const { BearerAuthorizer, createKanmerHttpHost, generateBearerToken } = await import(httpEntry);
const { remoteHttpToolNames } = await import(new URL("../dist/index.js", import.meta.url));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const authHeaders = (token) => ({ authorization: `Bearer ${token}` });

function initializeBody(name = "http-test") {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name, version: "1" },
    },
  });
}

async function initialize(endpoint, token, name = "http-test") {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { ...authHeaders(token), "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: initializeBody(name),
  });
  assert.equal(response.status, 200);
  const session = response.headers.get("mcp-session-id");
  assert.ok(session, "the SDK must return a session id");
  return session;
}

function authorizerFor(tokens, calls = { count: 0 }) {
  const authorizer = {
    async authorize(request) {
      calls.count++;
      const value = request.headers.authorization;
      for (const [token, principal] of tokens) if (value === `Bearer ${token}`) return { principal };
      throw new Error("UNAUTHORIZED");
    },
  };
  authorizer.calls = calls;
  return authorizer;
}

// MCP-056: the child runs from a directory whose parent holds a `.kanmer` that
// is only the FRD-029 endpoint registry — the shape `~/.kanmer` has on any
// machine that has used remote access. Discovery used to accept it as a board
// and this test then hung to its timeout; now the test proves the rule instead
// of assuming nothing above `os.tmpdir()` looks like a board.
const decoy = mkdtempSync(path.join(os.tmpdir(), "kanmer-http-decoy-"));
mkdirSync(path.join(decoy, ".kanmer"));
writeFileSync(path.join(decoy, ".kanmer", "endpoints.json"), "{}\n", "utf8");
mkdirSync(path.join(decoy, "work"));

test.after(async () => {
  await removeTreeWithRetry(root);
  await removeTreeWithRetry(decoy);
});

test("project resolution fails before binding and leaves no listener", () => {
  const source = `
    const { createKanmerHttpHost } = await import(${JSON.stringify(httpEntry.href)});
    const host = createKanmerHttpHost({ authorizer: { authorize: async () => ({ principal: "probe" }) } });
    try { await host.start(); process.stdout.write("UNEXPECTED_READY"); process.exitCode = 2; }
    catch (error) {
      await host.close();
      await host.close();
      process.stdout.write(JSON.stringify({
        message: String(error?.message ?? error),
        listening: host.httpServer.listening,
        timerDestroyed: host.sweepTimer._destroyed,
      }));
    }
  `;
  const cleanEnv = { ...process.env };
  delete cleanEnv.KANMER_ROOT;
  delete cleanEnv.KANMER_INIT;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: path.join(decoy, "work"),
    env: cleanEnv,
    encoding: "utf8",
    // This is a whole cold Node process that then imports dist/http.js and the
    // MCP SDK before it can answer. On Windows the process spawn alone costs
    // tens of milliseconds and module load runs into hundreds; when a second
    // verification rail shares the host, the pair regularly exceeded 2 s and
    // the test failed `spawnSync ETIMEDOUT` (CORE-128). This is a guard against
    // a hang, not a performance assertion, so it is sized well above the cost
    // rather than close to it.
    timeout: 30_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `child did not fail cleanly: ${result.stderr}`);
  const failure = JSON.parse(result.stdout);
  assert.match(failure.message, /no Kanmer board found/i);
  assert.equal(failure.listening, false);
  assert.equal(failure.timerDestroyed, true);
  assert.doesNotMatch(result.stdout, /UNEXPECTED_READY/);
});

test("validates the bounded HTTP configuration and emits complete readiness/stopped metadata", async () => {
  const generated = generateBearerToken();
  const authorizer = authorizerFor([[generated.token, "config-test"]]);
  const invalid = [
    [{ host: "0.0.0.0" }, /bind only/i],
    [{ host: "localhost" }, /bind only/i],
    [{ port: -1 }, /port/i],
    [{ port: 65_536 }, /65535/],
    [{ maxHeaderBytes: 65_537 }, /maxHeaderBytes/i],
    [{ maxBodyBytes: 10 * 1024 * 1024 + 1 }, /maxBodyBytes/i],
    [{ maxConnections: 4_097 }, /maxConnections/i],
    [{ requestTimeoutMs: 0 }, /requestTimeoutMs/i],
    [{ keepAliveTimeoutMs: 10 * 60_000 + 1 }, /keepAliveTimeoutMs/i],
    [{ maxSessions: 4_097 }, /maxSessions/i],
    [{ maxSessionsPerPrincipal: 4_097 }, /maxSessionsPerPrincipal/i],
    [{ maxInFlight: 4_097 }, /maxInFlight/i],
    [{ maxInFlightPerSession: 1_025 }, /maxInFlightPerSession/i],
    [{ idleTtlMs: 24 * 60 * 60_000 + 1 }, /idleTtlMs/i],
    [{ sweepIntervalMs: 60 * 60_000 + 1 }, /sweepIntervalMs/i],
    [{ shutdownGraceMs: 10 * 60_000 + 1 }, /shutdownGraceMs/i],
    [{ allowedOrigins: ["*"] }, /origins/i],
    [{ allowedOrigins: ["https://allowed.example/path"] }, /origins/i],
  ];
  for (const [overrides, message] of invalid) assert.throws(() => createKanmerHttpHost({ authorizer, ...overrides }), message);

  const events = [];
  const host = createKanmerHttpHost({
    authorizer,
    allowedOrigins: ["https://allowed.example"],
    onEvent: (event) => events.push(event),
  });
  const ready = await host.start();
  try {
    assert.equal(ready.kind, "kanmer-mcp-http-ready");
    assert.equal(ready.version, 1);
    assert.equal(ready.pid, process.pid);
    assert.equal(ready.host, "127.0.0.1");
    assert.ok(ready.port > 0);
    assert.match(ready.endpoint, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    assert.match(ready.projectFingerprint, /^kanmer-proj-v1:[a-f0-9]{64}$/);
    // FRD-029 / MCP-054: readiness names the logical project. This root has
    // never been written, so it is still unassigned — and that is reported
    // as null, never guessed.
    assert.equal(ready.project_id, null);
    assert.equal(ready.board_id, null);
    assert.equal(ready.identity, "unassigned");
    assert.equal(ready.mode, "remote-http-v1");
    assert.equal(ready.authRequired, true);
    assert.deepEqual(ready.supportedProtocolVersions, ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"]);

    const disallowed = await fetch(ready.endpoint, { method: "POST", headers: { origin: "https://not-allowed.example" } });
    assert.equal(disallowed.status, 403);
    assert.equal(authorizer.calls.count, 0, "Origin rejection precedes authorization");
    const allowedButMissingAuth = await fetch(ready.endpoint, { method: "POST", headers: { origin: "https://allowed.example" } });
    assert.equal(allowedButMissingAuth.status, 401);
    assert.equal(authorizer.calls.count, 1);
  } finally {
    await host.close();
    await host.close();
  }
  const stopped = events.filter((event) => event.kind === "kanmer-mcp-http-stopped");
  assert.equal(stopped.length, 1, "repeated close emits one stopped event");
  assert.equal(stopped[0].reason, "requested");
  assert.equal(JSON.stringify(events).includes(generated.token), false);
});

test("official HTTP and stdio clients expose the canonical policy with remote dispatch excluded", async () => {
  const generated = generateBearerToken();
  const host = createKanmerHttpHost({ authorizer: authorizerFor([[generated.token, "client-test"]]) });
  const ready = await host.start();
  const remote = new Client({ name: "official-http-client", version: "1" });
  const local = new Client({ name: "official-stdio-client", version: "1" });
  const remoteTransport = new StreamableHTTPClientTransport(new URL(ready.endpoint), {
    requestInit: { headers: authHeaders(generated.token) },
  });
  const localTransport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(stdioEntry)],
    env: { ...process.env, KANMER_ROOT: root },
  });
  try {
    await remote.connect(remoteTransport);
    await local.connect(localTransport);
    const remoteTools = (await remote.listTools()).tools;
    const localTools = (await local.listTools()).tools;
    assert.deepEqual(remoteTools.map((tool) => tool.name).sort(), [...remoteHttpToolNames()]);
    const localPolicyTools = localTools.filter((tool) => remoteTools.some((remoteTool) => remoteTool.name === tool.name));
    assert.deepEqual(remoteTools.map(({ name, inputSchema }) => ({ name, inputSchema })).sort((a, b) => a.name.localeCompare(b.name)), localPolicyTools.map(({ name, inputSchema }) => ({ name, inputSchema })).sort((a, b) => a.name.localeCompare(b.name)));
    const status = await remote.callTool({ name: "get_status", arguments: {} });
    const statusPayload = JSON.parse(status.content[0].text);
    // MCP-055: structuredContent carries the whole result, not just the project stamp.
    assert.deepEqual(status.structuredContent.result, statusPayload);
    assert.equal(statusPayload.project.fingerprint, ready.projectFingerprint);
    assert.equal(statusPayload.project.boardRoot, root.replaceAll("\\", "/").replace(/^([A-Z]):/, (_, drive) => `${drive.toLowerCase()}:`));
  } finally {
    await remote.close().catch(() => undefined);
    await local.close().catch(() => undefined);
    await host.close();
  }
});

test("limits, principal-bound sessions, deterministic expiry, and restart invalidation are fail-closed", async () => {
  const first = generateBearerToken();
  const second = generateBearerToken();
  const host = createKanmerHttpHost({
    authorizer: authorizerFor([[first.token, "first"], [second.token, "second"]]),
    maxSessions: 1,
    maxSessionsPerPrincipal: 1,
    maxBodyBytes: 512,
    maxInFlight: 1,
    maxInFlightPerSession: 1,
    idleTtlMs: 10_000,
    sweepIntervalMs: 5,
  });
  const ready = await host.start();
  let session;
  try {
    const oversized = await fetch(ready.endpoint, {
      method: "POST",
      headers: { ...authHeaders(first.token), "content-type": "application/json" },
      body: "x".repeat(513),
    });
    assert.equal(oversized.status, 413);
    session = await initialize(ready.endpoint, first.token);
    const atCapacity = await fetch(ready.endpoint, {
      method: "POST",
      headers: { ...authHeaders(second.token), "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: initializeBody("second"),
    });
    assert.equal(atCapacity.status, 429);
    const malformed = await fetch(ready.endpoint, { method: "GET", headers: { ...authHeaders(first.token), "mcp-session-id": "not-a-session" } });
    assert.equal(malformed.status, 400);
    const unknown = await fetch(ready.endpoint, { method: "GET", headers: { ...authHeaders(first.token), "mcp-session-id": "4f8f8f5a-8696-4d08-a6a9-a7d3246d44e0" } });
    assert.equal(unknown.status, 400);
    const foreign = await fetch(ready.endpoint, { method: "GET", headers: { ...authHeaders(second.token), "mcp-session-id": session } });
    assert.equal(foreign.status, 404, "cross-principal sessions are rejected generically");
  } finally {
    await host.close();
  }

  const concurrentHost = createKanmerHttpHost({
    authorizer: authorizerFor([[first.token, "first"]]),
    maxSessions: 4,
    maxSessionsPerPrincipal: 4,
    shutdownGraceMs: 50,
  });
  const concurrentReady = await concurrentHost.start();
  try {
    const [a, b] = await Promise.all([
      initialize(concurrentReady.endpoint, first.token, "concurrent-a"),
      initialize(concurrentReady.endpoint, first.token, "concurrent-b"),
    ]);
    assert.notEqual(a, b, "concurrent initialization creates distinct bounded sessions");
  } finally {
    await concurrentHost.close();
  }

  let releaseAuthorization;
  const authorizationGate = new Promise((resolve) => { releaseAuthorization = resolve; });
  // Resolves the moment the first request is actually inside the authorizer.
  // Waiting on that rather than on a fixed sleep is what makes "the cap is
  // occupied" an observation instead of a guess: a 5 ms sleep was a race the
  // moment a second verification rail shared the host (CORE-128).
  let signalAuthorizationEntered;
  const authorizationEntered = new Promise((resolve) => { signalAuthorizationEntered = resolve; });
  const cappedHost = createKanmerHttpHost({
    authorizer: {
      async authorize(request) {
        if (request.headers.authorization !== `Bearer ${first.token}`) throw new Error("UNAUTHORIZED");
        signalAuthorizationEntered();
        await authorizationGate;
        return { principal: "first" };
      },
    },
    maxInFlight: 1,
    shutdownGraceMs: 50,
  });
  const cappedReady = await cappedHost.start();
  try {
    const held = fetch(cappedReady.endpoint, { method: "GET", headers: authHeaders(first.token) });
    await authorizationEntered;
    const rejected = await fetch(cappedReady.endpoint, { method: "GET", headers: authHeaders(first.token) });
    assert.equal(rejected.status, 429, "global in-flight cap rejects before dispatch");
    releaseAuthorization();
    assert.equal((await held).status, 400);
  } finally {
    releaseAuthorization();
    await cappedHost.close();
  }

  let now = 1_000;
  const clockHost = createKanmerHttpHost({
    authorizer: authorizerFor([[first.token, "first"]]),
    clock: () => now,
    idleTtlMs: 10,
    sweepIntervalMs: 2,
  });
  const clockReady = await clockHost.start();
  const clockSession = await initialize(clockReady.endpoint, first.token, "clock");
  now += 11;
  await wait(20);
  const expired = await fetch(clockReady.endpoint, { method: "GET", headers: { ...authHeaders(first.token), "mcp-session-id": clockSession } });
  assert.equal(expired.status, 400);
  await clockHost.close();

  const realTtlHost = createKanmerHttpHost({
    authorizer: authorizerFor([[first.token, "first"]]),
    idleTtlMs: 15,
    sweepIntervalMs: 2,
  });
  const realReady = await realTtlHost.start();
  const realSession = await initialize(realReady.endpoint, first.token, "real-ttl");
  await wait(30);
  const realExpired = await fetch(realReady.endpoint, { method: "GET", headers: { ...authHeaders(first.token), "mcp-session-id": realSession } });
  assert.equal(realExpired.status, 400);
  await realTtlHost.close();

  const restarted = createKanmerHttpHost({ authorizer: authorizerFor([[first.token, "first"]]) });
  const restartedReady = await restarted.start();
  try {
    const afterRestart = await fetch(restartedReady.endpoint, { method: "GET", headers: { ...authHeaders(first.token), "mcp-session-id": session } });
    assert.equal(afterRestart.status, 400, "session ids do not survive a process/host restart");
  } finally {
    await restarted.close();
  }

  const forcedEvents = [];
  const forcedHost = createKanmerHttpHost({
    authorizer: authorizerFor([[first.token, "first"]]),
    shutdownGraceMs: 20,
    onEvent: (event) => forcedEvents.push(event),
  });
  const forcedReady = await forcedHost.start();
  const socket = connectSocket(forcedReady.port, forcedReady.host);
  await new Promise((resolve, reject) => { socket.once("connect", resolve); socket.once("error", reject); });
  socket.write(`GET /mcp HTTP/1.1\r\nHost: ${forcedReady.host}:${forcedReady.port}\r\n`);
  const started = Date.now();
  await forcedHost.close();
  assert.ok(Date.now() - started < 500, "forced shutdown is bounded by the configured grace period");
  assert.equal(forcedEvents.filter((event) => event.kind === "kanmer-mcp-http-stopped")[0]?.reason, "forced-timeout");
  socket.destroy();
});

test("rotation persists before activation, invalidates sessions, and aggregates redacted failures", async () => {
  const first = generateBearerToken();
  const second = generateBearerToken();
  const events = [];
  const host = createKanmerHttpHost({
    authorizer: new BearerAuthorizer(first.verifier),
    onEvent: (event) => events.push(event),
    sweepIntervalMs: 60_000,
  });
  const ready = await host.start();
  try {
    const session = await initialize(ready.endpoint, first.token, "rotation");
    await assert.rejects(() => host.rotateBearerVerifier(second.verifier, { persist: async () => { throw new Error(`persisted token ${second.token}`); } }), /REMOTE_AUTH_SECRET_PERSIST_FAILED/);
    assert.equal((await fetch(ready.endpoint, { method: "GET", headers: authHeaders(first.token) })).status, 400, "old token remains active when persistence fails");
    await host.rotateBearerVerifier(second.verifier, { persist: async () => undefined });
    assert.equal((await fetch(ready.endpoint, { method: "GET", headers: { ...authHeaders(first.token), "mcp-session-id": session } })).status, 401);
    assert.equal((await fetch(ready.endpoint, { method: "GET", headers: authHeaders(second.token) })).status, 400, "new token requires a new initialized session");
    await host.rotateBearerVerifier(first.verifier, { persist: async () => undefined });
    await host.rotateBearerVerifier(second.verifier, { persist: async () => undefined });
    await host.revokeBearer();
    await host.revokeBearer();
    assert.equal((await fetch(ready.endpoint, { method: "GET", headers: authHeaders(second.token) })).status, 401);

    const failingHost = createKanmerHttpHost({ authorizer: new BearerAuthorizer(first.verifier), sweepIntervalMs: 60_000 });
    const failingReady = await failingHost.start();
    try {
      await initialize(failingReady.endpoint, first.token, "rotation-failure");
      const [failingSession] = [...failingHost.sessions.values()];
      failingSession.server.close = async () => { throw new Error("session close failed"); };
      await assert.rejects(() => failingHost.rotateBearerVerifier(second.verifier, { persist: async () => undefined }), /session close failed/);
      assert.equal((await fetch(failingReady.endpoint, { method: "GET", headers: authHeaders(first.token) })).status, 401, "ambiguous invalidation fails closed for old token");
      assert.equal((await fetch(failingReady.endpoint, { method: "GET", headers: authHeaders(second.token) })).status, 401, "ambiguous invalidation fails closed for new token");
    } finally { await failingHost.close(); }

    const canary = "A".repeat(43);
    const originalWrite = process.stderr.write;
    const stderr = [];
    process.stderr.write = (chunk) => { stderr.push(String(chunk)); return true; };
    try {
      const noisyEvents = [];
      const noisy = createKanmerHttpHost({
        authorizer: { authorize: async () => { throw new Error(`Authorization: Bearer ${canary}`); } },
        onEvent: (event) => { noisyEvents.push(event); throw new Error(`secret=${canary}`); },
        sweepIntervalMs: 60_000,
      });
      const noisyReady = await noisy.start();
      try {
        for (let i = 0; i < 33; i++) {
          const response = await fetch(noisyReady.endpoint, { method: "GET", headers: { authorization: `Bearer ${canary}` } });
          assert.equal(response.status, 401);
        }
      } finally { await noisy.close(); }
      assert.deepEqual(noisyEvents.filter((event) => event.kind === "auth-rejected").map((event) => event.count), [1, 32]);
    } finally { process.stderr.write = originalWrite; }
    assert.equal(stderr.join("").includes(canary), false, "observer failures are redacted");
    assert.deepEqual(events.filter((event) => event.kind === "auth-rejected").map((event) => event.count), [1], "auth failures are emitted through a bounded aggregate");
  } finally { await host.close(); }
});

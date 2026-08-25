import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { spawn as nodeSpawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { PassThrough } from "node:stream";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CLOUDFLARED_HEALTH_READINESS_TIMEOUT_MS, CLOUDFLARED_STARTUP_READINESS_TIMEOUT_MS, createCloudflaredAdapter, validateTunnelStartInput } from "../../dist/tunnels/cloudflared.js";

test("startup and established-tunnel readiness use separate bounded policies", () => {
  assert.equal(CLOUDFLARED_STARTUP_READINESS_TIMEOUT_MS, 60_000);
  assert.equal(CLOUDFLARED_HEALTH_READINESS_TIMEOUT_MS, 10_000);
  assert.ok(CLOUDFLARED_HEALTH_READINESS_TIMEOUT_MS < 30_000);
});

test("provider-neutral start validation rejects unsafe targets, unknown modes, and invalid retry policies before spawn", () => {
  const input = {
    config: { provider: "cloudflared", mode: "named-credentials", executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", hostname: "kanmer.example.test", credentials: { path: "C:/opaque.json" } },
    target: { endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" },
  };
  assert.doesNotThrow(() => validateTunnelStartInput(input));
  assert.throws(() => validateTunnelStartInput({ ...input, config: { ...input.config, mode: "quick" } }), /TUNNEL_PROVIDER_CONFIG_INVALID/);
  assert.throws(() => validateTunnelStartInput({ ...input, target: { ...input.target, endpoint: "http://192.168.0.1:43123/mcp" } }), /TUNNEL_TARGET_INVALID/);
  assert.throws(() => validateTunnelStartInput({ ...input, target: { ...input.target, hostname: "[2001:db8::1]" } }), /TUNNEL_TARGET_INVALID/);
  assert.throws(() => validateTunnelStartInput({ ...input, target: undefined }), /TUNNEL_TARGET_INVALID/);
  assert.throws(() => validateTunnelStartInput({ ...input, restartPolicy: { maxRestarts: 11 } }), /TUNNEL_RESTART_POLICY_INVALID/);
});

test("adapter exposes a redacted doctor surface for executable and credential checks", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-doctor-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    const adapter = createCloudflaredAdapter({
      executable: process.execPath,
      tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403",
      credentialsFile: credentials,
      hostname: "kanmer.example.test",
      validateExecutable: async () => ({ version: "2026.8.1" }),
    });
    assert.deepEqual(await adapter.doctor(), { provider: "cloudflared", ok: true, checks: [{ id: "executable", ok: true }, { id: "credentials", ok: true }] });
    const broken = createCloudflaredAdapter({ executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: path.join(directory, "missing"), hostname: "kanmer.example.test", validateExecutable: async () => ({ version: "2026.8.1" }) });
    const result = await broken.doctor();
    assert.equal(result.ok, false);
    assert.equal(result.checks[1].code, "TUNNEL_CREDENTIALS_FILE_UNSAFE");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("adapter validates an owned credentials file before starting a direct child", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-test-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    const options = {
      executable: process.execPath,
      tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403",
      credentialsFile: credentials,
      hostname: "kanmer.example.test",
      metricsPort: 43124,
      waitForReady: async () => {},
      validateExecutable: async () => {},
    };
    const adapter = createCloudflaredAdapter(options);
    const child = await adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" });
    assert.ok(child.pid);
    await child.exited;
    await assert.rejects(() => createCloudflaredAdapter({ ...options, credentialsFile: path.join(directory, "missing") }).start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" }), /TUNNEL_CREDENTIALS_FILE_UNSAFE/);
    await assert.rejects(() => createCloudflaredAdapter({ ...options, executable: `${process.execPath}\nunsafe` }).start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" }), /TUNNEL_EXECUTABLE_INVALID/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("adapter refuses a symlinked credentials reference when the platform permits one", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-link-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    const linked = path.join(directory, "linked-credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    try { await symlink(credentials, linked, "file"); }
    catch { t.skip("creating file symlinks is not enabled for this account"); return; }
    const adapter = createCloudflaredAdapter({
      executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: linked,
      hostname: "kanmer.example.test", validateExecutable: async () => {},
    });
    await assert.rejects(() => adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" }), /TUNNEL_CREDENTIALS_FILE_UNSAFE/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("fake provider receives one direct no-autoupdate metrics invocation and must pass readiness", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-fake-"));
  let server;
  let closed = false;
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "credential-canary-not-an-argument", { mode: 0o600 });
    const calls = [];
    const fakeSpawn = (command, args, options) => {
      calls.push({ command, args, options });
      const child = new EventEmitter();
      child.pid = 4321; child.killed = false;
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = () => { child.killed = true; server?.close(() => { closed = true; child.emit("exit", 0, null); }); return true; };
      server = createServer((request, response) => {
        response.writeHead(request.url === "/ready" ? 200 : 404); response.end("ready");
      });
      server.listen(43125, "127.0.0.1", () => child.emit("spawn"));
      return child;
    };
    const adapter = createCloudflaredAdapter({
      executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: credentials,
      hostname: "kanmer.example.test", metricsPort: 43125,
      validateExecutable: async () => {},
    }, fakeSpawn);
    const handle = await adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" });
    assert.deepEqual(calls[0].args, ["tunnel", "--no-autoupdate", "--metrics", "127.0.0.1:43125", "--config", calls[0].args[5], "run", "3f9620b4-423e-4f37-a30e-61ffcf91f403"]);
    assert.equal(calls[0].options.shell, false);
    assert.equal(calls[0].options.detached, process.platform !== "win32");
    assert.deepEqual(Object.keys(calls[0].options.env), process.platform === "win32" && process.env.SystemRoot ? ["PATH", "SystemRoot"] : ["PATH"]);
    assert.equal(calls[0].args.join(" ").includes("credential-canary-not-an-argument"), false);
    const configPath = calls[0].args[5];
    const config = await readFile(configPath, "utf8");
    assert.match(config, /^tunnel: 3f9620b4-423e-4f37-a30e-61ffcf91f403\ncredentials-file: /);
    assert.match(config, /hostname: kanmer\.example\.test\n    service: http:\/\/127\.0\.0\.1:43123\n  - service: http_status:404\n$/);
    if (process.platform !== "win32") assert.equal((await stat(configPath)).mode & 0o077, 0);
    await Promise.all([handle.stop(), handle.stop()]);
    await assert.rejects(() => access(configPath));
  } finally { if (server && !closed) await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});

test("standalone fake provider reaches local readiness and leaves no credential content in diagnostics", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-integration-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    const canary = "credential-canary-must-not-appear";
    await writeFile(credentials, canary, { mode: 0o600 });
    const metricsPort = 43128;
    const diagnostics = [];
    const fixture = fileURLToPath(new URL("./fixtures/fake-cloudflared.mjs", import.meta.url));
    const adapter = createCloudflaredAdapter({
      executable: process.execPath,
      tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403",
      credentialsFile: credentials,
      hostname: "kanmer.example.test",
      metricsPort,
      validateExecutable: async () => {},
      onLog: (event) => diagnostics.push(event),
    }, (command, args, options) => nodeSpawn(command, [fixture, ...args], options));
    const states = [];
    const unsubscribe = adapter.subscribe((status) => states.push(status.state));
    const handle = await adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" });
    await handle.checkReadiness();
    await handle.stop();
    await handle.exited;
    unsubscribe();
    assert.deepEqual(states, ["stopped", "validating", "starting", "connected", "stopping", "stopped"]);
    assert.equal(adapter.getStatus().publicEndpoint, "https://kanmer.example.test/mcp");
    assert.ok(diagnostics.some((event) => event.message === "provider output received"));
    assert.equal(JSON.stringify(diagnostics).includes(canary), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("adapter status follows provider readiness degradation and recovery", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-flap-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    let healthy = true;
    const readinessTimeouts = [];
    const fakeSpawn = () => {
      const child = new EventEmitter();
      child.pid = 4321; child.killed = false;
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = () => { child.killed = true; queueMicrotask(() => child.emit("exit", 0, null)); return true; };
      queueMicrotask(() => child.emit("spawn"));
      return child;
    };
    const adapter = createCloudflaredAdapter({
      executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: credentials,
      hostname: "kanmer.example.test", metricsPort: 43129, validateExecutable: async () => {},
      waitForReady: async (_endpoint, timeoutMs) => { readinessTimeouts.push(timeoutMs); if (!healthy) throw new Error("provider not ready"); },
    }, fakeSpawn);
    const handle = await adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" });
    assert.deepEqual(readinessTimeouts, [CLOUDFLARED_STARTUP_READINESS_TIMEOUT_MS]);
    healthy = false;
    await assert.rejects(() => handle.checkReadiness?.(), /provider not ready/);
    assert.equal(adapter.getStatus().state, "degraded");
    healthy = true;
    await handle.checkReadiness?.();
    assert.equal(adapter.getStatus().state, "connected");
    assert.deepEqual(readinessTimeouts, [CLOUDFLARED_STARTUP_READINESS_TIMEOUT_MS, CLOUDFLARED_HEALTH_READINESS_TIMEOUT_MS, CLOUDFLARED_HEALTH_READINESS_TIMEOUT_MS]);
    await handle.stop();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("stop cancels an owned child while startup readiness is still pending", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-start-stop-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    let child;
    let spawnedResolve;
    const spawned = new Promise((resolve) => { spawnedResolve = resolve; });
    const fakeSpawn = () => {
      child = new EventEmitter();
      child.pid = 4321; child.killed = false;
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = () => { child.killed = true; queueMicrotask(() => child.emit("exit", 0, null)); return true; };
      queueMicrotask(() => { child.emit("spawn"); spawnedResolve(); });
      return child;
    };
    const adapter = createCloudflaredAdapter({
      executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: credentials,
      hostname: "kanmer.example.test", metricsPort: 43130, validateExecutable: async () => {}, waitForReady: () => new Promise(() => {}),
    }, fakeSpawn);
    const starting = adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" });
    await spawned;
    await new Promise((resolve) => setImmediate(resolve));
    await adapter.stop();
    await assert.rejects(() => starting, /TUNNEL_CHILD_EXITED_BEFORE_READY/);
    assert.equal(child.killed, true);
    assert.equal(adapter.getStatus().state, "failed");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("readiness failure waits for the owned child to exit before cleanup", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-cleanup-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    let stopped = false;
    const fakeSpawn = () => {
      const child = new EventEmitter();
      child.pid = 4321; child.killed = false;
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = () => { stopped = true; child.killed = true; child.emit("exit", 0, null); return true; };
      queueMicrotask(() => child.emit("spawn"));
      return child;
    };
    const adapter = createCloudflaredAdapter({
      executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: credentials,
      hostname: "kanmer.example.test", metricsPort: 43125, validateExecutable: async () => {}, waitForReady: async () => { throw new Error("not ready"); },
    }, fakeSpawn);
    await assert.rejects(() => adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" }), /not ready/);
    assert.equal(stopped, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("an owned child exit fails the attempt without waiting for readiness timeout", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-exit-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    const fakeSpawn = () => {
      const child = new EventEmitter();
      child.pid = 4321; child.killed = false;
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = () => { child.killed = true; return true; };
      queueMicrotask(() => { child.emit("spawn"); child.emit("exit", 9, null); });
      return child;
    };
    const adapter = createCloudflaredAdapter({
      executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: credentials,
      hostname: "kanmer.example.test", metricsPort: 43125, validateExecutable: async () => {},
      waitForReady: () => new Promise(() => {}),
    }, fakeSpawn);
    await assert.rejects(() => adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" }), /TUNNEL_CHILD_EXITED_BEFORE_READY/);
    assert.equal(adapter.getStatus().code, "TUNNEL_CHILD_EXITED_BEFORE_READY");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("provider error without an exit event settles and cleans the attempt", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-error-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    const fakeSpawn = () => {
      const child = new EventEmitter();
      child.pid = 4321; child.killed = false;
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = () => { child.killed = true; return true; };
      queueMicrotask(() => { child.emit("spawn"); child.emit("error", new Error("provider unavailable")); });
      return child;
    };
    const adapter = createCloudflaredAdapter({ executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: credentials, hostname: "kanmer.example.test", validateExecutable: async () => {}, waitForReady: () => new Promise(() => {}) }, fakeSpawn);
    await assert.rejects(() => Promise.race([adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" }), new Promise((_, reject) => setTimeout(() => reject(new Error("hung")), 1_000))]), /TUNNEL_CHILD_EXITED_BEFORE_READY/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("unexpected startup text never escapes through adapter status", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-redaction-"));
  try {
    const credentials = path.join(directory, "credentials.json");
    await writeFile(credentials, "{}", { mode: 0o600 });
    const adapter = createCloudflaredAdapter({
      executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: credentials,
      hostname: "kanmer.example.test", validateExecutable: async () => { throw new Error("C:/secrets/Bearer-canary"); },
    });
    await assert.rejects(() => adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" }), /Bearer-canary/);
    assert.equal(adapter.getStatus().code, "TUNNEL_START_FAILED");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

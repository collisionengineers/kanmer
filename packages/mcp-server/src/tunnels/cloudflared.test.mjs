import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { spawn as nodeSpawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { PassThrough } from "node:stream";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createCloudflaredAdapter, validateTunnelStartInput } from "../../dist/tunnels/cloudflared.js";

test("provider-neutral start validation rejects unsafe targets, unknown modes, and invalid retry policies before spawn", () => {
  const input = {
    config: { provider: "cloudflared", mode: "named-credentials", executable: process.execPath, tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", hostname: "kanmer.example.test", credentials: { path: "C:/opaque.json" } },
    target: { endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" },
  };
  assert.doesNotThrow(() => validateTunnelStartInput(input));
  assert.throws(() => validateTunnelStartInput({ ...input, config: { ...input.config, mode: "quick" } }), /TUNNEL_PROVIDER_CONFIG_INVALID/);
  assert.throws(() => validateTunnelStartInput({ ...input, target: { ...input.target, endpoint: "http://192.168.0.1:43123/mcp" } }), /TUNNEL_TARGET_INVALID/);
  assert.throws(() => validateTunnelStartInput({ ...input, restartPolicy: { maxRestarts: 11 } }), /TUNNEL_RESTART_POLICY_INVALID/);
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
    assert.deepEqual(Object.keys(calls[0].options.env), process.platform === "win32" && process.env.SystemRoot ? ["PATH", "SystemRoot"] : ["PATH"]);
    assert.equal(calls[0].args.join(" ").includes("credential-canary-not-an-argument"), false);
    const configPath = calls[0].args[5];
    const config = await readFile(configPath, "utf8");
    assert.match(config, /^tunnel: 3f9620b4-423e-4f37-a30e-61ffcf91f403\ncredentials-file: /);
    assert.match(config, /hostname: kanmer\.example\.test\n    service: http:\/\/127\.0\.0\.1:43123\/mcp\n  - service: http_status:404\n$/);
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

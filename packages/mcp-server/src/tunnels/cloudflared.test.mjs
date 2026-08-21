import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { PassThrough } from "node:stream";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCloudflaredAdapter } from "../../dist/tunnels/cloudflared.js";

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
    }, fakeSpawn);
    const handle = await adapter.start({ endpoint: "http://127.0.0.1:43123/mcp", hostname: "kanmer.example.test" });
    assert.deepEqual(calls[0].args, ["tunnel", "--no-autoupdate", "--metrics", "127.0.0.1:43125", "--config", calls[0].args[5], "run", "3f9620b4-423e-4f37-a30e-61ffcf91f403"]);
    assert.equal(calls[0].options.shell, false);
    assert.deepEqual(Object.keys(calls[0].options.env), ["PATH"]);
    assert.equal(calls[0].args.join(" ").includes("credential-canary-not-an-argument"), false);
    await handle.stop();
  } finally { if (server && !closed) await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});

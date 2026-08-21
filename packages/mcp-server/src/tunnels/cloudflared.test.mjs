import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

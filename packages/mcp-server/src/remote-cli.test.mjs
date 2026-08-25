import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("remote CLI accepts no secret-bearing command-line configuration", () => {
  const entry = fileURLToPath(new URL("../dist/remote-cli.js", import.meta.url));
  const result = spawnSync(process.execPath, [entry, "not-allowed"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /REMOTE_CLI_ACCEPTS_NO_ARGUMENTS/);
});

test("remote CLI signal during delayed startup removes its owner and detached provider", { skip: process.platform === "win32" }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-remote-cli-signal-"));
  const entry = fileURLToPath(new URL("../dist/remote-cli.js", import.meta.url));
  const fixture = fileURLToPath(new URL("./tunnels/fixtures/fake-cloudflared-delayed.mjs", import.meta.url));
  const executable = path.join(directory, "cloudflared");
  const providerPid = path.join(directory, "provider.pid");
  const ownerFile = path.join(directory, "owner.json");
  const credentials = path.join(directory, "credentials.json");
  const tokenFile = path.join(directory, "token");
  let child;
  try {
    await writeFile(executable, `#!/bin/sh\nif [ \"$1\" != \"--version\" ] && ! { [ \"$1\" = \"tunnel\" ] && [ \"$2\" = \"ingress\" ]; }; then echo $$ > '${providerPid}'; fi\nexec '${process.execPath}' '${fixture}' \"$@\"\n`, { mode: 0o700 });
    await chmod(executable, 0o700);
    await writeFile(credentials, "{}", { mode: 0o600 });
    await writeFile(tokenFile, `${"A".repeat(43)}\n`, { mode: 0o600 });
    child = spawn(process.execPath, [entry], {
      cwd: path.resolve(fileURLToPath(new URL("../../..", import.meta.url))),
      env: {
        ...process.env,
        KANMER_TUNNEL_PROVIDER: "cloudflared",
        KANMER_REMOTE_OWNER_FILE: ownerFile,
        KANMER_REMOTE_OWNER_NONCE: "signal-test-owner",
        KANMER_HTTP_TOKEN_FILE: tokenFile,
        KANMER_TUNNEL_HOSTNAME: "kanmer.example.test",
        KANMER_CLOUDFLARED_EXECUTABLE: executable,
        KANMER_CLOUDFLARED_TUNNEL_ID: "3f9620b4-423e-4f37-a30e-61ffcf91f403",
        KANMER_CLOUDFLARED_CREDENTIALS_FILE: credentials,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      try { await stat(providerPid); await stat(ownerFile); break; }
      catch { await new Promise((resolve) => setTimeout(resolve, 25)); }
    }
    const pid = Number((await readFile(providerPid, "utf8")).trim());
    child.kill("SIGTERM");
    const exit = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("remote CLI did not stop")), 10_000);
      child.once("exit", (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
    });
    assert.equal(exit.code, 0);
    await assert.rejects(() => stat(ownerFile));
    assert.throws(() => process.kill(pid, 0));
  } finally {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
});

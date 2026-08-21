import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import test from "node:test";

const fixture = fileURLToPath(new URL("./fake-cloudflared.mjs", import.meta.url));

async function freePort() {
  const server = createServer(); await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port; await new Promise((resolve) => server.close(resolve)); return port;
}

test("fake cloudflared has direct version/help, local readiness, and signal shutdown only", async () => {
  assert.match(spawnSync(process.execPath, [fixture, "--version"], { encoding: "utf8" }).stdout, /cloudflared version 2026\.8\.1/);
  assert.equal(spawnSync(process.execPath, [fixture, "tunnel", "--help"], { encoding: "utf8" }).status, 0);
  const port = await freePort();
  const child = spawn(process.execPath, [fixture, "tunnel", "--no-autoupdate", "--metrics", `127.0.0.1:${port}`, "--config", "fixture.yml", "run", "3f9620b4-423e-4f37-a30e-61ffcf91f403"], { stdio: "pipe" });
  await once(child.stdout, "data");
  const response = await fetch(`http://127.0.0.1:${port}/ready`);
  assert.equal(response.status, 200);
  child.kill("SIGTERM"); const [code, signal] = await once(child, "exit");
  // Windows may report an externally terminated Node child as null/SIGTERM
  // even though the fixture's cleanup handler ran on POSIX.
  assert.ok(code === 0 || code === null || signal === "SIGTERM");
});

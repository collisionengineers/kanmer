import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("remote CLI accepts no secret-bearing command-line configuration", () => {
  const entry = fileURLToPath(new URL("../dist/remote-cli.js", import.meta.url));
  const result = spawnSync(process.execPath, [entry, "not-allowed"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /REMOTE_CLI_ACCEPTS_NO_ARGUMENTS/);
});

import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "verify-skill-prose.mjs");

test("rejects a v2 stage sequence in AGENTS.md", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-skill-prose-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(
      join(fixture, "AGENTS.md"),
      "Stages: backlog → researching → planning → implementing → review → verifying → done\n",
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /AGENTS\.md:1/);
    assert.match(result.stdout, /no v2 stage names/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

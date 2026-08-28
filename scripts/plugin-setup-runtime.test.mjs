import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { removeTreeWithRetrySync } from "../packages/core/dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePluginRoot = join(root, "plugins", "kanmer");

function installedFixture() {
  const root = mkdtempSync(join(tmpdir(), "kanmer installed plugin "));
  const pluginRoot = join(root, "kanmer", "0.3.7");
  cpSync(sourcePluginRoot, pluginRoot, { recursive: true });
  const skillDir = join(pluginRoot, "skills", "kanmer-setup");
  return {
    root,
    command: resolve(skillDir, "..", "..", "scripts", "agents-block.mjs"),
  };
}

function run(command, repo) {
  return spawnSync(process.execPath, [command, repo], { encoding: "utf8" });
}

test("the setup skill's installed-layout command is runnable and idempotent", () => {
  const installed = installedFixture();
  const target = mkdtempSync(join(tmpdir(), "kanmer setup runtime "));
  try {
    writeFileSync(join(target, "AGENTS.md"), "# Local guidance\n\nKeep this prose.\n", "utf8");

    const first = run(installed.command, target);
    assert.equal(first.status, 0, first.stderr);
    const afterFirst = readFileSync(join(target, "AGENTS.md"), "utf8");
    assert.match(afterFirst, /kanmer:instructions:start/);
    assert.match(afterFirst, /Keep this prose\./);

    const second = run(installed.command, target);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(readFileSync(join(target, "AGENTS.md"), "utf8"), afterFirst);
  } finally {
    removeTreeWithRetrySync(installed.root);
    removeTreeWithRetrySync(target);
  }
});

test("the packaged setup runtime refuses malformed markers without changing the file", () => {
  const installed = installedFixture();
  const target = mkdtempSync(join(tmpdir(), "kanmer setup malformed "));
  try {
    const agents = join(target, "AGENTS.md");
    const malformed = "# Local\n<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->\n";
    writeFileSync(agents, malformed, "utf8");

    const result = run(installed.command, target);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /malformed kanmer:instructions block/);
    assert.equal(readFileSync(agents, "utf8"), malformed);
  } finally {
    removeTreeWithRetrySync(installed.root);
    removeTreeWithRetrySync(target);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));

test("release source of truth bumps every shipped plugin manifest", () => {
  const release = readFileSync(join(root, "scripts", "release.mjs"), "utf8");
  const block = release.match(/const pluginManifestPaths = \[[\s\S]*?\];/u)?.[0];
  assert.ok(block, "release.mjs must declare pluginManifestPaths");
  assert.match(block, /join\(root, "plugins", "kanmer", "\.claude-plugin", "plugin\.json"\)/u);
  assert.match(block, /join\(root, "plugins", "kanmer", "\.codex-plugin", "plugin\.json"\)/u);
  assert.match(block, /join\(root, "plugins", "kanmer", "plugin\.json"\)/u);

  const expected = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  for (const rel of [
    "plugins/kanmer/.claude-plugin/plugin.json",
    "plugins/kanmer/.codex-plugin/plugin.json",
    "plugins/kanmer/plugin.json",
  ]) {
    assert.equal(JSON.parse(readFileSync(join(root, rel), "utf8")).version, expected, rel);
  }
});

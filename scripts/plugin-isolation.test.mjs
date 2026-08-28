import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkIsolatedPlugin } from "./lib/plugin-isolation.mjs";
import { removeTreeWithRetrySync } from "../packages/core/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePluginRoot = join(root, "plugins", "kanmer");

test("the shipped plugin initializes from an isolated payload with a space in its path", async () => {
  const result = await checkIsolatedPlugin({ sourcePluginRoot });
  assert.ok(result.toolCount > 0);
  assert.match(result.copiedRoot, /kanmer plugin isolation /);
  assert.equal(existsSync(result.copiedRoot), false, "isolated payload is cleaned after success");
});

function fixture(entrySource) {
  const root = mkdtempSync(join(tmpdir(), "kanmer-plugin-fixture-"));
  const plugin = join(root, "plugin");
  mkdirSync(join(plugin, ".claude-plugin"), { recursive: true });
  mkdirSync(join(plugin, "mcp"), { recursive: true });
  writeFileSync(join(plugin, ".claude-plugin", "plugin.json"), JSON.stringify({ mcpServers: "./mcp/claude.mcp.json" }));
  writeFileSync(join(plugin, "mcp", "claude.mcp.json"), JSON.stringify({
    mcpServers: { kanmer: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/mcp/entry.cjs"] } },
  }));
  writeFileSync(join(plugin, "mcp", "entry.cjs"), entrySource);
  return { root, plugin };
}

test("an external-only dependency cannot be borrowed from the fixture checkout", async () => {
  const fx = fixture('require("../external-only.cjs");');
  let isolatedRoot = "";
  writeFileSync(join(fx.root, "external-only.cjs"), "module.exports = 1;");
  try {
    await assert.rejects(
      checkIsolatedPlugin({ sourcePluginRoot: fx.plugin, timeoutMs: 500, onTempRoot: (path) => { isolatedRoot = path; } }),
      /timed out waiting for initialize|initialize failed/,
    );
    assert.equal(existsSync(isolatedRoot), false, "failed isolated payload is cleaned");
  } finally {
    removeTreeWithRetrySync(fx.root);
  }
});

test("a missing manifest-selected entry fails before a child can borrow anything", async () => {
  const fx = fixture("process.exit(0);");
  let isolatedRoot = "";
  try {
    // The copied payload deliberately lacks the manifest-selected entry.
    rmSync(join(fx.plugin, "mcp", "entry.cjs"));
    await assert.rejects(
      checkIsolatedPlugin({ sourcePluginRoot: fx.plugin, onTempRoot: (path) => { isolatedRoot = path; } }),
      /entry escapes or is missing/,
    );
    assert.equal(existsSync(isolatedRoot), false, "invalid payload is cleaned");
  } finally {
    removeTreeWithRetrySync(fx.root);
  }
});

test("a non-responsive child hits the bounded handshake timeout and is cleaned", async () => {
  const fx = fixture("setInterval(() => {}, 1000);");
  let isolatedRoot = "";
  try {
    await assert.rejects(
      checkIsolatedPlugin({ sourcePluginRoot: fx.plugin, timeoutMs: 100, onTempRoot: (path) => { isolatedRoot = path; } }),
      /timed out waiting for initialize/,
    );
    assert.equal(existsSync(isolatedRoot), false, "timed-out child payload is cleaned");
  } finally {
    removeTreeWithRetrySync(fx.root);
  }
});

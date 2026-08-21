import assert from "node:assert/strict";
import test from "node:test";
import { ownsCoreResolution } from "./lib/plugin-checkout-guard.mjs";

test("accepts a module entry physically owned by the checkout core package", () => {
  assert.equal(ownsCoreResolution({
    ownCore: "/repo/packages/core",
    resolvedCore: "/repo/packages/core/dist/index.js",
    platform: "linux",
  }), true);
});

test("refuses main-checkout resolution leaked into a ticket worktree", () => {
  assert.equal(ownsCoreResolution({
    ownCore: "/repo/.worktrees/mcp-017/packages/core",
    resolvedCore: "/repo/packages/core/dist/index.js",
    platform: "linux",
  }), false);
});

test("does not accept a prefix lookalike or the package directory itself", () => {
  assert.equal(ownsCoreResolution({
    ownCore: "/repo/packages/core",
    resolvedCore: "/repo/packages/core-copy/dist/index.js",
    platform: "linux",
  }), false);
  assert.equal(ownsCoreResolution({
    ownCore: "/repo/packages/core",
    resolvedCore: "/repo/packages/core",
    platform: "linux",
  }), false);
});

test("normalizes Windows separators, drive letters, and path case", () => {
  assert.equal(ownsCoreResolution({
    ownCore: "C:/Repo/Packages/Core",
    resolvedCore: "c:\\repo\\packages\\core\\dist\\index.js",
    platform: "win32",
  }), true);
});

test("keeps POSIX path case significant", () => {
  assert.equal(ownsCoreResolution({
    ownCore: "/repo/packages/core",
    resolvedCore: "/repo/Packages/core/dist/index.js",
    platform: "linux",
  }), false);
});

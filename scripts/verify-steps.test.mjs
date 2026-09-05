// CORE-140: proves the build-once rail claim statically (the root workspace
// build is reached exactly once across the whole VERIFY_STEPS catalogue), and
// exercises build-stamp.mjs's refusal/pass cases against a disposable temp git
// repo rather than this real one.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { VERIFY_STEPS } from "./verify.mjs";
import { assertBuilt, writeStamp } from "./build-stamp.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Static resolution: walk every VERIFY_STEPS entry through package.json
// scripts (root and workspaces) and prove the root `build` script is reached
// exactly once.
// ---------------------------------------------------------------------------

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Map every workspace package name to its scripts and directory. */
function loadWorkspaces() {
  const rootPkg = readJson(join(root, "package.json"));
  const map = new Map();
  map.set(null, { dir: root, scripts: rootPkg.scripts ?? {} });
  const globs = rootPkg.workspaces ?? [];
  const groups = globs.map((glob) => glob.replace(/\/\*$/, ""));
  for (const group of groups) {
    const groupDir = join(root, group);
    let entries;
    try {
      entries = readdirSync(groupDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(groupDir, entry.name, "package.json");
      let pkg;
      try {
        pkg = readJson(pkgPath);
      } catch {
        continue;
      }
      map.set(pkg.name, { dir: join(groupDir, entry.name), scripts: pkg.scripts ?? {} });
    }
  }
  return map;
}

/**
 * Recursively resolve one shell command through `npm run <script>[ -w <ws>]`
 * indirection, recording every `npm run` invocation it passes through.
 * Non-`npm run` leaves (bare `node ...`, tool binaries, etc.) terminate that
 * branch. `&&` chains are split at the top level (none of these scripts use
 * `&&` inside quotes).
 */
function resolve_(command, workspaces, currentWorkspace, invocations, seen) {
  const parts = command.split("&&").map((part) => part.trim());
  for (const part of parts) {
    const match = part.match(/^npm run ([^\s]+)(?:\s+-w\s+(\S+))?$/);
    if (!match) continue; // terminal leaf: node/tsc/tsup/etc — nothing further to expand
    const [, scriptName, wsFlag] = match;
    const targetWorkspace = wsFlag ?? currentWorkspace;
    const key = `${targetWorkspace ?? "<root>"}::${scriptName}`;
    invocations.push({ workspace: targetWorkspace ?? null, script: scriptName });
    if (seen.has(key)) continue; // avoid infinite recursion on a cyclical script (none expected)
    seen.add(key);
    const target = workspaces.get(targetWorkspace ?? null);
    if (!target) continue; // unknown workspace (e.g. --workspaces --if-present forms): leave as a leaf
    const scriptBody = target.scripts[scriptName];
    if (!scriptBody) continue;
    resolve_(scriptBody, workspaces, targetWorkspace ?? null, invocations, seen);
  }
}

describe("VERIFY_STEPS build-once rail (CORE-140)", () => {
  test("the root workspace build script is reached exactly once across the whole rail", () => {
    const workspaces = loadWorkspaces();
    const invocations = [];
    for (const step of VERIFY_STEPS) {
      resolve_(step, workspaces, null, invocations, new Set());
    }
    const rootBuildInvocations = invocations.filter(
      (invocation) => invocation.workspace === null && invocation.script === "build",
    );
    assert.equal(
      rootBuildInvocations.length,
      1,
      `expected the root "build" script to be reached exactly once, got ${rootBuildInvocations.length}: ` +
        JSON.stringify(invocations, null, 2),
    );
  });

  test("test:built and mcpb:check:built never re-invoke the root build script", () => {
    const workspaces = loadWorkspaces();
    for (const entryScript of ["test:built", "mcpb:check:built"]) {
      const invocations = [];
      const body = workspaces.get(null).scripts[entryScript];
      assert.ok(body, `root package.json is missing script "${entryScript}"`);
      resolve_(body, workspaces, null, invocations, new Set());
      const rootBuild = invocations.filter((i) => i.workspace === null && i.script === "build");
      assert.equal(rootBuild.length, 0, `"${entryScript}" must not re-invoke the root build script`);
    }
  });
});

// ---------------------------------------------------------------------------
// build-stamp.mjs refusal / pass cases, against a disposable temp git repo.
// ---------------------------------------------------------------------------

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function writeOutputs(tmp) {
  mkdirSync(join(tmp, "packages", "core", "dist"), { recursive: true });
  mkdirSync(join(tmp, "packages", "mcp-server", "dist", "standalone"), { recursive: true });
  writeFileSync(join(tmp, "packages", "core", "dist", "index.js"), "console.log('core index');\n");
  writeFileSync(join(tmp, "packages", "core", "dist", "browser.js"), "console.log('core browser');\n");
  writeFileSync(join(tmp, "packages", "mcp-server", "dist", "index.js"), "console.log('server');\n");
  writeFileSync(
    join(tmp, "packages", "mcp-server", "dist", "standalone", "kanmer-mcp.cjs"),
    "console.log('standalone');\n",
  );
}

function initTempRepo() {
  const tmp = mkdtempSync(join(tmpdir(), "kanmer-build-stamp-"));
  git(tmp, ["init", "--quiet"]);
  git(tmp, ["config", "user.email", "test@example.com"]);
  git(tmp, ["config", "user.name", "Test"]);
  // Windows' global core.autocrlf=true would otherwise mark every LF-written
  // fixture file as "modified" the moment Git next reads it, corrupting the
  // dirty/clean assertions below for reasons that have nothing to do with
  // build-stamp.mjs.
  git(tmp, ["config", "core.autocrlf", "false"]);
  // dist/ mirrors the real repo's gitignore: writeStamp() writes its stamp
  // file under dist/, and that write must not itself dirty the tree.
  writeFileSync(join(tmp, ".gitignore"), "dist/\n");
  writeFileSync(join(tmp, "package-lock.json"), JSON.stringify({ lockfileVersion: 3 }));
  writeFileSync(join(tmp, "tracked.txt"), "original\n");
  writeOutputs(tmp);
  git(tmp, ["add", "-A"]);
  git(tmp, ["commit", "--quiet", "-m", "initial"]);
  return tmp;
}

describe("build-stamp.mjs (temp git repo)", () => {
  let tmp;

  before(() => {
    tmp = initTempRepo();
  });

  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("assertBuilt refuses when no stamp exists", () => {
    assert.throws(() => assertBuilt(["server", "standalone"], { root: tmp }), /no stamp at/);
  });

  test("writeStamp then assertBuilt passes for a clean, matching tree", () => {
    writeStamp({ root: tmp });
    assert.doesNotThrow(() => assertBuilt(["server", "standalone"], { root: tmp }));
  });

  test("assertBuilt refuses after HEAD moves", () => {
    writeStamp({ root: tmp });
    writeFileSync(join(tmp, "tracked.txt"), "changed for a new commit\n");
    git(tmp, ["commit", "--quiet", "-am", "move head"]);
    assert.throws(() => assertBuilt(["server"], { root: tmp }), /HEAD/);
  });

  test("assertBuilt refuses when the working tree becomes dirty after the stamp", () => {
    writeStamp({ root: tmp });
    writeFileSync(join(tmp, "tracked.txt"), "dirtied after stamp\n");
    assert.throws(() => assertBuilt(["server"], { root: tmp }), /dirty/);
    git(tmp, ["checkout", "--quiet", "--", "tracked.txt"]);
  });

  test("assertBuilt refuses when nodeMajor differs", () => {
    const stamp = writeStamp({ root: tmp });
    const stampPath = join(tmp, "dist", "verify-stamp.json");
    writeFileSync(stampPath, JSON.stringify({ ...stamp, nodeMajor: stamp.nodeMajor + 1 }));
    assert.throws(() => assertBuilt(["server"], { root: tmp }), /Node major/);
  });

  test("assertBuilt refuses when an output hash no longer matches", () => {
    // Isolate the output-hash check from the dirty-tree check the same way as
    // the lockHash case above: corrupt only the recorded output hash.
    const stamp = writeStamp({ root: tmp });
    const stampPath = join(tmp, "dist", "verify-stamp.json");
    const outputs = stamp.outputs.map((output) =>
      output.id === "server" ? { ...output, sha256: `${output.sha256.slice(0, -4)}dead` } : output,
    );
    writeFileSync(stampPath, JSON.stringify({ ...stamp, outputs }));
    assert.throws(() => assertBuilt(["server"], { root: tmp }), /hash mismatch/);
  });

  test("assertBuilt refuses when package-lock.json hash differs", () => {
    // Isolate the lockHash check from the dirty-tree check: editing
    // package-lock.json on disk would also flip `dirty`, which is a separate,
    // already-covered failure mode. Instead corrupt only the recorded
    // lockHash field, exactly as a mismatched lockfile would produce.
    const stamp = writeStamp({ root: tmp });
    const stampPath = join(tmp, "dist", "verify-stamp.json");
    writeFileSync(stampPath, JSON.stringify({ ...stamp, lockHash: `${stamp.lockHash}0000` }));
    assert.throws(() => assertBuilt(["server"], { root: tmp }), /lock/i);
  });
});

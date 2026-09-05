// Records what "already built" means for one rail run, and refuses — never
// silently rebuilds — when a later step's assumption about the build no
// longer holds. Dependency-free, matching the other scripts in this
// directory.
//
// `writeStamp()` is called once, right after `npm run build`, by the rail
// (scripts/verify.mjs). Every later "already built" step calls
// `assertBuilt(ids)` instead of rebuilding, so a stale or tampered output can
// never be silently consumed.
//
// Every exported function takes an optional `{ root }` override so
// scripts/verify-steps.test.mjs can exercise the refusal logic against a
// disposable temp git repo instead of this real repository. The CLI entry
// point always uses the real repo root.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const STAMP_VERSION = 1;

function stampPathFor(root) {
  return join(root, "dist", "verify-stamp.json");
}

function lockPathFor(root) {
  return join(root, "package-lock.json");
}

/** Every output the stamp tracks, keyed by the logical id `assertBuilt` takes. */
function outputFilesFor(root) {
  return {
    core: [
      join(root, "packages", "core", "dist", "index.js"),
      join(root, "packages", "core", "dist", "browser.js"),
    ],
    server: [join(root, "packages", "mcp-server", "dist", "index.js")],
    standalone: [join(root, "packages", "mcp-server", "dist", "standalone", "kanmer-mcp.cjs")],
  };
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function toRelative(root, path) {
  return path.split(root).pop().replace(/\\/g, "/").replace(/^[\\/]/, "");
}

/**
 * A digest of the working tree's dirty state: the porcelain status text
 * (which paths changed and how) plus, for every path that still has content
 * to hash (modified or untracked — not deleted), a hash of that content. Two
 * dirty trees with the same status lines but different content hash
 * differently, and a path going from untracked to modified (or back) also
 * changes the digest because the status line itself changed.
 */
function computeDirtyDigest(root) {
  const porcelain = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  if (porcelain.length === 0) return null;

  const entries = porcelain.split("\0").filter((entry) => entry.length > 0);
  const fileHashes = [];
  for (const entry of entries) {
    // Porcelain v1 format: "XY <path>", with a renamed entry carrying a
    // second NUL-separated "from" path that follow-up split segments already
    // isolated. Only hash paths that currently have readable content.
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    if (status.includes("D")) continue; // deleted: nothing to hash
    const absolute = join(root, path);
    if (!existsSync(absolute) || statSync(absolute).isDirectory()) continue;
    fileHashes.push(`${path}:${sha256File(absolute)}`);
  }
  fileHashes.sort();
  return sha256Text(`${porcelain}\n${fileHashes.join("\n")}`);
}

function computeOutputs(root) {
  const outputs = [];
  for (const [id, paths] of Object.entries(outputFilesFor(root))) {
    for (const path of paths) {
      if (!existsSync(path)) {
        throw new Error(`build-stamp: expected output missing, run the build first: ${path}`);
      }
      const stat = statSync(path);
      outputs.push({
        id,
        path: toRelative(root, path),
        bytes: stat.size,
        sha256: sha256File(path),
      });
    }
  }
  return outputs;
}

export function writeStamp({ root = defaultRoot } = {}) {
  const head = git(root, ["rev-parse", "HEAD"]);
  const dirtyDigest = computeDirtyDigest(root);
  const dirty = dirtyDigest !== null;
  const lockPath = lockPathFor(root);
  const lockHash = existsSync(lockPath) ? sha256File(lockPath) : null;
  const stamp = {
    stampVersion: STAMP_VERSION,
    createdAt: new Date().toISOString(),
    head,
    dirty,
    dirtyDigest,
    lockHash,
    node: process.version,
    nodeMajor: Number(process.versions.node.split(".")[0]),
    platform: process.platform,
    outputs: computeOutputs(root),
  };
  const stampPath = stampPathFor(root);
  mkdirSync(dirname(stampPath), { recursive: true });
  writeFileSync(stampPath, `${JSON.stringify(stamp, null, 2)}\n`, "utf8");
  return stamp;
}

export function readStamp({ root = defaultRoot } = {}) {
  const stampPath = stampPathFor(root);
  if (!existsSync(stampPath)) return null;
  try {
    return JSON.parse(readFileSync(stampPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Refuse — never rebuild — when the stamp does not prove the requested
 * outputs are exactly what is on disk right now. Exits the process with 1 and
 * throws a clear error on any mismatch; returns the stamp on success.
 */
export function assertBuilt(ids, { root = defaultRoot } = {}) {
  const stampPath = stampPathFor(root);
  const outputFiles = outputFilesFor(root);

  // Print the refusal and throw; the CLI entry point below is the only
  // caller that also sets process.exitCode — a library caller (tests,
  // run-http-tests.mjs) gets a plain thrown Error and no side effect on the
  // host process's exit code.
  const fail = (why) => {
    console.error(`build-stamp: refusing — ${why}`);
    console.error("  fix: run the full build (e.g. `npm run build`), not this already-built step, then retry");
    throw new Error(why);
  };

  const stamp = readStamp({ root });
  if (!stamp) return fail(`no stamp at ${stampPath}`);
  if (stamp.stampVersion !== STAMP_VERSION) {
    return fail(`stamp version ${stamp.stampVersion} does not match expected ${STAMP_VERSION}`);
  }

  const head = git(root, ["rev-parse", "HEAD"]);
  if (stamp.head !== head) {
    return fail(`stamp HEAD ${stamp.head} does not match current HEAD ${head}`);
  }

  const dirtyDigest = computeDirtyDigest(root);
  const dirtyNow = dirtyDigest !== null;
  if (stamp.dirty !== dirtyNow) {
    return fail(`stamp dirty=${stamp.dirty} does not match current dirty=${dirtyNow}`);
  }
  if (dirtyNow && stamp.dirtyDigest !== dirtyDigest) {
    return fail("working tree changed since the stamp was written (dirty digest mismatch)");
  }

  const lockPath = lockPathFor(root);
  const lockHash = existsSync(lockPath) ? sha256File(lockPath) : null;
  if (stamp.lockHash !== lockHash) {
    return fail("package-lock.json hash does not match the stamp");
  }

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (stamp.nodeMajor !== nodeMajor) {
    return fail(`stamp Node major ${stamp.nodeMajor} does not match running Node major ${nodeMajor}`);
  }

  for (const id of ids) {
    const paths = outputFiles[id];
    if (!paths) return fail(`unknown output id "${id}"`);
    const recorded = stamp.outputs.filter((output) => output.id === id);
    if (recorded.length !== paths.length) {
      return fail(`stamp is missing recorded outputs for "${id}"`);
    }
    for (const path of paths) {
      if (!existsSync(path)) return fail(`output missing on disk: ${path}`);
      const relative = toRelative(root, path);
      const entry = recorded.find((output) => output.path === relative);
      if (!entry) return fail(`stamp has no record for ${relative}`);
      const currentHash = sha256File(path);
      if (entry.sha256 !== currentHash) {
        return fail(`output hash mismatch for ${relative} (stamp ${entry.sha256}, disk ${currentHash})`);
      }
    }
  }

  return stamp;
}

function main() {
  const argv = process.argv.slice(2);
  const stampPath = stampPathFor(defaultRoot);
  if (argv[0] === "--write") {
    const stamp = writeStamp();
    console.log(`build-stamp: wrote ${stampPath} (head ${stamp.head.slice(0, 12)}, dirty=${stamp.dirty})`);
    return;
  }
  if (argv[0] === "--assert") {
    const ids = argv.slice(1);
    if (ids.length === 0) {
      console.error("build-stamp: --assert needs at least one output id (core, server, standalone)");
      process.exitCode = 1;
      return;
    }
    try {
      assertBuilt(ids);
    } catch {
      process.exitCode = 1;
      return;
    }
    console.log(`build-stamp: asserted ${ids.join(", ")} match the stamp`);
    return;
  }
  console.error("usage: node scripts/build-stamp.mjs --write | --assert <id...>");
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}

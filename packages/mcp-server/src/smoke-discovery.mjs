// Discovery smoke test: spawn the built server with NO `--root` — exactly as
// both plugin manifests do — and prove it finds the board anyway.
//
// Kept out of smoke.mjs deliberately: that script's 85 checks all share one
// `--root` sandbox and one client, and this one needs a different cwd per case
// plus a process that is *expected* to die. Same style, separate run.
//
// No vitest here, and none in this package: FRD-022 records that absence as a
// deliberate decision, and the resolver's unit tests live in @kanmer/core.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = process.env.KANMER_SERVER ?? path.join(__dirname, "..", "dist", "index.js");
const runner = process.env.KANMER_NODE ?? process.execPath;
const runnerEnv = process.env.KANMER_NODE
  ? { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
  : { ...process.env };
// A stray KANMER_ROOT in the ambient environment would short-circuit the very
// step under test.
delete runnerEnv.KANMER_ROOT;
delete runnerEnv.KANMER_INIT;

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/**
 * A fixture repo in the shape the desktop app creates:
 *
 *   <fixture>/.git                     (directory — the hard boundary)
 *   <fixture>/.worktrees/board/.kanmer (the board, on its own branch)
 *   <fixture>/.worktrees/tkt-001/.git  (FILE — a git linked worktree)
 *   <fixture>/.worktrees/tkt-001/src
 *
 * The `.git` FILE is the point: it is what every linked worktree has, and
 * `kanmer-execute` puts every implementing agent inside one.
 */
function makeFixture() {
  // realpath: on macOS os.tmpdir() is a symlink, and process.cwd() resolves it —
  // the paths the server reports back would not otherwise compare equal.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-discover-")));
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".worktrees", "board", ".kanmer"), { recursive: true });
  // A real board carries a marker (MCP-056): version.json is what every
  // format-2+ board has, and discovery no longer accepts a bare directory.
  fs.writeFileSync(path.join(root, ".worktrees", "board", ".kanmer", "version.json"), '{"format":3}\n', "utf8");
  fs.mkdirSync(path.join(root, ".worktrees", "tkt-001", "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".worktrees", "tkt-001", ".git"),
    `gitdir: ${path.join(root, ".git", "worktrees", "tkt-001")}\n`,
    "utf8",
  );
  return root;
}

/** get_status from a server started with no --root, in the given cwd. */
async function statusFrom(cwd) {
  const transport = new StdioClientTransport({
    command: runner,
    args: [serverEntry],
    cwd,
    env: runnerEnv,
  });
  const client = new Client({ name: "smoke-discovery", version: "0.0.0" });
  await client.connect(transport);
  try {
    const res = await client.callTool({ name: "get_status", arguments: {} });
    return JSON.parse(res.content.map((c) => c.text).join("\n"));
  } finally {
    await client.close();
  }
}

/** Run the server with no --root and no board anywhere; collect exit + stderr. */
function bootFailure(cwd) {
  return new Promise((resolve) => {
    const proc = spawn(runner, [serverEntry], { cwd, env: runnerEnv, stdio: "pipe" });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ code, stderr }));
  });
}

const fixture = makeFixture();
const board = path.join(fixture, ".worktrees", "board");

try {
  // (a) The plugin-manifest case: no --root, cwd at the repo root, board parked
  //     in a worktree. This is the invocation that found nothing before MCP-010.
  const a = await statusFrom(fixture);
  check("no --root at the repo root finds the worktree board", a.projectRoot === board,
    `projectRoot=${a.projectRoot}`);
  check("...and says how it found it", a.rootSource === "cwd-worktree", `rootSource=${a.rootSource}`);
  check("...and the board actually exists", a.exists === true, `exists=${a.exists}`);

  // (b) The kanmer-execute case: an implementing agent inside its own ticket
  //     worktree, whose `.git` is a FILE. A "stop wherever .git exists" walk
  //     would halt here and never reach the board.
  const b = await statusFrom(path.join(fixture, ".worktrees", "tkt-001", "src"));
  check("from inside a ticket worktree (.git is a FILE) it still finds the board",
    b.projectRoot === board, `projectRoot=${b.projectRoot}`);
  check("...reported as an ancestor worktree", b.rootSource === "ancestor-worktree",
    `rootSource=${b.rootSource}`);

  // (c) No board anywhere: fatal, loud, and naming every path tried.
  const empty = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-noboard-")));
  fs.mkdirSync(path.join(empty, ".git")); // a real boundary, so the walk is bounded
  const fail = await bootFailure(empty);
  check("no board anywhere exits non-zero", fail.code !== 0, `exit=${fail.code}`);
  check("...with the not-found diagnostic", fail.stderr.includes("no Kanmer board found"),
    fail.stderr.trim().split("\n")[0] ?? "");
  check("...naming the .kanmer path it tried", fail.stderr.includes(path.join(empty, ".kanmer")));
  check("...naming the .worktrees glob it tried",
    fail.stderr.includes(path.join(empty, ".worktrees", "*", ".kanmer")));
  check("...and all three recoveries", fail.stderr.includes("--root") &&
    fail.stderr.includes("KANMER_ROOT") && fail.stderr.includes("--init"));

  // (d) The bootstrap opt-in: --init makes a board-less cwd legal again, which
  //     is what kanmer-setup needs to onboard a repo that has no board yet.
  const initTransport = new StdioClientTransport({
    command: runner,
    args: [serverEntry, "--init"],
    cwd: empty,
    env: runnerEnv,
  });
  const initClient = new Client({ name: "smoke-discovery", version: "0.0.0" });
  await initClient.connect(initTransport);
  const initRes = await initClient.callTool({ name: "get_status", arguments: {} });
  const d = JSON.parse(initRes.content.map((c) => c.text).join("\n"));
  await initClient.close();
  check("--init boots at cwd instead of dying", d.projectRoot === empty, `projectRoot=${d.projectRoot}`);
  check("...and says so", d.rootSource === "init", `rootSource=${d.rootSource}`);
  check("...without creating .kanmer merely by booting", d.exists === false, `exists=${d.exists}`);

  // (e) MCP-056: a `.kanmer` that is only the FRD-029 endpoint registry
  //     (`~/.kanmer/endpoints.json` on any machine that has used remote access)
  //     is not a board. A cwd beneath it with no board of its own used to bind
  //     to that directory and the HTTP host then started against nothing.
  const decoy = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-decoy-")));
  fs.mkdirSync(path.join(decoy, ".git"));
  fs.mkdirSync(path.join(decoy, ".kanmer"));
  fs.writeFileSync(path.join(decoy, ".kanmer", "endpoints.json"), "{}\n", "utf8");
  fs.mkdirSync(path.join(decoy, "work"));
  const decoyFail = await bootFailure(path.join(decoy, "work"));
  check("a registry-only .kanmer above the cwd is not a board", decoyFail.code !== 0, `exit=${decoyFail.code}`);
  check("...and the diagnostic names it as skipped",
    decoyFail.stderr.includes(`${path.join(decoy, ".kanmer")} (no board marker)`),
    decoyFail.stderr.trim().split("\n").slice(0, 4).join(" | "));
} finally {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? "  — " + f.detail : ""}`);
    process.exitCode = 1;
  }
}

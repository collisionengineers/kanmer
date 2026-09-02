// Standalone smoke test: spawn the built server over stdio and exercise tools.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import matter from "gray-matter";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalProjectPath, projectIdentity, redactRemoteOrigin } from "../dist/project-identity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// KANMER_SERVER lets us point the smoke test at the standalone bundle.
const serverEntry =
  process.env.KANMER_SERVER ?? path.join(__dirname, "..", "dist", "index.js");
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-smoke-"));
// A governing doc in the repo's own /docs/, for the refs / link_doc coverage.
fs.mkdirSync(path.join(sandbox, "docs", "prd"), { recursive: true });
fs.writeFileSync(path.join(sandbox, "docs", "prd", "smoke.md"), "# PRD\n", "utf8");

function textOf(res) {
  return res.content.map((c) => c.text).join("\n");
}

/**
 * MCP-055: a successful result's `structuredContent.result` must mirror the
 * text block exactly, so a client that renders structured content shows the
 * whole payload instead of only the project stamp.
 */
function mirrorsText(res) {
  return JSON.stringify(JSON.parse(textOf(res))) === JSON.stringify(res.structuredContent?.result);
}

/** A byte-sensitive snapshot for proving a refused fresh-root write is inert. */
function treeSnapshot(root, rel = "") {
  return fs.readdirSync(path.join(root, rel), { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(rel, entry.name);
      if (entry.isDirectory()) return [`d:${child}`, ...treeSnapshot(root, child)];
      return [`f:${child}:${createHash("sha256").update(fs.readFileSync(path.join(root, child))).digest("hex")}`];
    })
    .sort();
}

// KANMER_NODE lets us run the server through the Electron binary as node
// (ELECTRON_RUN_AS_NODE=1), matching how the packaged app launches it.
const runner = process.env.KANMER_NODE ?? process.execPath;
const runnerEnv = process.env.KANMER_NODE
  ? { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
  : process.env;

// MCP-054: the endpoint registry location is fixed at spawn time by the
// operator (here: the harness), never by a request. The file itself is written
// later, once the second fixture exists — the server reads it per call.
const registryFile = path.join(sandbox, "endpoints.json");
runnerEnv.KANMER_ENDPOINT_REGISTRY = registryFile;
const sandboxB = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-smoke-b-"));

const transport = new StdioClientTransport({
  command: runner,
  args: [serverEntry, "--root", sandbox],
  env: runnerEnv,
});
const client = new Client({ name: "smoke", version: "0.0.0" });
const expectedBoardBranch = process.env.KANMER_BOARD_BRANCH?.trim() || "kanmer-board";

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

try {
  await client.connect(transport);

  const tools = await client.listTools();
  check("tools/list returns 41 tools", tools.tools.length === 41, `got ${tools.tools.length}`);
  for (const name of [
    "append_scratch",
    "reconcile_ticket",
    "apply_reconciliation",
    "release_channel",
    "link_doc",
    "get_doc_gates",
    "migrate_board",
    "create_group",
    "update_group",
    "get_group",
    "list_groups",
    "get_group_doc",
    "set_group_doc",
    "get_execution_packet",
    "dispatch_task",
    "list_dispatches",
    "cancel_dispatch",
  ]) {
    check(`${name} tool exists`, tools.tools.some((t) => t.name === name));
  }
  check(
    "get_doc_gates is read-only",
    tools.tools.find((t) => t.name === "get_doc_gates")?.annotations?.readOnlyHint === true,
  );

  const del = tools.tools.find((t) => t.name === "delete_item");
  check("delete_item is destructive", del?.annotations?.destructiveHint === true);
  const list = tools.tools.find((t) => t.name === "list_items");
  check("list_items is read-only", list?.annotations?.readOnlyHint === true);
  check("add_column tool exists", tools.tools.some((t) => t.name === "add_column"));
  const gs = tools.tools.find((t) => t.name === "get_status");
  check("get_status is read-only", gs?.annotations?.readOnlyHint === true);
  const gtd = tools.tools.find((t) => t.name === "get_ticket_doc");
  check("get_ticket_doc is read-only", gtd?.annotations?.readOnlyHint === true);
  const gep = tools.tools.find((t) => t.name === "get_execution_packet");
  check("get_execution_packet is read-only", gep?.annotations?.readOnlyHint === true);
  check(
    "get_execution_packet accepts the complete exact prior step packet",
    gep?.inputSchema?.properties?.prior_step_packet?.type === "object",
  );
  const reconcileInspector = tools.tools.find((t) => t.name === "reconcile_ticket");
  check(
    "reconcile_ticket accepts a complete immutable step packet",
    reconcileInspector?.inputSchema?.properties?.step_packet?.type === "object",
  );
  const dispatchStart = tools.tools.find((t) => t.name === "dispatch_task");
  const dispatchList = tools.tools.find((t) => t.name === "list_dispatches");
  const dispatchCancel = tools.tools.find((t) => t.name === "cancel_dispatch");
  check("dispatch_task is mutating and project-bound", dispatchStart?.annotations?.readOnlyHint === false && dispatchStart.inputSchema?.properties?.expected_project?.type === "string");
  check("list_dispatches is read-only", dispatchList?.annotations?.readOnlyHint === true);
  check("cancel_dispatch is mutating and project-bound", dispatchCancel?.annotations?.readOnlyHint === false && dispatchCancel.inputSchema?.properties?.expected_project?.type === "string");
  const rmc = tools.tools.find((t) => t.name === "remove_column");
  check("remove_column is destructive", rmc?.annotations?.destructiveHint === true);
  const createItemsTool = tools.tools.find((t) => t.name === "create_items");
  check(
    "every mutating tool exposes optional expected_project at the call boundary",
    tools.tools
      .filter((t) => t.annotations?.readOnlyHint === false)
      .every((t) => t.inputSchema?.properties?.expected_project?.type === "string" &&
        !t.inputSchema?.required?.includes("expected_project")),
  );
  check(
    "create_items keeps expected_project out of individual item entries",
    createItemsTool?.inputSchema?.properties?.expected_project?.type === "string" &&
      createItemsTool?.inputSchema?.properties?.items?.items?.properties?.expected_project === undefined,
  );
  const statusAtStart = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
  check("get_status exposes dispatch policy", statusAtStart.dispatch?.enabled === false && typeof statusAtStart.dispatch?.reason === "string");
  const disabledDispatch = await client.callTool({ name: "dispatch_task", arguments: { ticket_id: "TICK-001", provider: "claude", task: "research-quick" } });
  const disabledPayload = JSON.parse(textOf(disabledDispatch));
  check("default-disabled dispatch refuses without side effects", disabledPayload.ok === false && disabledPayload.code === "DISPATCH_DISABLED");
  const disabledList = JSON.parse(textOf(await client.callTool({ name: "list_dispatches", arguments: {} })));
  check("list_dispatches reports disabled policy", disabledList.policy?.enabled === false && Array.isArray(disabledList.dispatches));
  const disabledCancel = JSON.parse(textOf(await client.callTool({ name: "cancel_dispatch", arguments: { dispatch_id: "not-real" } })));
  check("cancel_dispatch refuses while disabled", disabledCancel.ok === false && disabledCancel.code === "DISPATCH_DISABLED");
  const posixIdentity = projectIdentity({
    boardRoot: "/srv/kanmer-board/",
    format: 3,
    repoRoot: "/srv/kanmer-repo///",
    boardSource: "default",
  });
  const posixFileIdentity = projectIdentity({
    boardRoot: "/srv/kanmer-board/",
    format: 3,
    repoRoot: "/srv/kanmer-repo///",
    boardSource: "file",
  });
  const windowsIdentity = projectIdentity({
    boardRoot: "C:\\Kanmer\\Board\\",
    format: 3,
    repoRoot: "C:\\Kanmer\\Repo\\",
    boardSource: "file",
  });
  const expectedWindowsDrive = process.platform === "win32"
    ? path.parse(process.cwd()).root.replace(/[\\/]+$/, "").toLowerCase()
    : "";
  const expectedPosixBoardRoot = process.platform === "win32"
    ? `${expectedWindowsDrive}/srv/kanmer-board`
    : "/srv/kanmer-board";
  const expectedPosixRepoRoot = process.platform === "win32"
    ? `${expectedWindowsDrive}/srv/kanmer-repo`
    : "/srv/kanmer-repo";
  check(
    "project identity canonicalizes POSIX and Windows roots without changing path case",
    posixIdentity.boardRoot === expectedPosixBoardRoot &&
      posixIdentity.repoRoot === expectedPosixRepoRoot &&
      windowsIdentity.boardRoot === "c:/Kanmer/Board" &&
      windowsIdentity.repoRoot === "c:/Kanmer/Repo" &&
      canonicalProjectPath("C:\\") === "c:/",
    JSON.stringify({ posixIdentity, windowsIdentity }),
  );
  check(
    "remote origin userinfo is stripped before it is reported or hashed (F-003)",
    redactRemoteOrigin("https://user:ghp_secret@github.com/o/r.git") === "https://github.com/o/r.git" &&
      redactRemoteOrigin("ssh://git@github.com/o/r.git") === "ssh://github.com/o/r.git" &&
      redactRemoteOrigin("git@github.com:o/r.git") === "git@github.com:o/r.git" &&
      redactRemoteOrigin("user:token@github.com:o/r.git") === "user@github.com:o/r.git" &&
      redactRemoteOrigin("https://github.com/o/r.git") === "https://github.com/o/r.git" &&
      redactRemoteOrigin("  ") === null && redactRemoteOrigin(null) === null,
    JSON.stringify([redactRemoteOrigin("https://user:ghp_secret@github.com/o/r.git"), redactRemoteOrigin("user:token@github.com:o/r.git")]),
  );
  check(
    "project identity hash has the exact ordered payload and excludes boardSource",
    posixIdentity.fingerprint ===
      `kanmer-proj-v1:${createHash("sha256").update(JSON.stringify({ boardRoot: expectedPosixBoardRoot, format: 3, repoRoot: expectedPosixRepoRoot })).digest("hex")}` &&
      posixIdentity.fingerprint === posixFileIdentity.fingerprint,
    `${posixIdentity.fingerprint} vs ${posixFileIdentity.fingerprint}`,
  );

  const boardRes = await client.callTool({ name: "list_board", arguments: {} });
  const board = JSON.parse(textOf(boardRes));
  check(
    "list_board returns the fixed six stages",
    JSON.stringify(board.stages.map((s) => s.id)) ===
      JSON.stringify(["backlog", "preparing", "implementing", "review", "verifying", "done"]),
    board.stages.map((s) => s.id).join(">"),
  );
  check("board has no phases dimension", board.phases === undefined);
  check("board has no priorities dimension", board.priorities === undefined);
  check(
    "list_board surfaces the shipped profiles",
    ["feature", "fix", "chore", "spike", "custom"].every((p) => board.profiles[p] !== undefined),
    Object.keys(board.profiles ?? {}).join(","),
  );
  check("list_board surfaces proof types", (board.proofTypes ?? []).includes("visual"));
  check("list_board surfaces group kinds", (board.groupKinds ?? []).some((k) => k.id === "epic"));
  check(
    "list_board surfaces the doc vocabulary and gate-exempt folders",
    (board.docTypes ?? []).includes("files") && (board.gateExemptFolders ?? []).includes("reference"),
  );
  check("board carries areas array", Array.isArray(board.areas));
  check("list_board reports source: default before any write", board.source === "default", board.source);

  const itemsBeforeWrite = await client.callTool({ name: "list_items", arguments: {} });
  check("list_items works before any write", JSON.parse(textOf(itemsBeforeWrite)).length === 0);
  const statusBefore = JSON.parse(
    textOf(await client.callTool({ name: "get_status", arguments: {} })),
  );
  check(
    "get_status reports exists=false, format 3, default board on a fresh root",
    statusBefore.exists === false &&
      statusBefore.format === 3 &&
      statusBefore.boardSource === "default",
  );
  const expectedProject = statusBefore.project?.fingerprint;
  const expectedPayload = JSON.stringify({
    boardRoot: path.resolve(sandbox).replace(/\\/g, "/").replace(/^([A-Z]):/, (_, drive) => `${drive.toLowerCase()}:`),
    format: 3,
    repoRoot: path.resolve(sandbox).replace(/\\/g, "/").replace(/^([A-Z]):/, (_, drive) => `${drive.toLowerCase()}:`),
  });
  check(
    "get_status exposes the canonical versioned project fingerprint",
    typeof expectedProject === "string" &&
      expectedProject === `kanmer-proj-v1:${createHash("sha256").update(expectedPayload).digest("hex")}` &&
      statusBefore.project?.boardSource === "default" &&
      statusBefore.compat?.expectedProject === "optional",
    JSON.stringify(statusBefore.project),
  );
  const beforeWrongProject = treeSnapshot(sandbox);
  const wrongProject = await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "Rejected wrong project", expected_project: "kanmer-proj-v1:wrong" },
  });
  check(
    "wrong expected_project fails before lazy initialization with structured WRONG_PROJECT",
    wrongProject.isError === true &&
      textOf(wrongProject).startsWith("Error:") &&
      wrongProject.structuredContent?.error?.code === "WRONG_PROJECT" &&
      !fs.existsSync(path.join(sandbox, ".kanmer")) &&
      JSON.stringify(treeSnapshot(sandbox)) === JSON.stringify(beforeWrongProject),
    JSON.stringify(wrongProject.structuredContent),
  );
  check(
    "an error result's structuredContent carries no result key (MCP-055)",
    wrongProject.structuredContent?.result === undefined &&
      wrongProject.structuredContent?.error !== undefined,
    JSON.stringify(Object.keys(wrongProject.structuredContent ?? {})),
  );
  check(
    "reads alone do not create .kanmer/ (lazy init)",
    !fs.existsSync(path.join(sandbox, ".kanmer")),
  );
  const healthBefore = statusBefore.boardWorktree;
  check(
    "get_status reports boardSync as null or integer ahead/behind counts (CORE-123)",
    statusBefore.boardSync === null ||
      (Number.isInteger(statusBefore.boardSync?.ahead) &&
        Number.isInteger(statusBefore.boardSync?.behind) &&
        typeof statusBefore.boardSync?.remoteBranch === "string"),
    JSON.stringify(statusBefore.boardSync),
  );
  check(
    "get_status reports the complete informational board worktree block",
    JSON.stringify(Object.keys(healthBefore ?? {}).sort()) ===
      JSON.stringify(["actualBranch", "boardSource", "expectedBranch", "onBoardBranch", "path", "repair", "ticketCount"]),
    JSON.stringify(healthBefore),
  );
  check(
    "board worktree reports the synthesized sandbox without Git as unhealthy data",
      healthBefore?.path === path.resolve(sandbox) &&
      healthBefore?.expectedBranch === expectedBoardBranch &&
      healthBefore?.actualBranch === null &&
      healthBefore?.onBoardBranch === false &&
      healthBefore?.boardSource === "default" &&
      healthBefore?.ticketCount === 0 &&
      /synthesized default/.test(healthBefore?.repair ?? ""),
    JSON.stringify(healthBefore),
  );
  execFileSync("git", ["init"], { cwd: sandbox, windowsHide: true, stdio: "ignore" });
  execFileSync("git", ["symbolic-ref", "HEAD", `refs/heads/${expectedBoardBranch}`], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  execFileSync("git", ["add", "docs"], { cwd: sandbox, windowsHide: true, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Kanmer smoke", "-c", "user.email=smoke@example.invalid", "commit", "-m", "smoke fixture"], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  const healthyBranch = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
  check(
    "board worktree observes the expected branch without repairing it",
    healthyBranch.boardWorktree?.actualBranch === expectedBoardBranch &&
      healthyBranch.boardWorktree?.onBoardBranch === true,
    JSON.stringify(healthyBranch.boardWorktree),
  );

  // --- Server identity (MCP-012) -------------------------------------------
  // The point of this block is that a build can be told apart from another
  // build. Asserting `typeof === "string"` would pass for a server that
  // reported a constant, so the sha is recomputed here, from the very file this
  // test spawned, and compared. That is the actual claim.
  const id = statusBefore.server;
  check("get_status carries a server identity block", !!id && typeof id === "object");
  const spawnedPath = path.resolve(serverEntry);
  check(
    "server.path is the script the smoke test actually spawned",
    id?.path === spawnedPath,
    `${id?.path} vs ${spawnedPath}`,
  );
  const expectedSha = createHash("sha256").update(fs.readFileSync(spawnedPath)).digest("hex");
  check(
    "server.sha256 is the real hash of that file's bytes",
    id?.sha256 === expectedSha,
    `${id?.sha256?.slice(0, 16)}… vs ${expectedSha.slice(0, 16)}…`,
  );
  check(
    "server.sha256Short is the first 8 chars of server.sha256",
    id?.sha256Short === expectedSha.slice(0, 8),
    id?.sha256Short,
  );
  check(
    "server.size matches the file on disk",
    id?.size === fs.statSync(spawnedPath).size,
    `${id?.size}`,
  );
  check("server.mtime parses as a date", !Number.isNaN(Date.parse(id?.mtime ?? "")), id?.mtime);
  check(
    "server.build classifies the shape",
    ["packaged", "plugin", "dev-standalone", "dev-esm", "unknown"].includes(id?.build),
    id?.build,
  );
  // Whichever entry the run used, the classifier must not shrug at it: both the
  // default (dist/index.js) and KANMER_SERVER=…/dist/standalone/… are known
  // shapes, and "unknown" for either would be a real regression.
  check(
    "server.build is a known shape for this entry, not unknown",
    id?.build !== "unknown",
    `${id?.build} for ${spawnedPath}`,
  );
  check(
    "server.version is the injected release version, not the stale 0.1.0",
    typeof id?.version === "string" && /^\d+\.\d+\.\d+/.test(id.version) && id.version !== "0.1.0",
    id?.version,
  );
  check(
    "the MCP handshake reports the same version as the identity block",
    client.getServerVersion()?.version === id?.version,
    `${client.getServerVersion()?.version} vs ${id?.version}`,
  );

  // Root provenance: both roots, and how each was reached (MCP-012 / ADR-0012).
  check("get_status reports rootSource", statusBefore.rootSource === "flag", statusBefore.rootSource);
  check(
    "get_status reports repoRoot — what governing-doc refs resolve against",
    statusBefore.repoRoot === path.resolve(sandbox),
    statusBefore.repoRoot,
  );
  // No --repo-root is passed below, and the sandbox is not a .worktrees/<n>
  // board, so core falls back to the project root: "derived" is the honest
  // answer and the flag/env branches must not claim it.
  check(
    "get_status reports repoRootSource",
    statusBefore.repoRootSource === "derived",
    statusBefore.repoRootSource,
  );

  // --- Repo staleness (CORE-023) -------------------------------------------
  // Same standard the identity block above was held to: asserting the field
  // exists would pass for a server that reported a constant. So this makes the
  // sandbox stale on purpose and requires the verdict to change. The sandbox is
  // a bare temp dir with no AGENTS.md, no skills and no board.yml, so the only
  // artefact in play is the managed block — which is the one with a live
  // regression behind it (CORE-023 scratch-live-reproduction).
  const repoBefore = statusBefore.repo;
  check("get_status carries a repo staleness block", !!repoBefore && typeof repoBefore === "object");
  check(
    "a repo with nothing installed is not reported as behind",
    repoBefore?.upToDate === true,
    JSON.stringify(repoBefore?.stale?.map((e) => `${e.artefact}:${e.state}`) ?? []),
  );
  const blockBefore = (repoBefore?.stale ?? []).filter((e) => e.artefact === "agents-block");
  check(
    "an absent AGENTS.md is unstamped, not behind",
    blockBefore.length === 1 && blockBefore[0].state === "unstamped",
    JSON.stringify(blockBefore),
  );
  check(
    "every staleness entry is itemised: artefact, state, detail and fix",
    (repoBefore?.stale ?? []).every(
      (e) =>
        ["behind", "compensated", "unstamped", "unknown"].includes(e.state) &&
        typeof e.detail === "string" && e.detail !== "" &&
        typeof e.fix === "string" && e.fix !== "",
    ),
  );

  // Now write a stale managed block — a v2-era body of exactly the shape
  // Connect really did write over this repo's AGENTS.md — and require the
  // detector to catch it. This is the ticket's first acceptance criterion,
  // executed.
  const BLOCK_START =
    "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
  const BLOCK_END = "<!-- kanmer:instructions:end -->";
  fs.writeFileSync(
    path.join(sandbox, "AGENTS.md"),
    `${BLOCK_START}\n# Kanmer operating instructions\n\nStages: backlog → researching → planning → implementing → review → verifying → done.\n${BLOCK_END}\n\n# Their guide\n`,
    "utf8",
  );
  const statusStale = JSON.parse(
    textOf(await client.callTool({ name: "get_status", arguments: {} })),
  );
  const blockStale = (statusStale.repo?.stale ?? []).filter((e) => e.artefact === "agents-block");
  check(
    "a stale AGENTS.md managed block is reported as behind",
    blockStale.length === 1 && blockStale[0].state === "behind",
    JSON.stringify(blockStale),
  );
  check(
    "one behind entry clears repo.upToDate",
    statusStale.repo?.upToDate === false,
    `${statusStale.repo?.upToDate}`,
  );
  check(
    "the behind entry names a fix rather than applying one",
    /kanmer-setup|agents-block/.test(blockStale[0]?.fix ?? ""),
    blockStale[0]?.fix,
  );
  // Detection only: get_status is readOnlyHint and must not have repaired it.
  check(
    "get_status did not rewrite the stale block it reported",
    fs.readFileSync(path.join(sandbox, "AGENTS.md"), "utf8").includes("researching → planning"),
  );
  // And the verdict is not cached: undo the damage and it must go clean again
  // in the same process — the whole reason the detector re-reads per call.
  fs.rmSync(path.join(sandbox, "AGENTS.md"));
  const statusFixed = JSON.parse(
    textOf(await client.callTool({ name: "get_status", arguments: {} })),
  );
  check(
    "the verdict is recomputed, not cached, so a repair is seen immediately",
    statusFixed.repo?.upToDate === true,
    JSON.stringify(statusFixed.repo?.stale?.map((e) => `${e.artefact}:${e.state}`) ?? []),
  );

  const created = await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "Smoke ticket", body: "See [[PLAN-001]]", expected_project: expectedProject },
  });
  const createdItem = JSON.parse(textOf(created));
  check("create_item allocates TICK-001", createdItem.id === "TICK-001", createdItem.id);
  check(
    "create_item defaults to the first stage",
    createdItem.status === "backlog",
    createdItem.status,
  );
  check(
    "first write lazily creates .kanmer/",
    fs.existsSync(path.join(sandbox, ".kanmer")),
  );

  const plan = await client.callTool({
    name: "create_item",
    arguments: { type: "plan", title: "Smoke plan" },
  });
  check(
    "create_item rejects standalone plans on a v2 board, naming set_ticket_doc",
    // Unclassified errors still carry no `error` code; since FRD-029 every
    // result (errors included) names the logical project, so the block is no
    // longer absent — only the code is.
    plan.isError === true && textOf(plan).includes("set_ticket_doc") &&
      plan.structuredContent?.error === undefined &&
      typeof plan.structuredContent?.project?.fingerprint === "string",
    JSON.stringify(plan.structuredContent),
  );

  // Created directly in implementing — creation is ungated, so imports/backfills
  // of in-flight work land wherever they belong.
  const second = await client.callTool({
    name: "create_item",
    arguments: {
      type: "ticket",
      title: "Second ticket",
      status: "implementing",
      // feature is the profile that gates enter-review and enter-done, which
      // is what the next few checks are about.
      profile: "feature",
      body: "See [[TICK-001]]",
    },
  });
  check("create_item allocates TICK-002 into implementing", JSON.parse(textOf(second)).id === "TICK-002");

  // Document gate: entering review needs post-implementation-report.
  const gatedReview = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-002", status: "review" },
  });
  check(
    "move_item into review is gated on post-implementation-report",
    gatedReview.isError === true && textOf(gatedReview).includes("post-implementation-report") &&
      gatedReview.structuredContent?.error?.code === "GATE_BLOCKED",
  );

  const badMove = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-001", status: "in-progress" },
  });
  check("move_item rejects a status the board doesn't define", badMove.isError === true);

  const boardAfterWrite = JSON.parse(
    textOf(await client.callTool({ name: "list_board", arguments: {} })),
  );
  check("list_board reports source: file once board.yml exists", boardAfterWrite.source === "file");
  const wrongBulk = await client.callTool({
    name: "create_items",
    arguments: { items: [{ title: "must not bulk create" }], expected_project: "kanmer-proj-v1:wrong" },
  });
  check(
    "wrong expected_project rejects create_items before any entry is created",
    wrongBulk.isError === true && wrongBulk.structuredContent?.error?.code === "WRONG_PROJECT" &&
      JSON.parse(textOf(await client.callTool({ name: "list_items", arguments: {} }))).length === 2,
    JSON.stringify(wrongBulk.structuredContent),
  );
  const wrongMigration = await client.callTool({
    name: "migrate_board",
    arguments: { dry_run: true, expected_project: "kanmer-proj-v1:wrong" },
  });
  check(
    "wrong expected_project rejects dry-run migrate_board before its handler",
    wrongMigration.isError === true && wrongMigration.structuredContent?.error?.code === "WRONG_PROJECT",
    JSON.stringify(wrongMigration.structuredContent),
  );

  const conflict = await client.callTool({
    name: "update_item",
    arguments: { id: "TICK-001", title: "New", expected_updated: "2000-01-01T00:00:00.000Z" },
  });
  check(
    "update_item with stale expected_updated returns a conflict",
    conflict.isError === true && textOf(conflict).includes("Conflict") &&
      conflict.structuredContent?.error?.code === "REVISION_CONFLICT",
  );

  const traversal = await client.callTool({ name: "get_item", arguments: { id: "../evil" } });
  check("get_item rejects a traversal id", traversal.isError === true);

  const statusAfter = JSON.parse(
    textOf(await client.callTool({ name: "get_status", arguments: {} })),
  );
  check(
    "get_status reflects the created state",
    statusAfter.exists === true &&
      statusAfter.boardSource === "file" &&
      statusAfter.counts.byStage.implementing === 1,
    JSON.stringify(statusAfter.counts.byStage),
  );
  check(
    "transport expected_project is not persisted in ticket frontmatter",
    !fs.readFileSync(path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001", "TICK-001.md"), "utf8").includes("expected_project"),
  );

  // --- FRD-029: logical project identity and revision-safe mutations ------
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const projectId = statusAfter.project?.project_id;
  check(
    "a fresh board is born with a generated logical project_id on its first write",
    UUID_RE.test(projectId ?? "") &&
      statusAfter.project?.board_id === projectId &&
      statusAfter.project?.identity === "logical" &&
      statusAfter.project?.origin === "generated" &&
      statusAfter.project?.fingerprint === expectedProject &&
      statusAfter.compat?.projectIdentity === "logical" &&
      statusAfter.compat?.expectedRevision === "optional",
    JSON.stringify(statusAfter.project),
  );
  check(
    "the identity was unassigned before that first write and reads never allocate",
    statusBefore.project?.identity === "unassigned" && statusBefore.project?.project_id === null,
    JSON.stringify(statusBefore.project),
  );
  const projectFile = JSON.parse(fs.readFileSync(path.join(sandbox, ".kanmer", "project.json"), "utf8"));
  check(
    "project.json persists the identity additively (no format bump, version.json untouched)",
    projectFile.schema === 1 && projectFile.project_id === projectId && projectFile.origin === "generated" &&
      JSON.parse(fs.readFileSync(path.join(sandbox, ".kanmer", "version.json"), "utf8")).format === 3,
    JSON.stringify(projectFile),
  );
  const location = statusAfter.project?.location;
  check(
    "get_status reports a separate machine-local location fingerprint",
    typeof location?.fingerprint === "string" && location.fingerprint.startsWith("kanmer-loc-v1:") &&
      typeof location.boardPath === "string" && typeof location.repoPath === "string" &&
      "machine" in location && "boardBranch" in location && "remoteOrigin" in location &&
      location.remoteOrigin === null,
    JSON.stringify(location),
  );
  const readWithProject = await client.callTool({ name: "get_item", arguments: { id: "TICK-001" } });
  check(
    "every read result identifies the logical project in structuredContent.project",
    readWithProject.structuredContent?.project?.project_id === projectId &&
      readWithProject.structuredContent?.project?.fingerprint === expectedProject,
    JSON.stringify(readWithProject.structuredContent),
  );
  const acceptedById = await client.callTool({
    name: "update_item",
    arguments: { id: "TICK-001", labels: ["identity"], expected_project: projectId },
  });
  check(
    "expected_project accepts the logical project_id and every write result names the project",
    acceptedById.isError !== true && acceptedById.structuredContent?.project?.project_id === projectId,
    JSON.stringify(acceptedById.structuredContent),
  );
  const mirroredStatus = await client.callTool({ name: "get_status", arguments: {} });
  check(
    "structuredContent.result mirrors the text payload for a read, a write and get_status (MCP-055)",
    mirrorsText(readWithProject) && mirrorsText(acceptedById) && mirrorsText(mirroredStatus),
    JSON.stringify([
      mirrorsText(readWithProject),
      mirrorsText(acceptedById),
      mirrorsText(mirroredStatus),
    ]),
  );
  const wrongId = await client.callTool({
    name: "update_item",
    arguments: { id: "TICK-001", labels: ["stolen"], expected_project: "00000000-0000-4000-8000-000000000000" },
  });
  check(
    "a foreign project_id is refused with WRONG_PROJECT naming this project",
    wrongId.isError === true && wrongId.structuredContent?.error?.code === "WRONG_PROJECT" &&
      wrongId.structuredContent?.project?.project_id === projectId &&
      textOf(wrongId).includes(projectId) &&
      JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: "TICK-001" } }))).labels?.includes("identity"),
    JSON.stringify(wrongId.structuredContent),
  );
  check(
    "no mutating tool schema lets a request choose a project path",
    tools.tools
      .filter((t) => t.annotations?.readOnlyHint === false)
      .every((t) => !["root", "path_root", "project_root", "board_root", "repo_root", "cwd"].some((k) => k in (t.inputSchema?.properties ?? {}))),
  );
  check(
    "ticket mutations expose optional expected_revision",
    ["update_item", "move_item", "take_ticket", "set_ticket_doc", "append_scratch", "link_doc", "link_items"].every((name) => {
      const tool = tools.tools.find((t) => t.name === name);
      return tool?.inputSchema?.properties?.expected_revision?.type === "string" &&
        !tool.inputSchema?.required?.includes("expected_revision");
    }),
  );
  const revisionedItem = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: "TICK-001" } })));
  const revisionBefore = revisionedItem.revision;
  check(
    "get_item exposes a document-inclusive revision that is not written to frontmatter",
    typeof revisionBefore === "string" && revisionBefore.startsWith("rev1:") &&
      !fs.readFileSync(path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001", "TICK-001.md"), "utf8").includes("revision"),
    String(revisionBefore),
  );
  const proofWrite = await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-001", doc: "proof", content: "# proof v1", expected_revision: revisionBefore },
  });
  const revisionAfterProof = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: "TICK-001" } })));
  check(
    "a proof write with the current revision is accepted and moves the ticket revision without touching `updated` (F-015)",
    proofWrite.isError !== true &&
      JSON.parse(textOf(proofWrite)).revision === revisionAfterProof.revision &&
      revisionAfterProof.revision !== revisionBefore &&
      revisionAfterProof.updated === revisionedItem.updated,
    JSON.stringify({ before: revisionBefore, after: revisionAfterProof.revision, written: JSON.parse(textOf(proofWrite)).revision }),
  );
  const ticketBytesBefore = treeSnapshot(path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001"));
  const staleDoc = await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-001", doc: "proof", content: "# clobber", expected_revision: revisionBefore },
  });
  const staleUpdate = await client.callTool({
    name: "update_item",
    arguments: { id: "TICK-001", title: "clobber", expected_revision: revisionBefore },
  });
  const staleScratch = await client.callTool({
    name: "append_scratch",
    arguments: { id: "TICK-001", content: "clobber", expected_revision: revisionBefore },
  });
  check(
    "a stale expected_revision is refused with REVISION_CONFLICT and nothing is written",
    [staleDoc, staleUpdate, staleScratch].every((res) =>
      res.isError === true && textOf(res).startsWith("Conflict:") && res.structuredContent?.error?.code === "REVISION_CONFLICT") &&
      JSON.stringify(treeSnapshot(path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001"))) === JSON.stringify(ticketBytesBefore),
    JSON.stringify([staleDoc.structuredContent, staleUpdate.structuredContent, staleScratch.structuredContent]),
  );

  // A copy of the board at another path is the SAME logical project with a
  // DIFFERENT location (FRD-029 acceptance 1).
  const copyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-smoke-copy-"));
  fs.cpSync(path.join(sandbox, ".kanmer"), path.join(copyRoot, ".kanmer"), { recursive: true });
  const copyTransport = new StdioClientTransport({ command: runner, args: [serverEntry, "--root", copyRoot], env: runnerEnv });
  const copyClient = new Client({ name: "copy-smoke", version: "0.0.0" });
  try {
    await copyClient.connect(copyTransport);
    const copyStatus = JSON.parse(textOf(await copyClient.callTool({ name: "get_status", arguments: {} })));
    check(
      "a copied board at another path keeps its project_id and differs only in location",
      copyStatus.project?.project_id === projectId &&
        copyStatus.project?.identity === "logical" &&
        copyStatus.project?.location?.fingerprint !== location?.fingerprint &&
        copyStatus.project?.fingerprint !== expectedProject,
      JSON.stringify(copyStatus.project),
    );
    const crossWrite = await copyClient.callTool({
      name: "update_item",
      arguments: { id: "TICK-001", labels: ["cross"], expected_project: expectedProject },
    });
    check(
      "the legacy fingerprint of the original location is a WRONG_PROJECT at the copy, while the logical id is accepted",
      crossWrite.isError === true && crossWrite.structuredContent?.error?.code === "WRONG_PROJECT" &&
        (await copyClient.callTool({ name: "update_item", arguments: { id: "TICK-001", labels: ["cross"], expected_project: projectId } })).isError !== true,
      JSON.stringify(crossWrite.structuredContent),
    );
  } finally {
    await copyClient.close();
    fs.rmSync(copyRoot, { recursive: true, force: true });
  }

  // A legacy board (no project.json) receives its identity once, on migrate_board, with the fallback recorded.
  const legacyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-smoke-legacy-"));
  fs.cpSync(path.join(sandbox, ".kanmer"), path.join(legacyRoot, ".kanmer"), { recursive: true });
  fs.rmSync(path.join(legacyRoot, ".kanmer", "project.json"));
  const legacyTransport = new StdioClientTransport({ command: runner, args: [serverEntry, "--root", legacyRoot], env: runnerEnv });
  const legacyClient = new Client({ name: "legacy-smoke", version: "0.0.0" });
  try {
    await legacyClient.connect(legacyTransport);
    const legacyStatus = JSON.parse(textOf(await legacyClient.callTool({ name: "get_status", arguments: {} })));
    const guessed = await legacyClient.callTool({
      name: "update_item",
      arguments: { id: "TICK-001", labels: ["guess"], expected_project: projectId },
    });
    check(
      "a legacy board reports identity unassigned and a guessed project_id is WRONG_PROJECT until migrated",
      legacyStatus.project?.identity === "unassigned" && legacyStatus.project?.project_id === null &&
        guessed.isError === true && guessed.structuredContent?.error?.code === "WRONG_PROJECT" &&
        !fs.existsSync(path.join(legacyRoot, ".kanmer", "project.json")),
      JSON.stringify(guessed.structuredContent),
    );
    // A dry run is truly read-only (F-002): it previews the allocation without
    // initialising the board, so no project.json and no activity entry appear.
    const preview = JSON.parse(textOf(await legacyClient.callTool({ name: "migrate_board", arguments: { dry_run: true, expected_project: legacyStatus.project.fingerprint } })));
    check(
      "migrate_board dry_run on a legacy board previews wouldAllocate without writing project.json",
      preview.identity?.allocated === false && preview.identity?.wouldAllocate === true && preview.identity?.project_id === null &&
        !fs.existsSync(path.join(legacyRoot, ".kanmer", "project.json")) &&
        JSON.parse(textOf(await legacyClient.callTool({ name: "get_status", arguments: {} }))).project?.identity === "unassigned",
      JSON.stringify(preview.identity),
    );
    // The real migration allocates once, with the prior fingerprint as the auditable fallback.
    const migrated = JSON.parse(textOf(await legacyClient.callTool({ name: "migrate_board", arguments: { expected_project: legacyStatus.project.fingerprint } })));
    const migratedFile = JSON.parse(fs.readFileSync(path.join(legacyRoot, ".kanmer", "project.json"), "utf8"));
    const migratedStatus = JSON.parse(textOf(await legacyClient.callTool({ name: "get_status", arguments: {} })));
    const activity = JSON.parse(textOf(await legacyClient.callTool({ name: "get_activity", arguments: { id: "board" } })));
    const again = JSON.parse(textOf(await legacyClient.callTool({ name: "migrate_board", arguments: { expected_project: migratedStatus.project.project_id } })));
    check(
      "migrate_board on a legacy board migrates its identity once, with the prior fingerprint as auditable fallback",
      migrated.identity?.allocated === false && migrated.identity?.origin === "migrated" &&
        migratedFile.project_id === migrated.identity.project_id &&
        again.identity?.allocated === false && again.identity?.project_id === migratedFile.project_id &&
        migratedFile.migratedFrom?.fingerprint === legacyStatus.project.fingerprint &&
        migratedStatus.project?.identity === "logical" && migratedStatus.project?.origin === "migrated" &&
        migratedStatus.project?.project_id !== projectId &&
        // exactly one allocation entry for THIS identity (the copied activity log also carries the sandbox's own)
        activity.filter((e) => e.field === "project_id" && String(e.to).startsWith(migratedFile.project_id)).length === 1 &&
        activity.some((e) => e.field === "project_id" && e.from === legacyStatus.project.fingerprint),
      JSON.stringify({ identity: migrated.identity, file: migratedFile }),
    );
  } finally {
    await legacyClient.close();
    fs.rmSync(legacyRoot, { recursive: true, force: true });
  }
  check(
    "board worktree counts active tickets only",
    statusAfter.boardWorktree?.ticketCount === 2,
    JSON.stringify(statusAfter.boardWorktree),
  );

  // Take / release lifecycle. TICK-002 is already in implementing, so take's
  // default stage is a no-op move rather than a gated jump.
  const taken = await client.callTool({
    name: "take_ticket",
    arguments: { id: "TICK-002", branch: "feat/smoke", worktree: "wt/smoke" },
  });
  const takenItem = JSON.parse(textOf(taken));
  check(
    "take_ticket records taken_at/branch and keeps it in implementing",
    Boolean(takenItem.taken_at) &&
      takenItem.branch === "feat/smoke" &&
      takenItem.status === "implementing",
  );
  check(
    "take_ticket defaults assignee to the client name",
    takenItem.assignee === "smoke",
    takenItem.assignee,
  );
  const doubleTake = await client.callTool({
    name: "take_ticket",
    arguments: { id: "TICK-002", branch: "feat/other" },
  });
  check("take_ticket rejects an already-taken ticket", doubleTake.isError === true);
  const noBranch = await client.callTool({
    name: "take_ticket",
    arguments: { id: "TICK-002", action: "take", force: true },
  });
  check("take_ticket requires a branch", noBranch.isError === true);

  // Doc pipeline round-trip.
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "research", content: "# Findings\n\nInitial." },
  });
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "research", content: "Later note.", append: true },
  });
  const researchDoc = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: "TICK-002", doc: "research" },
      }),
    ),
  );
  check(
    "set_ticket_doc append keeps earlier content",
    researchDoc.exists === true &&
      researchDoc.content.includes("Initial.") &&
      researchDoc.content.includes("Later note."),
  );
  const enrichedItem = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: "TICK-002" } })),
  );
  check(
    "get_item reports doc presence",
    enrichedItem.docs.research === true && enrichedItem.docs.proof === undefined,
  );
  const batchDocs = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: "TICK-002", docs: ["research", "files", "research"] },
      }),
    ),
  );
  check(
    "get_ticket_doc batches in first-request order and de-duplicates",
    batchDocs.id === "TICK-002" &&
      batchDocs.documents?.length === 2 &&
      batchDocs.documents[0].doc === "research" &&
      batchDocs.documents[0].content === researchDoc.content &&
      batchDocs.documents[0].version === researchDoc.version &&
      batchDocs.documents[1].doc === "files" &&
      batchDocs.documents[1].exists === false &&
      batchDocs.documents[1].content === null &&
      batchDocs.documents[1].version === null,
  );
  const invalidDocForm = await client.callTool({
    name: "get_ticket_doc",
    arguments: { id: "TICK-002", doc: "research", docs: ["files"] },
  });
  check(
    "get_ticket_doc rejects conflicting single and batch forms",
    invalidDocForm.isError === true && textOf(invalidDocForm).includes("exactly one"),
  );
  const neitherDocForm = await client.callTool({
    name: "get_ticket_doc",
    arguments: { id: "TICK-002" },
  });
  check(
    "get_ticket_doc rejects a missing single and batch form",
    neitherDocForm.isError === true && textOf(neitherDocForm).includes("exactly one"),
  );
  const absentSingle = JSON.parse(
    textOf(
      await client.callTool({ name: "get_ticket_doc", arguments: { id: "TICK-002", doc: "files" } }),
    ),
  );
  check(
    "get_ticket_doc keeps the legacy absent response shape",
    absentSingle.id === "TICK-002" &&
      absentSingle.doc === "files" &&
      absentSingle.exists === false &&
      absentSingle.content === null &&
      absentSingle.version === null,
  );
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "files", content: "# Files" },
  });
  const presentBatch = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: "TICK-002", docs: ["research", "files"] },
      }),
    ),
  );
  check(
    "get_ticket_doc returns ordered multiple present documents",
    presentBatch.documents?.map((entry) => entry.doc).join(",") === "research,files" &&
      presentBatch.documents.every((entry) => entry.exists && typeof entry.version === "string"),
  );
  const oneDocBatch = JSON.parse(
    textOf(
      await client.callTool({ name: "get_ticket_doc", arguments: { id: "TICK-002", docs: ["files"] } }),
    ),
  );
  check("get_ticket_doc accepts a one-document batch", oneDocBatch.documents?.length === 1);
  const maxDocs = Array.from({ length: 25 }, (_, index) => `research/batch-${index + 1}.md`);
  const maxBatch = JSON.parse(
    textOf(await client.callTool({ name: "get_ticket_doc", arguments: { id: "TICK-002", docs: maxDocs } })),
  );
  check("get_ticket_doc accepts the 25-document boundary", maxBatch.documents?.length === 25);
  const tooManyDocs = await client.callTool({
    name: "get_ticket_doc",
    arguments: { id: "TICK-002", docs: [...maxDocs, "research/batch-26.md"] },
  });
  check("get_ticket_doc rejects 26 requested documents", tooManyDocs.isError === true);
  const blankBatchDoc = await client.callTool({
    name: "get_ticket_doc",
    arguments: { id: "TICK-002", docs: [" "] },
  });
  check(
    "get_ticket_doc rejects blank document ids",
    blankBatchDoc.isError === true && textOf(blankBatchDoc).includes("non-empty"),
  );
  const unsafeBatchDoc = await client.callTool({
    name: "get_ticket_doc",
    arguments: { id: "TICK-002", docs: ["research", "../../escape"] },
  });
  check(
    "get_ticket_doc rejects unknown and traversal document ids atomically",
    unsafeBatchDoc.isError === true && textOf(unsafeBatchDoc).includes("Invalid segment"),
  );

  // set_ticket_doc validates the doc name against the area's configured set.
  const unknownDoc = await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "not-a-doc", content: "x" },
  });
  check(
    "set_ticket_doc rejects an unknown document name",
    unknownDoc.isError === true && textOf(unknownDoc).includes("Unknown document"),
  );

  // Optimistic concurrency on the doc pipeline.
  check(
    "get_ticket_doc returns a version token",
    typeof researchDoc.version === "string" && researchDoc.version.length > 0,
    String(researchDoc.version),
  );
  const staleVersion = researchDoc.version;
  // Someone else writes, so our token goes stale.
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "research", content: "Newer agent write." },
  });
  const conflicted = await client.callTool({
    name: "set_ticket_doc",
    arguments: {
      id: "TICK-002",
      doc: "research",
      content: "Clobber",
      expected_version: staleVersion,
    },
  });
  check(
    "set_ticket_doc rejects a stale expected_version",
    conflicted.isError === true && textOf(conflicted).includes("Conflict"),
  );
  const afterConflict = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: "TICK-002", doc: "research" },
      }),
    ),
  );
  check(
    "set_ticket_doc left the newer content in place",
    afterConflict.content.includes("Newer agent write") &&
      !afterConflict.content.includes("Clobber"),
  );
  const accepted = await client.callTool({
    name: "set_ticket_doc",
    arguments: {
      id: "TICK-002",
      doc: "research",
      content: "Applied on top.",
      expected_version: afterConflict.version,
    },
  });
  check(
    "set_ticket_doc accepts a fresh expected_version and returns the new one",
    accepted.isError !== true &&
      typeof JSON.parse(textOf(accepted)).version === "string" &&
      JSON.parse(textOf(accepted)).version !== afterConflict.version,
  );

  // Walk TICK-002 through the late pipeline: post-implementation-report unlocks
  // review, proof unlocks done.
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "post-implementation-report", content: "What changed." },
  });
  const intoReview = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-002", status: "review" },
  });
  check(
    "move_item into review succeeds once post-implementation-report exists",
    JSON.parse(textOf(intoReview)).status === "review",
  );
  await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-002", status: "verifying" },
  });
  const gated = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-002", status: "done" },
  });
  check(
    "move_item to the final stage is proof-gated",
    gated.isError === true && textOf(gated).includes("entering Done requires proof"),
    textOf(gated).slice(0, 90),
  );
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "proof", content: "Smoke evidence." },
  });
  const nowDone = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-002", status: "done" },
  });
  check("move_item succeeds once proof exists", JSON.parse(textOf(nowDone)).status === "done");
  const released = await client.callTool({
    name: "take_ticket",
    arguments: { id: "TICK-002", action: "release" },
  });
  check("take_ticket release clears the taken fields", !JSON.parse(textOf(released)).taken_at);


  // Bulk create with partial failure.
  const bulk = JSON.parse(
    textOf(
      await client.callTool({
        name: "create_items",
        arguments: {
          items: [
            { title: "Bulk A" },
            { title: "Bulk B" },
            { title: "Bulk bad", status: "not-a-stage" },
          ],
        },
      }),
    ),
  );
  check(
    "create_items reports per-entry results with partial success",
    bulk.created === 2 && bulk.failed === 1 && bulk.results[2].ok === false,
  );

  // list_items upgrades.
  const nothingNew = await client.callTool({
    name: "list_items",
    arguments: { updated_since: "2999-01-01T00:00:00.000Z" },
  });
  check("list_items updated_since filters", JSON.parse(textOf(nothingNew)).length === 0);
  const newestOne = JSON.parse(
    textOf(
      await client.callTool({
        name: "list_items",
        arguments: { sort: "updated_desc", limit: 1 },
      }),
    ),
  );
  check("list_items sort+limit returns the single newest item", newestOne.length === 1);


  const links = await client.callTool({ name: "get_links", arguments: { id: "TICK-001" } });
  check("get_links resolves wiki backlink", textOf(links).includes("TICK-002"));

  const search = await client.callTool({ name: "search_items", arguments: { query: "Smoke ticket" } });
  check("search_items finds the ticket", textOf(search).includes("TICK-001"));

  const onDisk = fs.existsSync(
    path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001", "TICK-001.md"),
  );
  check("ticket lives in its own folder under areas/_none", onDisk);
  check(
    "version.json stamped with format 3",
    JSON.parse(fs.readFileSync(path.join(sandbox, ".kanmer", "version.json"), "utf8")).format === 3,
  );

  const summaryKeys = Object.keys(JSON.parse(textOf(search))[0]).sort();
  const expectedKeys = [
    "archived",
    "area",
    "assignee",
    "batch",
    "blocked",
    "capture",
    "capture_disposition",
    "checklist",
    "created",
    "deployment",
    "docs",
    "documentPaths",
    "groups",
    "id",
    "labels",
    "order",
    "profile",
    "refs",
    "status",
    "taken",
    "title",
    "type",
    "updated",
  ];
  check(
    "list_items/search_items summary has exactly the documented fields",
    JSON.stringify(summaryKeys) === JSON.stringify(expectedKeys),
    summaryKeys.join(","),
  );

  // Quick capture (FRD-032): the whole round trip over the wire — record an
  // observation with no documents, find it by its words, be refused delivery,
  // then promote it with one recorded decision.
  const capture = await client.callTool({
    name: "create_item",
    arguments: {
      type: "ticket",
      title: "Board flickers on renewal",
      profile: "capture",
      body: "The column header flickers when a lease is renewed mid-drag.",
      capture_evidence: ["shots/flicker.png"],
    },
  });
  const captureId = JSON.parse(textOf(capture)).id;
  const captureFile = path.join(sandbox, ".kanmer", "areas", "_none", captureId, `${captureId}.md`);
  const captureRaw = fs.readFileSync(captureFile, "utf8");
  check(
    "create_item profile capture writes the observation and its evidence, and no docs_todo",
    captureRaw.includes("profile: capture") &&
      captureRaw.includes("shots/flicker.png") &&
      captureRaw.includes("flickers when a lease is renewed") &&
      !captureRaw.includes("docs_todo"),
    captureId,
  );
  const captureNoBody = await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "No observation", profile: "capture" },
  });
  check(
    "create_item refuses a capture with no observation",
    textOf(captureNoBody).includes("CAPTURE_OBSERVATION_REQUIRED"),
  );
  const captureGates = await client.callTool({
    name: "get_doc_gates",
    arguments: { id: captureId },
  });
  check(
    "a capture owes no document at any boundary",
    JSON.parse(textOf(captureGates)).boundaries.length === 0,
  );
  const captureSearch = await client.callTool({
    name: "search_items",
    arguments: { query: "flickers", profile: "capture" },
  });
  check(
    "search_items finds a capture by the words of its observation",
    JSON.parse(textOf(captureSearch)).some((i) => i.id === captureId && i.capture === true),
  );
  const captureMove = await client.callTool({
    name: "move_item",
    arguments: { id: captureId, status: "preparing" },
  });
  check(
    "move_item refuses an unpromoted capture",
    textOf(captureMove).includes("CAPTURE_NOT_PROMOTED"),
  );
  const captureTake = await client.callTool({
    name: "take_ticket",
    arguments: { id: captureId, branch: "capture-branch" },
  });
  check("take_ticket refuses an unpromoted capture", textOf(captureTake).includes("CAPTURE_NOT_PROMOTED"));
  const capturePacket = await client.callTool({
    name: "get_execution_packet",
    arguments: { id: captureId },
  });
  check(
    "get_execution_packet refuses an unpromoted capture",
    JSON.parse(textOf(capturePacket)).ready === false &&
      textOf(capturePacket).includes("quick capture"),
  );
  const promoted = await client.callTool({
    name: "update_item",
    arguments: { id: captureId, capture_disposition: "promoted", profile: "chore" },
  });
  const promotedItem = JSON.parse(textOf(promoted));
  check(
    "update_item records the promotion decision and applies the new profile",
    promotedItem.capture_disposition === "promoted" &&
      promotedItem.profile === "chore" &&
      typeof promotedItem.capture_decided_at === "string" &&
      fs.readFileSync(captureFile, "utf8").includes("capture_disposition: promoted"),
    `${promotedItem.profile}/${promotedItem.capture_disposition}`,
  );
  await client.callTool({ name: "update_item", arguments: { id: captureId, archived: true } });

  // Areas: add an area column, create a ticket in it, filter by it.
  const addArea = await client.callTool({
    name: "add_column",
    arguments: { kind: "area", id: "ui", name: "UI", color: "#5b8cff" },
  });
  check("add_column area updates board", textOf(addArea).includes('"ui"'));
  const uiCard = await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "UI card", area: "ui" },
  });
  check(
    "ticket born in an area gets the area-based id",
    JSON.parse(textOf(uiCard)).id === "UI-001",
    JSON.parse(textOf(uiCard)).id,
  );
  const uiList = await client.callTool({ name: "list_items", arguments: { area: "ui" } });
  check("list_items filters by area", JSON.parse(textOf(uiList)).length === 1);

  // Archive: hide from default listing, visible with include_archived.
  await client.callTool({ name: "update_item", arguments: { id: "UI-001", archived: true } });
  const activeUi = await client.callTool({ name: "list_items", arguments: { area: "ui" } });
  check("archived item excluded by default", JSON.parse(textOf(activeUi)).length === 0);
  const allUi = await client.callTool({
    name: "list_items",
    arguments: { area: "ui", include_archived: true },
  });
  check("archived item shown with include_archived", JSON.parse(textOf(allUi)).length === 1);

  // blocks / order / activity.
  const bulk2 = JSON.parse(
    textOf(
      await client.callTool({
        name: "create_items",
        arguments: { items: [{ title: "Dep A" }, { title: "Dep B" }] },
      }),
    ),
  );
  const [depA, depB] = bulk2.results.map((r) => r.item.id);
  await client.callTool({
    name: "link_items",
    arguments: { source_id: depA, target_id: depB, rel: "blocks" },
  });
  const depLinks = JSON.parse(
    textOf(await client.callTool({ name: "get_links", arguments: { id: depB } })),
  );
  check(
    "get_links reports typed blocks/blockedBy edges",
    depLinks.blockedBy.some((l) => l.id === depA),
  );
  const depItem = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: depB } })),
  );
  check("get_item derives blocked from a live blocker", depItem.blocked === true);
  await client.callTool({
    name: "move_item",
    arguments: { id: depB, status: "backlog", position: "top" },
  });
  const backlogTop = JSON.parse(
    textOf(await client.callTool({ name: "list_items", arguments: { status: "backlog" } })),
  );
  check("move_item position: top sorts the item first", backlogTop[0]?.id === depB);
  const activity = JSON.parse(
    textOf(await client.callTool({ name: "get_activity", arguments: { id: depB } })),
  );
  check(
    "get_activity records the mutations with the client as actor",
    activity.length > 0 && activity.every((e) => e.actor === "smoke"),
    activity.map((e) => e.op).join(","),
  );

  // remove_column: refuses while occupied, migrates when told to.
  const occupied = await client.callTool({
    name: "remove_column",
    arguments: { kind: "area", id: "ui" },
  });
  check(
    "remove_column refuses an occupied column without migrate_to",
    occupied.isError === true && textOf(occupied).includes("still has"),
  );
  const migratedRes = JSON.parse(
    textOf(
      await client.callTool({
        name: "remove_column",
        arguments: { kind: "area", id: "ui", migrate_to: "pr-review" },
      }),
    ),
  );
  check(
    "remove_column migrate_to rewrites the items and drops the column",
    migratedRes.migrated.includes("UI-001") &&
      migratedRes.board.areas.every((a) => a.id !== "ui"),
  );
  check(
    "area migration moved the ticket folder",
    fs.existsSync(path.join(sandbox, ".kanmer", "areas", "pr-review", "UI-001", "UI-001.md")),
  );

  // Phase 2: doc gates, refs / link_doc, scratch, dynamic doc names, migrate.
  const gateProbe = JSON.parse(
    textOf(
      await client.callTool({
        name: "create_item",
        arguments: { type: "ticket", title: "Gate probe", profile: "feature" },
      }),
    ),
  );
  const gpId = gateProbe.id;
  const gatesForProbe = JSON.parse(
    textOf(await client.callTool({ name: "get_doc_gates", arguments: { id: gpId } })),
  );
  check(
    "get_doc_gates reports the resolved profile, boundaries and reachability",
    typeof gatesForProbe.profile === "string" &&
      Array.isArray(gatesForProbe.boundaries) &&
      Array.isArray(gatesForProbe.reachable) &&
      typeof gatesForProbe.blockedBy === "object",
  );
  const blockedLeave = await client.callTool({
    name: "move_item",
    arguments: { id: gpId, status: "preparing" },
  });
  check(
    "leaving backlog is gated on a governing doc",
    blockedLeave.isError === true && /governing/i.test(textOf(blockedLeave)) &&
      blockedLeave.structuredContent?.error?.code === "GATE_BLOCKED",
  );
  const linked = JSON.parse(
    textOf(
      await client.callTool({
        name: "link_doc",
        arguments: { id: gpId, path: "docs/prd/smoke.md", action: "add" },
      }),
    ),
  );
  check("link_doc adds a governing-doc ref", (linked.refs ?? []).includes("docs/prd/smoke.md"));
  const nowLeaves = await client.callTool({
    name: "move_item",
    arguments: { id: gpId, status: "preparing" },
  });
  check(
    "a linked governing doc satisfies the leave-backlog gate",
    JSON.parse(textOf(nowLeaves)).status === "preparing",
  );
  const unlinked = JSON.parse(
    textOf(
      await client.callTool({
        name: "link_doc",
        arguments: { id: gpId, path: "docs/prd/smoke.md", action: "remove" },
      }),
    ),
  );
  check("link_doc removes a ref", !(unlinked.refs ?? []).includes("docs/prd/smoke.md"));

  // A configured non-legacy doc name is accepted; an unknown one is rejected.
  const openQ = await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: gpId, doc: "open-questions", content: "- anything unresolved?" },
  });
  check("set_ticket_doc accepts a configured non-legacy doc name", openQ.isError !== true);
  const bogusDoc = await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: gpId, doc: "totally-made-up", content: "x" },
  });
  check(
    "set_ticket_doc rejects an unknown doc name, listing valid ids",
    bogusDoc.isError === true && textOf(bogusDoc).includes("Unknown document"),
  );

  // Scratch: append, read back through get_ticket_doc(scratch/<slug>).
  await client.callTool({
    name: "append_scratch",
    arguments: { id: gpId, slug: "research", content: "scratch line one" },
  });
  await client.callTool({
    name: "append_scratch",
    arguments: { id: gpId, slug: "research", content: "scratch line two" },
  });
  const scratchBack = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: gpId, doc: "scratch/research" },
      }),
    ),
  );
  check(
    "append_scratch is read back through get_ticket_doc(scratch/<slug>)",
    scratchBack.content?.includes("scratch line one") &&
      scratchBack.content?.includes("scratch line two"),
  );
  const scratchBatch = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: gpId, docs: ["scratch/research", "files"] },
      }),
    ),
  );
  check(
    "get_ticket_doc batch reads scratch alongside an absent document",
    scratchBatch.documents?.[0]?.content?.includes("scratch line two") &&
      scratchBatch.documents?.[1]?.exists === false,
  );
  const probeDocs = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: gpId } })),
  );
  check(
    "scratch is not counted among the pipeline docs",
    probeDocs.docs["scratch-research"] === undefined,
  );

  // SHA-bound review/proof records (MCP-024): frontmatter is stored as plain
  // Markdown, written whole-file through set_ticket_doc, and parsed here with
  // the same gray-matter library that future gate consumers must use.
  const planWrite = await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: gpId, doc: "plan", content: "# Review plan\n\nCheck the shipped head SHA.\n" },
  });
  check("record fixture accepts a plan document", planWrite.isError !== true);
  const planDoc = JSON.parse(
    textOf(await client.callTool({ name: "get_ticket_doc", arguments: { id: gpId, doc: "plan" } })),
  );
  const recordTicket = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: gpId } })),
  );
  const reviewHeadSha = "a".repeat(40);
  const reviewMarkdown = `---
kind: review-attestation
pr: "123"
head_sha: "${reviewHeadSha}"
verdict: pass
reviewer: "smoke-reviewer"
independent: true
plan_hash: "${planDoc.version}"
ticket_updated: "${recordTicket.updated}"
findings:
  - id: F-001
    severity: minor
    summary: "The fixture has a minor documentation note."
    disposition: accepted-risk
    reason: "The note is outside this smoke's implementation scope."
  - id: F-002
    severity: note
    summary: "A downstream ticket owns the follow-up."
    disposition: deferred-to-ticket
    ticket: "MCP-025"
---

Initial review body.
`;
  const reviewWrite = JSON.parse(
    textOf(
      await client.callTool({
        name: "set_ticket_doc",
        arguments: { id: gpId, doc: "scratch/review", content: reviewMarkdown },
      }),
    ),
  );
  const reviewRead = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: gpId, doc: "scratch/review" },
      }),
    ),
  );
  const reviewMatter = matter(reviewRead.content);
  check(
    "review attestation round-trips through scratch/review with a version",
    reviewWrite.doc === "scratch/review" &&
      reviewRead.exists &&
      reviewRead.version === reviewWrite.version &&
      reviewRead.content.includes("Initial review body") &&
      typeof reviewRead.version === "string",
    reviewRead.version,
  );
  check(
    "gray-matter parses every review top-level field and enum",
    reviewMatter.data.kind === "review-attestation" &&
      reviewMatter.data.pr === "123" &&
      reviewMatter.data.head_sha === reviewHeadSha &&
      reviewMatter.data.verdict === "pass" &&
      reviewMatter.data.reviewer === "smoke-reviewer" &&
      reviewMatter.data.independent === true &&
      reviewMatter.data.plan_hash === planDoc.version &&
      reviewMatter.data.ticket_updated === recordTicket.updated &&
      Array.isArray(reviewMatter.data.findings),
    JSON.stringify(reviewMatter.data),
  );
  check(
    "review findings preserve IDs, severities, summaries, dispositions and remediation fields",
    reviewMatter.data.findings.length === 2 &&
      reviewMatter.data.findings[0].id === "F-001" &&
      reviewMatter.data.findings[0].severity === "minor" &&
      reviewMatter.data.findings[0].summary.includes("minor") &&
      reviewMatter.data.findings[0].disposition === "accepted-risk" &&
      reviewMatter.data.findings[0].reason.includes("outside") &&
      reviewMatter.data.findings[1].id === "F-002" &&
      reviewMatter.data.findings[1].severity === "note" &&
      reviewMatter.data.findings[1].disposition === "deferred-to-ticket" &&
      reviewMatter.data.findings[1].ticket === "MCP-025",
  );
  const reviewReplacement = `---
kind: review-attestation
pr: "123"
head_sha: "${reviewHeadSha}"
verdict: needs-changes
reviewer: "smoke-reviewer"
independent: true
plan_hash: "${planDoc.version}"
ticket_updated: "${recordTicket.updated}"
findings: []
---

Replacement review body.
`;
  const reviewReplaceResult = JSON.parse(
    textOf(
      await client.callTool({
        name: "set_ticket_doc",
        arguments: {
          id: gpId,
          doc: "scratch/review",
          content: reviewReplacement,
          expected_version: reviewRead.version,
        },
      }),
    ),
  );
  const reviewReplacedRead = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: gpId, doc: "scratch/review" },
      }),
    ),
  );
  check(
    "review replacement is whole-file and changes the content version",
    reviewReplaceResult.version !== reviewRead.version &&
      reviewReplacedRead.version === reviewReplaceResult.version &&
      reviewReplacedRead.content.includes("Replacement review body") &&
      !reviewReplacedRead.content.includes("Initial review body") &&
      matter(reviewReplacedRead.content).data.verdict === "needs-changes",
  );
  const staleReview = await client.callTool({
    name: "set_ticket_doc",
    arguments: {
      id: gpId,
      doc: "scratch/review",
      content: reviewMarkdown,
      expected_version: reviewRead.version,
    },
  });
  check(
    "review replacement rejects a stale expected_version",
    staleReview.isError === true && textOf(staleReview).includes("Conflict"),
  );

  const proofSha = "b".repeat(40);
  const proofFail = `---
kind: proof-record
merged_sha: "${proofSha}"
environment: "smoke sandbox / Node ${process.version}"
verified_at: "2026-08-21T00:00:00.000Z"
result: FAIL
attempts:
  - attempted_at: "2026-08-21T00:00:00.000Z"
    command: "npm test"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "The first verification attempt failed."
---

First proof attempt failed.
`;
  const proofFailWrite = JSON.parse(
    textOf(await client.callTool({ name: "set_ticket_doc", arguments: { id: gpId, doc: "proof", content: proofFail } })),
  );
  const proofFailRead = JSON.parse(
    textOf(await client.callTool({ name: "get_ticket_doc", arguments: { id: gpId, doc: "proof" } })),
  );
  const proofFailMatter = matter(proofFailRead.content);
  check(
    "proof record round-trips a failed attempt with exact fields",
    proofFailMatter.data.kind === "proof-record" &&
      proofFailMatter.data.merged_sha === proofSha &&
      proofFailMatter.data.environment.includes("smoke sandbox") &&
      proofFailMatter.data.verified_at === "2026-08-21T00:00:00.000Z" &&
      proofFailMatter.data.result === "FAIL" &&
      proofFailMatter.data.attempts.length === 1 &&
      proofFailMatter.data.attempts[0].exit_code === 1 &&
      proofFailMatter.data.attempts[0].result === "FAIL",
    JSON.stringify(proofFailMatter.data),
  );
  const gatesAfterFailedProof = JSON.parse(
    textOf(await client.callTool({ name: "get_doc_gates", arguments: { id: gpId } })),
  );
  const proofGateAfterFailure = gatesAfterFailedProof.boundaries
    .find((boundary) => boundary.boundary === "enter-done")
    ?.requirements.find((requirement) => requirement.requirement === "proof");
  check(
    "a FAIL proof still satisfies the existence-only proof gate",
    proofGateAfterFailure?.satisfied === true,
    JSON.stringify(proofGateAfterFailure),
  );
  const proofPass = `---
kind: proof-record
merged_sha: "${proofSha}"
environment: "smoke sandbox / Node ${process.version}"
verified_at: "2026-08-21T00:01:00.000Z"
result: PASS
attempts:
  - attempted_at: "2026-08-21T00:00:00.000Z"
    command: "npm test"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "The first verification attempt failed."
  - attempted_at: "2026-08-21T00:01:00.000Z"
    command: "npm test"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "The rerun passed after the recorded failure."
---

Second proof attempt passed; the first failure is retained.
`;
  const proofPassWrite = JSON.parse(
    textOf(
      await client.callTool({
        name: "set_ticket_doc",
        arguments: { id: gpId, doc: "proof", content: proofPass, expected_version: proofFailRead.version },
      }),
    ),
  );
  const proofPassRead = JSON.parse(
    textOf(await client.callTool({ name: "get_ticket_doc", arguments: { id: gpId, doc: "proof" } })),
  );
  const proofPassMatter = matter(proofPassRead.content);
  check(
    "proof rewrite retains failed then passed attempts in chronological order",
    proofPassWrite.version !== proofFailRead.version &&
      proofPassMatter.data.result === "PASS" &&
      proofPassMatter.data.attempts.length === 2 &&
      proofPassMatter.data.attempts[0].result === "FAIL" &&
      proofPassMatter.data.attempts[0].exit_code === 1 &&
      proofPassMatter.data.attempts[1].result === "PASS" &&
      proofPassMatter.data.attempts[1].exit_code === 0 &&
      proofPassMatter.data.attempts[0].attempted_at < proofPassMatter.data.attempts[1].attempted_at,
    JSON.stringify(proofPassMatter.data.attempts),
  );

  const scratchFixture = JSON.parse(
    textOf(
      await client.callTool({
        name: "create_item",
        arguments: { type: "ticket", title: "Scratch path probe", profile: "custom" },
      }),
    ),
  );
  await client.callTool({
    name: "append_scratch",
    arguments: { id: scratchFixture.id, slug: "review", content: "ordinary scratch note" },
  });
  const ordinaryReviewScratch = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: scratchFixture.id, doc: "scratch/review" },
      }),
    ),
  );
  check(
    "ordinary append_scratch(slug: review) maps to scratch/review.md",
    ordinaryReviewScratch.exists && ordinaryReviewScratch.content.includes("ordinary scratch note"),
  );
  const sourceDescription = fs.readFileSync(path.join(__dirname, "index.ts"), "utf8");
  const toolReference = fs.readFileSync(
    path.resolve(__dirname, "../../..", "plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md"),
    "utf8",
  );
  check(
    "MCP descriptions and canonical reference teach scratch/<slug>, not retired scratch-<slug>",
    !sourceDescription.includes("scratch-<slug>") &&
      !toolReference.includes("scratch-<slug>") &&
      sourceDescription.includes("scratch/<slug>") &&
      toolReference.includes("scratch/<slug>"),
  );

  // Board-level doc model + a no-op migrate dry run.
  const boardGates = JSON.parse(
    textOf(await client.callTool({ name: "get_doc_gates", arguments: {} })),
  );
  check(
    "get_doc_gates without id returns the board's profile model",
    typeof boardGates.profiles === "object" &&
      Array.isArray(boardGates.boundaries) &&
      Array.isArray(boardGates.docTypes) &&
      typeof boardGates.repoDocs === "object",
  );
  const migratePreview = JSON.parse(
    textOf(await client.callTool({ name: "migrate_board", arguments: { dry_run: true } })),
  );
  check(
    "migrate_board dry_run reports on an already-current board",
    migratePreview.backfill && Array.isArray(migratePreview.backfill.addedStages),
  );
  check("migrate_board dry_run reports the v3 step as already current", migratePreview.v3?.alreadyV3 === true);

  // ---- The profile gate matrix over real stdio (FRD-002 acceptance 1-5) ----
  // The same behaviour core unit-tests, asserted through the tool surface an
  // agent actually calls — a gate that works in core but not over MCP is a gate
  // agents do not have.
  const mk = async (title, profile, extra = {}) =>
    JSON.parse(
      textOf(
        await client.callTool({
          name: "create_item",
          arguments: { type: "ticket", title, profile, ...extra },
        }),
      ),
    ).id;
  const moveTo = (id, status) => client.callTool({ name: "move_item", arguments: { id, status } });
  const writeDoc = (id, doc, content) =>
    client.callTool({ name: "set_ticket_doc", arguments: { id, doc, content } });

  const chore = await mk("Chore", "chore");
  check(
    "chore is held at Preparing until a plan exists",
    (await moveTo(chore, "implementing")).isError === true,
  );
  await writeDoc(chore, "plan", "# Plan");
  check(
    "chore then jumps Backlog -> Implementing in one call",
    JSON.parse(textOf(await moveTo(chore, "implementing"))).status === "implementing",
  );
  check("chore is held at Done without proof", (await moveTo(chore, "done")).isError === true);

  const spike = await mk("Spike", "spike");
  await writeDoc(spike, "research/findings.md", "# Findings");
  check(
    "spike goes Backlog -> Done on research alone",
    JSON.parse(textOf(await moveTo(spike, "done"))).status === "done",
  );

  const feature = await mk("Feature", "feature");
  const featBlocked = await moveTo(feature, "done");
  check(
    "a feature cannot collapse Backlog -> Done in one call",
    featBlocked.isError === true && textOf(featBlocked).includes("crosses 4 document gates") &&
      featBlocked.structuredContent?.error?.code === "GATE_BLOCKED",
    textOf(featBlocked).slice(0, 90),
  );
  check(
    "and the refusal names the next single stage to move to",
    textOf(featBlocked).includes('the next is "preparing"'),
  );

  // The collapse refusal must not masquerade as a missing document: this
  // ticket has every document the jump would need, and is still refused.
  const stocked = await mk("Stocked", "fix");
  // `post-implementation-report` is in this list because ADR-0014 gave `fix` a
  // gated `enter-review`, so the jump now crosses three gates rather than two.
  for (const d of ["files", "plan", "post-implementation-report", "proof"]) {
    await writeDoc(stocked, d, "# " + d);
  }
  const stockedBlocked = await moveTo(stocked, "done");
  check(
    "a fully documented ticket is still refused the multi-gate jump",
    stockedBlocked.isError === true &&
      textOf(stockedBlocked).includes("crosses 3 document gates") &&
      !textOf(stockedBlocked).includes("requires"),
    textOf(stockedBlocked).slice(0, 90),
  );
  check(
    "and stepping one stage at a time gets it there",
    ["preparing", "implementing", "review", "verifying", "done"].reduce(
      async (okp, stage) => {
        const ok = await okp;
        const res = await moveTo(stocked, stage);
        return ok && !res.isError && JSON.parse(textOf(res)).status === stage;
      },
      Promise.resolve(true),
    ),
  );
  await client.callTool({
    name: "update_item",
    arguments: { id: feature, profile: "chore" },
  });
  check(
    "changing the profile re-gates the ticket immediately",
    JSON.parse(textOf(await client.callTool({ name: "get_doc_gates", arguments: { id: feature } })))
      .profile === "chore",
  );

  const named = await mk("Custom", "custom", {
    requires: { "enter-done": ["research/auth"] },
  });
  await writeDoc(named, "research/db.md", "# DB");
  check(
    "a custom named requirement is not satisfied by a different document",
    (await moveTo(named, "done")).isError === true,
  );
  await writeDoc(named, "research/auth.md", "# Auth");
  check(
    "the named document satisfies it",
    JSON.parse(textOf(await moveTo(named, "done"))).status === "done",
  );

  // Nested paths and gate-exempt folders, over the wire.
  const nested = await mk("Nested", "spike");
  await writeDoc(nested, "reference/mockup.md", "input, not evidence");
  check(
    "reference/ never satisfies a gate",
    (await moveTo(nested, "done")).isError === true,
  );
  await writeDoc(nested, "research/deep/topic.md", "# Deep");
  const nestedBack = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: nested, doc: "research/deep/topic.md" },
      }),
    ),
  );
  check("a nested document round-trips", nestedBack.content?.includes("# Deep"));
  const nestedItem = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: nested } })),
  );
  check(
    "get_item exposes the exact nested document path",
    nestedItem.documentPaths?.includes("research/deep/topic.md"),
  );
  const nestedGates = JSON.parse(
    textOf(await client.callTool({ name: "get_doc_gates", arguments: { id: nested } })),
  );
  check(
    "get_doc_gates exposes the exact nested document path",
    nestedGates.documentPaths?.includes("research/deep/topic.md"),
  );
  const bareNested = JSON.parse(
    textOf(
      await client.callTool({ name: "get_ticket_doc", arguments: { id: nested, doc: "research" } }),
    ),
  );
  check(
    "a bare type remains absent when only a named document exists",
    bareNested.exists === false && bareNested.content === null,
  );
  const nestedBatch = JSON.parse(
    textOf(
      await client.callTool({
        name: "get_ticket_doc",
        arguments: { id: nested, docs: ["research/deep/topic.md", "research"] },
      }),
    ),
  );
  check(
    "get_ticket_doc batch reads a nested document in request order",
    nestedBatch.documents?.[0]?.content?.includes("# Deep") &&
      nestedBatch.documents?.[1]?.exists === false,
  );
  check(
    "it satisfies the type's requirement on its own",
    JSON.parse(textOf(await moveTo(nested, "done"))).status === "done",
  );
  const unknownFolder = await writeDoc(nested, "reserch/typo.md", "x");
  check(
    "an unknown top-level folder is rejected with the valid list",
    unknownFolder.isError === true && textOf(unknownFolder).includes("Unknown document folder"),
  );

  // Typed proof: a declared flavour with no matching evidence warns, never blocks.
  const visual = await mk("Visual", "custom", {
    requires: { "enter-done": ["proof:visual"] },
  });
  await writeDoc(visual, "proof/after.md", "no picture here");
  const visualGates = JSON.parse(
    textOf(await client.callTool({ name: "get_doc_gates", arguments: { id: visual } })),
  );
  check(
    "proof:visual without an image surfaces a warning",
    (visualGates.warnings ?? []).some((w) => /screenshot/i.test(w)),
  );
  check(
    "the warning does not block the move",
    JSON.parse(textOf(await moveTo(visual, "done"))).status === "done",
  );

  // ---- Groups (FRD-001), over real stdio -----------------------------------
  const epic = JSON.parse(
    textOf(
      await client.callTool({
        name: "create_group",
        arguments: { kind: "epic", title: "Checkout rework", body: "Ship these together." },
      }),
    ),
  );
  check("create_group allocates an EPIC id", epic.id === "EPIC-001", epic.id);
  const horizon = JSON.parse(
    textOf(await client.callTool({ name: "create_group", arguments: { kind: "horizon", title: "NOW" } })),
  );
  check("a second kind gets its own prefix", horizon.id === "HZN-001", horizon.id);
  check(
    "create_group rejects an undeclared kind, listing the valid ones",
    (await client.callTool({ name: "create_group", arguments: { kind: "sprint", title: "S1" } }))
      .isError === true,
  );

  // Membership rides on update_item — there is deliberately no add/remove tool.
  const m1 = await mk("Member one", "chore");
  const m2 = await mk("Member two", "chore");
  for (const id of [m1, m2]) {
    await client.callTool({ name: "update_item", arguments: { id, groups: [epic.id] } });
  }
  check(
    "membership is rejected when the group does not exist",
    (await client.callTool({ name: "update_item", arguments: { id: m1, groups: ["EPIC-404"] } }))
      .isError === true,
  );

  let group = JSON.parse(textOf(await client.callTool({ name: "get_group", arguments: { id: epic.id } })));
  check(
    "get_group derives its members from the tickets",
    group.members.map((m) => m.id).join(",") === [m1, m2].sort().join(","),
    group.members.map((m) => m.id).join(","),
  );
  check("derived progress counts them in Backlog", group.progress.backlog === 2 && group.total === 2);

  // Move one member and re-read: progress must follow, with no write to the group.
  const groupFile = path.join(sandbox, ".kanmer", "groups", epic.id, `${epic.id}.md`);
  const beforeBytes = fs.readFileSync(groupFile, "utf8");
  await writeDoc(m1, "plan", "# Plan");
  await moveTo(m1, "implementing");
  group = JSON.parse(textOf(await client.callTool({ name: "get_group", arguments: { id: epic.id } })));
  check(
    "progress follows a member move",
    group.progress.implementing === 1 && group.progress.backlog === 1,
    JSON.stringify(group.progress),
  );
  check(
    "and the group file was never written — membership is derived, not stored",
    fs.readFileSync(groupFile, "utf8") === beforeBytes,
  );
  check(
    "no file anywhere stores the member list",
    !beforeBytes.includes(m1) && !beforeBytes.includes("members"),
  );

  // Shared context: what every member's agent is expected to read.
  await client.callTool({
    name: "set_group_doc",
    arguments: { id: epic.id, path: "context.md", content: "The constraint they all sit under." },
  });
  const ctx = JSON.parse(
    textOf(await client.callTool({ name: "get_group_doc", arguments: { id: epic.id, path: "context.md" } })),
  );
  check("group docs round-trip", ctx.content?.includes("constraint"));
  const nestedCtx = await client.callTool({
    name: "set_group_doc",
    arguments: { id: epic.id, path: "decisions/api.md", content: "# API" },
  });
  check("nested group doc paths work", nestedCtx.isError !== true);
  check(
    "the group's own file cannot be overwritten as a context doc",
    (
      await client.callTool({
        name: "set_group_doc",
        arguments: { id: epic.id, path: `${epic.id}.md`, content: "x" },
      })
    ).isError === true,
  );

  const groups = JSON.parse(textOf(await client.callTool({ name: "list_groups", arguments: {} })));
  check("list_groups returns both", groups.length === 2, groups.map((g) => g.id).join(","));
  const epicsOnly = JSON.parse(
    textOf(await client.callTool({ name: "list_groups", arguments: { kind: "epic" } })),
  );
  check("list_groups filters by kind", epicsOnly.length === 1 && epicsOnly[0].id === epic.id);

  // update_group (MCP-006): rename, archive as the retirement path, no-op and
  // conflict semantics. The group is unarchived again at the end so later
  // checks still see both groups.
  const renamed = JSON.parse(
    textOf(
      await client.callTool({
        name: "update_group",
        arguments: { id: epic.id, title: "Checkout rework v2" },
      }),
    ),
  );
  check("update_group renames a group", renamed.title === "Checkout rework v2", renamed.title);
  const afterRename = JSON.parse(
    textOf(await client.callTool({ name: "get_group", arguments: { id: epic.id } })),
  );
  check("the rename is visible through get_group", afterRename.title === "Checkout rework v2");
  check(
    "and its derived members survive the rename",
    afterRename.members.map((m) => m.id).join(",") === [m1, m2].sort().join(","),
  );
  // `kind` is not in the schema — the id prefix is allocated from it — so it
  // cannot reach the store however it is passed.
  await client.callTool({ name: "update_group", arguments: { id: epic.id, kind: "horizon" } });
  check(
    "kind is not patchable — the id prefix encodes it",
    JSON.parse(textOf(await client.callTool({ name: "get_group", arguments: { id: epic.id } })))
      .kind === "epic",
  );
  const noop = JSON.parse(
    textOf(
      await client.callTool({
        name: "update_group",
        arguments: { id: epic.id, title: "Checkout rework v2" },
      }),
    ),
  );
  check("a no-op patch does not bump updated", noop.updated === renamed.updated);
  check(
    "a stale expected_updated is a conflict",
    textOf(
      await client.callTool({
        name: "update_group",
        arguments: { id: epic.id, title: "Nope", expected_updated: epic.updated },
      }),
    ).match(/Conflict/) !== null,
  );
  check(
    "a fresh expected_updated is accepted",
    (
      await client.callTool({
        name: "update_group",
        arguments: { id: epic.id, body: "Ship these together, still.", expected_updated: renamed.updated },
      })
    ).isError !== true,
  );
  check(
    "the concurrency token is never written into the group's frontmatter",
    !fs.readFileSync(groupFile, "utf8").includes("expectedUpdated"),
  );

  const memberBefore = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })),
  );
  await client.callTool({ name: "update_group", arguments: { id: epic.id, archived: true } });
  check(
    "archiving drops the group from list_groups",
    !JSON.parse(textOf(await client.callTool({ name: "list_groups", arguments: {} })))
      .map((g) => g.id)
      .includes(epic.id),
  );
  check(
    "but include_archived still returns it",
    JSON.parse(
      textOf(await client.callTool({ name: "list_groups", arguments: { include_archived: true } })),
    )
      .map((g) => g.id)
      .includes(epic.id),
  );
  const memberAfter = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })),
  );
  check(
    "member tickets are untouched by archiving the group (FRD-001 G4)",
    memberAfter.updated === memberBefore.updated &&
      JSON.stringify(memberAfter.groups) === JSON.stringify(memberBefore.groups),
  );
  await client.callTool({ name: "update_group", arguments: { id: epic.id, archived: false } });
  check(
    "unarchiving restores it — archiving is reversible",
    JSON.parse(textOf(await client.callTool({ name: "list_groups", arguments: {} })))
      .map((g) => g.id)
      .includes(epic.id),
  );
  check(
    "update_group refuses an unknown id",
    (await client.callTool({ name: "update_group", arguments: { id: "EPIC-404", title: "x" } }))
      .isError === true,
  );

  // MCP-023: one bounded packet or a deterministic, normal-result refusal.
  await client.callTool({
    name: "set_group_doc",
    arguments: { id: epic.id, path: "context.md", content: "# Shared execution context\n\nAuthoritative context." },
  });
  const packetId = JSON.parse(
    textOf(
      await client.callTool({
        name: "create_item",
        arguments: {
          title: "packet-ready feature",
          status: "implementing",
          profile: "feature",
          docs_todo: true,
          groups: [epic.id, epic.id],
          body: "Packet body.",
        },
      }),
    ),
  ).id;
  const packetDocs = [
    ["research", "Research input."],
    ["files", "Files map."],
    ["plan", "# Plan\n\n## Stop condition\nStop after the checklist.\n\n## Commands\nnpm test\n\n### Detail\nKeep the command exact."],
    ["checklist", "- [x] bounded task"],
    ["open-questions", "- [x] resolved"],
    ["research/nested", "Nested research."],
  ];
  for (const [doc, content] of packetDocs) {
    const written = await client.callTool({ name: "set_ticket_doc", arguments: { id: packetId, doc, content } });
    check(`packet fixture writes ${doc}`, written.isError !== true);
  }
  await client.callTool({
    name: "append_scratch",
    arguments: { id: packetId, slug: "packet-note", content: "scratch" },
  });
  const packetTicketFile = path.join(sandbox, ".kanmer", "areas", "_none", packetId, `${packetId}.md`);
  const packetActivity = path.join(sandbox, ".kanmer", "data", "activity.jsonl");
  const packetBefore = {
    tree: treeSnapshot(sandbox),
    ticket: fs.readFileSync(packetTicketFile, "utf8"),
    activity: fs.readFileSync(packetActivity, "utf8"),
  };
  const readyPacket = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: packetId } })),
  );
  check(
    "ready packet returns the exact bounded shape",
    readyPacket.ready === true &&
      readyPacket.code === undefined &&
      readyPacket.ticket.id === packetId &&
      readyPacket.ticket.body.trim() === "Packet body." &&
      readyPacket.gates.profile === "feature" &&
      readyPacket.documents.plan.exists === true &&
      readyPacket.documents.checklist.exists === true &&
      readyPacket.documents.files.exists === true,
    JSON.stringify(Object.keys(readyPacket)),
  );
  check(
    "ready packet carries authoritative group context",
    readyPacket.groupContexts.length === 1 &&
      readyPacket.groupContexts[0].id === epic.id &&
      readyPacket.groupContexts[0].context === "# Shared execution context\n\nAuthoritative context.\n",
  );
  check(
    "ready packet lists index versions and extra paths without extra contents",
    /^[a-f0-9]{16}$/.test(readyPacket.documents.plan.version) &&
      readyPacket.extraDocs.some((doc) => doc.path === "research/nested.md" && /^[a-f0-9]{16}$/.test(doc.version)) &&
      readyPacket.extraDocs.every((doc) => !Object.prototype.hasOwnProperty.call(doc, "content")) &&
      !readyPacket.extraDocs.some((doc) => ["plan/plan.md", "checklist/checklist.md", "files/files.md"].includes(doc.path)),
  );
  check(
    "ready packet parses stop condition and commands",
    readyPacket.stopCondition === "Stop after the checklist." &&
      readyPacket.commandsHint === "npm test\n\n### Detail\nKeep the command exact.",
    JSON.stringify({ stop: readyPacket.stopCondition, commands: readyPacket.commandsHint }),
  );
  const packetAfter = {
    tree: treeSnapshot(sandbox),
    ticket: fs.readFileSync(packetTicketFile, "utf8"),
    activity: fs.readFileSync(packetActivity, "utf8"),
  };
  check("ready packet is read-only", JSON.stringify(packetAfter) === JSON.stringify(packetBefore));

  const refusedMissing = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: "TICK-404" } })),
  );
  check(
    "missing ticket is a normal GATE_BLOCKED refusal",
    refusedMissing.ready === false && refusedMissing.code === "GATE_BLOCKED" &&
      Array.isArray(refusedMissing.missing) && refusedMissing.missing.length === 0,
  );

  const spikeId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "packet spike", status: "implementing", profile: "spike", docs_todo: true } })),
  ).id;
  const refusedSpike = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: spikeId } })),
  );
  check(
    "spike refusal dominates missing gates",
    refusedSpike.ready === false && refusedSpike.code === "GATE_BLOCKED" &&
      refusedSpike.reason.includes("spike") && refusedSpike.missing.length === 0,
  );

  const gatedId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "gated packet", status: "implementing", profile: "feature", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: gatedId, doc: "open-questions", content: "- [ ] unresolved" } });
  const refusedDocs = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: gatedId } })),
  );
  check(
    "missing document refusal precedes unresolved questions",
    refusedDocs.ready === false && refusedDocs.missing.join(",") === "research,files,plan,checklist" &&
      !refusedDocs.missing.includes("questions-resolved"),
  );
  await client.callTool({ name: "set_ticket_doc", arguments: { id: gatedId, doc: "research", content: "Research" } });
  await client.callTool({ name: "set_ticket_doc", arguments: { id: gatedId, doc: "files", content: "Files" } });
  await client.callTool({ name: "set_ticket_doc", arguments: { id: gatedId, doc: "plan", content: "Plan" } });
  await client.callTool({ name: "set_ticket_doc", arguments: { id: gatedId, doc: "checklist", content: "Checklist" } });
  const refusedQuestions = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: gatedId } })),
  );
  check(
    "unresolved question refusal is dedicated and ordered",
    refusedQuestions.ready === false &&
      JSON.stringify(refusedQuestions.missing) === JSON.stringify(["questions-resolved"]),
  );

  const choreId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "plan-only chore", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: choreId, doc: "plan", content: "# Chore plan" } });
  const chorePacket = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: choreId } })),
  );
  check(
    "plan-only chore receives a ready packet",
    chorePacket.ready === true && chorePacket.documents.plan.exists === true &&
      chorePacket.documents.files.exists === false && chorePacket.documents.checklist.exists === false &&
      chorePacket.stopCondition === "Stop at the checklist; do not merge; do not start another ticket.",
  );

  const occupiedId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "occupied packet", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: occupiedId, doc: "plan", content: "# Occupied" } });
  const resumedWorktree = path.join(sandbox, ".worktrees", "other");
  execFileSync("git", ["worktree", "add", "-b", "other-branch", resumedWorktree, expectedBoardBranch], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  await client.callTool({ name: "take_ticket", arguments: { id: occupiedId, branch: "other-branch", worktree: ".worktrees/other", assignee: "other-agent" } });
  const refusedOccupied = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: occupiedId } })),
  );
  check(
    "other actor occupancy refuses with no missing documents",
    refusedOccupied.ready === false && refusedOccupied.missing.length === 0 &&
      refusedOccupied.reason.includes("other-agent") && refusedOccupied.reason.includes("other-branch") &&
      refusedOccupied.reason.includes(".worktrees/other"),
  );
  const resumedOccupied = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: occupiedId, resume: { branch: "other-branch", worktree: ".worktrees/other" } },
    })),
  );
  check(
    "exact recorded branch and worktree resume an occupied packet",
    resumedOccupied.ready === true && resumedOccupied.ticket.taken?.branch === "other-branch" &&
      resumedOccupied.ticket.taken?.worktree === ".worktrees/other",
  );
  check(
    "a ready packet carries the CORE-121 claim block",
    resumedOccupied.claim?.state === "live" && resumedOccupied.claim.controller === "other-agent" &&
      resumedOccupied.claim.reviewRound === 0 && resumedOccupied.claim.remediationBudget === 1 &&
      typeof resumedOccupied.claim.expiresAt === "string",
    JSON.stringify(resumedOccupied.claim),
  );

  // CORE-121 bootstrap claim contract: transfer, renew, expired refusal, audited backward move.
  const claimId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "claim contract", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: claimId, doc: "plan", content: "# Claim" } });
  const claimWorktree = path.join(sandbox, ".worktrees", "claim");
  execFileSync("git", ["worktree", "add", "-b", "claim-branch", claimWorktree, expectedBoardBranch], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  const claimed = JSON.parse(
    textOf(await client.callTool({ name: "take_ticket", arguments: { id: claimId, branch: "claim-branch", worktree: ".worktrees/claim", assignee: "ctl-a" } })),
  );
  check(
    "take_ticket stamps claim_expires_at and claim_controller",
    Boolean(claimed.claim_expires_at) && claimed.claim_controller === "ctl-a",
    JSON.stringify({ claim_expires_at: claimed.claim_expires_at, claim_controller: claimed.claim_controller }),
  );
  // CORE-115 (FRD-030): the take mints a lease record; the packet and get_status expose what a worker renews with.
  check(
    "take_ticket mints a lease record (lease_id, lease_revision 1, workspace, phase, heartbeat)",
    typeof claimed.lease_id === "string" && claimed.lease_revision === 1 && String(claimed.lease_workspace).startsWith("worktree:") &&
      claimed.lease_phase === "implementing" && claimed.lease_heartbeat_at === claimed.taken_at,
    JSON.stringify({ lease_id: claimed.lease_id, lease_revision: claimed.lease_revision, lease_workspace: claimed.lease_workspace, lease_phase: claimed.lease_phase }),
  );
  {
    const status = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
    check(
      "get_status reports explicit lease timing (30 min expiry, 5 min heartbeat, 120 min command bound)",
      status.leases?.expiryMinutes === 30 && status.leases?.heartbeatMinutes === 5 && status.leases?.commandMaxMinutes === 120,
      JSON.stringify(status.leases),
    );
    const ownPacket = JSON.parse(textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: claimId, resume: { branch: "claim-branch", worktree: ".worktrees/claim" } } })));
    check(
      "get_execution_packet claim block carries the lease id, revision, phase and heartbeat cadence",
      ownPacket.ready === true && ownPacket.claim.leaseId === claimed.lease_id && ownPacket.claim.leaseRevision === 1 &&
        ownPacket.claim.phase === "implementing" && ownPacket.claim.heartbeatMinutes === 5 && ownPacket.claim.expiryMinutes === 30 && ownPacket.claim.legacy === false,
      JSON.stringify(ownPacket.claim ?? ownPacket),
    );
    const otherClaimId = JSON.parse(
      textOf(await client.callTool({ name: "create_item", arguments: { title: "workspace contender", status: "implementing", profile: "chore", docs_todo: true } })),
    ).id;
    const occupiedWorktree = await client.callTool({ name: "take_ticket", arguments: { id: otherClaimId, branch: "contender-branch", worktree: ".worktrees/claim", assignee: "ctl-b" } });
    const occupiedBranch = await client.callTool({ name: "take_ticket", arguments: { id: otherClaimId, branch: "claim-branch", assignee: "ctl-b", force: true } });
    check(
      "take_ticket refuses another ticket on the same worktree or branch with WORKSPACE_OCCUPIED (LEASE_CONFLICT), even with force",
      [occupiedWorktree, occupiedBranch].every((r) => r.isError === true && textOf(r).includes("WORKSPACE_OCCUPIED") && r.structuredContent?.error?.code === "LEASE_CONFLICT") &&
        !JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: otherClaimId } }))).taken_at,
      JSON.stringify([textOf(occupiedWorktree), textOf(occupiedBranch)]),
    );
    const liveRetake = await client.callTool({ name: "take_ticket", arguments: { id: claimId, branch: "other", assignee: "ctl-b" } });
    check(
      "take_ticket refuses to acquire a live lease held by another controller with LEASE_LIVE",
      liveRetake.isError === true && textOf(liveRetake).includes("LEASE_LIVE") && liveRetake.structuredContent?.error?.code === "LEASE_CONFLICT",
      textOf(liveRetake),
    );
    const beforeLease = textOf(await client.callTool({ name: "get_item", arguments: { id: claimId } }));
    const staleId = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-a", lease_id: "not-current", lease_revision: 1 } });
    const staleLeaseRev = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-a", lease_id: claimed.lease_id, lease_revision: 9 } });
    check(
      "take_ticket renew with a non-current lease_id is LEASE_EXPIRED and with a stale lease_revision is REVISION_CONFLICT; neither writes",
      staleId.isError === true && staleId.structuredContent?.error?.code === "LEASE_EXPIRED" &&
        staleLeaseRev.isError === true && staleLeaseRev.structuredContent?.error?.code === "REVISION_CONFLICT" &&
        textOf(await client.callTool({ name: "get_item", arguments: { id: claimId } })) === beforeLease,
      JSON.stringify([staleId.structuredContent?.error, staleLeaseRev.structuredContent?.error]),
    );
    const heartbeat = JSON.parse(textOf(await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-a", lease_id: claimed.lease_id, lease_revision: 1, phase: "running-command", extend_minutes: 600, worker_run: "run-w1" } })));
    check(
      "take_ticket renew with the current lease id/revision bumps the revision, records the phase and bounds a running-command extension",
      heartbeat.lease_id === claimed.lease_id && heartbeat.lease_revision === 2 && heartbeat.lease_phase === "running-command" && heartbeat.lease_worker_run === "run-w1" &&
        Date.parse(heartbeat.claim_expires_at) - Date.now() <= 121 * 60_000 && Date.parse(heartbeat.claim_expires_at) - Date.now() > 100 * 60_000,
      JSON.stringify({ rev: heartbeat.lease_revision, phase: heartbeat.lease_phase, expires: heartbeat.claim_expires_at }),
    );
    const backToWork = JSON.parse(textOf(await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-a", lease_id: claimed.lease_id, lease_revision: 2, phase: "implementing" } })));
    check("take_ticket renew returns the lease to the board window when the command phase ends", backToWork.lease_revision === 3 && Date.parse(backToWork.claim_expires_at) - Date.now() <= 31 * 60_000, backToWork.claim_expires_at);
    claimed.lease_revision = 3;
  }
  // CORE-116 (FRD-031): the delivery policy is resolved and reported, execution
  // material names its exact targets, and delivery state is recorded on the
  // ticket without ever becoming a gate input.
  {
    const status = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
    check(
      "get_status reports the resolved main-only delivery policy and that it came from the default",
      status.delivery?.integrationBranch === "main" && status.delivery?.releaseBranch === "main" &&
        status.delivery?.releaseCandidatePattern === null && status.delivery?.hotfixBackport === true &&
        status.delivery?.source === "default",
      JSON.stringify(status.delivery),
    );
    const deliveryPacket = JSON.parse(textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: claimId, resume: { branch: "claim-branch", worktree: ".worktrees/claim" } } })));
    check(
      "get_execution_packet names the base branch, PR target and verification target from the delivery policy",
      deliveryPacket.ready === true && deliveryPacket.delivery?.baseBranch === "main" &&
        deliveryPacket.delivery?.prTarget === "main" && deliveryPacket.delivery?.verificationTarget === "main" &&
        deliveryPacket.delivery?.state === "not-integrated" && deliveryPacket.delivery?.policySource === "default" &&
        ["resolved", "unavailable"].includes(deliveryPacket.delivery?.baseShaState) &&
        (deliveryPacket.delivery?.baseSha === null || /^[0-9a-f]{40}$/i.test(deliveryPacket.delivery.baseSha)),
      JSON.stringify(deliveryPacket.delivery ?? deliveryPacket),
    );
    const deliveryId = JSON.parse(
      textOf(await client.callTool({ name: "create_item", arguments: { title: "delivery state", status: "implementing", profile: "feature", docs_todo: true } })),
    ).id;
    const badState = await client.callTool({ name: "update_item", arguments: { id: deliveryId, delivery_state: "shipped" } });
    const noEvidence = await client.callTool({ name: "update_item", arguments: { id: deliveryId, delivery_state: "integrated" } });
    const abbreviated = await client.callTool({ name: "update_item", arguments: { id: deliveryId, delivery_state: "integrated", delivery_branch: "main", delivery_sha: "abc1234" } });
    const wrongBranch = await client.callTool({ name: "update_item", arguments: { id: deliveryId, delivery_state: "integrated", delivery_branch: "staging", delivery_sha: "a".repeat(40) } });
    const noCandidatePolicy = await client.callTool({ name: "update_item", arguments: { id: deliveryId, delivery_candidate: "release/v1" } });
    check(
      "update_item refuses an unknown delivery state, missing or abbreviated integration evidence, a wrong branch and a candidate with no policy",
      badState.isError === true && textOf(badState).includes("DELIVERY_STATE_INVALID") &&
        noEvidence.isError === true && textOf(noEvidence).includes("DELIVERY_EVIDENCE_MISSING") &&
        abbreviated.isError === true && textOf(abbreviated).includes("DELIVERY_SHA_INVALID") &&
        wrongBranch.isError === true && textOf(wrongBranch).includes("DELIVERY_TARGET_INVALID") &&
        noCandidatePolicy.isError === true && textOf(noCandidatePolicy).includes("DELIVERY_NO_CANDIDATE_POLICY"),
      JSON.stringify([textOf(badState), textOf(noEvidence), textOf(abbreviated), textOf(wrongBranch), textOf(noCandidatePolicy)]),
    );
    const integrated = JSON.parse(textOf(await client.callTool({ name: "update_item", arguments: { id: deliveryId, delivery_state: "integrated", delivery_branch: "main", delivery_sha: "a".repeat(40) } })));
    const listed = JSON.parse(textOf(await client.callTool({ name: "list_items", arguments: {} })));
    const summary = (Array.isArray(listed) ? listed : listed.items).find((entry) => entry.id === deliveryId);
    check(
      "update_item records integration at an exact merged SHA, with no backport obligation on a main-only project",
      integrated.delivery_state === "integrated" && integrated.delivery_sha === "a".repeat(40) &&
        integrated.delivery_branch === "main" && integrated.delivery_backport_required === undefined &&
        typeof integrated.delivery_recorded_at === "string",
      JSON.stringify({ state: integrated.delivery_state, sha: integrated.delivery_sha, backport: integrated.delivery_backport_required ?? null }),
    );
    check(
      "the list_items summary carries the delivery block, and only for a ticket that recorded one",
      summary?.delivery?.state === "integrated" && summary.delivery.branch === "main" &&
        summary.delivery.sha === "a".repeat(40) && summary.delivery.backportRequired === null &&
        (Array.isArray(listed) ? listed : listed.items).some((entry) => entry.id !== deliveryId && entry.delivery === undefined),
      JSON.stringify(summary?.delivery ?? null),
    );
    const stillGated = await client.callTool({ name: "move_item", arguments: { id: deliveryId, status: "review" } });
    check(
      "recorded delivery evidence never satisfies a stage gate (ADR-0005)",
      stillGated.isError === true && textOf(stillGated).includes("post-implementation-report"),
      textOf(stillGated),
    );
    const cleared = JSON.parse(textOf(await client.callTool({ name: "update_item", arguments: { id: deliveryId, delivery_state: "not-integrated", delivery_sha: "", delivery_branch: "" } })));
    check(
      "update_item clears a delivery field with an empty string",
      cleared.delivery_sha === undefined && cleared.delivery_branch === undefined && cleared.delivery_state === "not-integrated",
      JSON.stringify(cleared.delivery_state),
    );
  }
  // CORE-132 (FRD-031 AC2 candidate clause, AC3, AC4 and the unavailable-service edge case):
  // one renewable lease owns a release channel, a release attempt is an
  // immutable-identity record, and reconcile_ticket observes real release evidence.
  {
    const releaseSha = "c".repeat(40);
    const supersedeSha = "d".repeat(40);
    const releaseTicket = JSON.parse(
      textOf(await client.callTool({ name: "create_item", arguments: { title: "release inclusion", status: "review", profile: "chore", docs_todo: true } })),
    ).id;
    const cleanRelease = JSON.parse(textOf(await client.callTool({ name: "reconcile_ticket", arguments: { id: releaseTicket } })));
    check(
      "reconcile_ticket reports not-applicable release evidence on a board that has never released",
      cleanRelease.evidence?.release?.state === "not-applicable",
      JSON.stringify(cleanRelease.evidence?.release ?? null),
    );

    const acquired = JSON.parse(textOf(await client.callTool({
      name: "release_channel",
      arguments: { action: "acquire", integration_sha: releaseSha, included_tickets: [releaseTicket] },
    })));
    check(
      "release_channel acquire mints an immutable candidate identity for the exact integration SHA",
      acquired.channel === "main" && acquired.attempt?.attempt_id === "main@1" &&
        /^cand1:[0-9a-f]{16}$/.test(acquired.attempt?.candidate_id ?? "") &&
        acquired.attempt?.integration_sha === releaseSha && acquired.attempt?.outcome === "active" &&
        acquired.lease?.lease_revision === 1,
      JSON.stringify(acquired.attempt ?? acquired),
    );

    const held = await client.callTool({ name: "release_channel", arguments: { action: "acquire", integration_sha: supersedeSha } });
    check(
      "a second concurrent release owner is refused with RELEASE_CHANNEL_HELD",
      held.isError === true && textOf(held).includes("RELEASE_CHANNEL_HELD"),
      textOf(held),
    );

    const heldStatus = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
    check(
      "get_status.release reports the held channel, its candidate and its lease",
      heldStatus.release?.channels?.length === 1 && heldStatus.release.channels[0].channel === "main" &&
        heldStatus.release.channels[0].state === "current" && heldStatus.release.channels[0].attemptId === "main@1" &&
        heldStatus.release.attemptCount === 1 && heldStatus.release.attempts?.length === 1 &&
        heldStatus.release.attempts[0].attemptId === "main@1" &&
        heldStatus.release.attempts[0].includedTickets?.includes(releaseTicket) &&
        /^[0-9a-f]{64}$/.test(heldStatus.release.attempts[0].deliveryPolicyVersion ?? "") &&
        heldStatus.release.pendingTransactions?.length === 0 && heldStatus.release.unreadable === false,
      JSON.stringify(heldStatus.release ?? null),
    );

    const ignoredProgress = await client.callTool({
      name: "release_channel",
      arguments: {
        action: "renew",
        lease_id: acquired.lease.lease_id,
        lease_revision: acquired.lease.lease_revision,
        service_unavailable: "this field belongs only to record",
      },
    });
    const afterIgnoredProgress = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
    check(
      "release_channel refuses action-inapplicable progress before mutation",
      ignoredProgress.isError === true && textOf(ignoredProgress).includes("RELEASE_INPUT_INVALID") &&
        afterIgnoredProgress.release?.channels?.[0]?.leaseRevision === acquired.lease.lease_revision &&
        afterIgnoredProgress.release?.attempts?.[0]?.retry === null,
      JSON.stringify({ error: textOf(ignoredProgress), release: afterIgnoredProgress.release ?? null }),
    );

    const unavailable = JSON.parse(textOf(await client.callTool({
      name: "release_channel",
      arguments: {
        action: "record",
        lease_id: acquired.lease.lease_id,
        lease_revision: acquired.lease.lease_revision,
        service_unavailable: "artifact registry unreachable",
      },
    })));
    const inconclusive = JSON.parse(textOf(await client.callTool({ name: "reconcile_ticket", arguments: { id: releaseTicket } })));
    check(
      "an unavailable release service records a BOUNDED retry schedule and makes only that attempt's evidence inconclusive",
      unavailable.attempt?.retry?.attempts === 1 && unavailable.attempt.retry.exhausted === false &&
        typeof unavailable.attempt.retry.max_attempts === "number" &&
        inconclusive.evidence?.release?.state === "unavailable" &&
        inconclusive.findings?.some((entry) => entry.code === "EVIDENCE_INCONCLUSIVE"),
      JSON.stringify({ retry: unavailable.attempt?.retry ?? null, release: inconclusive.evidence?.release ?? null }),
    );

    const superseded = JSON.parse(textOf(await client.callTool({
      name: "release_channel",
      arguments: {
        action: "supersede",
        lease_id: unavailable.lease.lease_id,
        lease_revision: unavailable.lease.lease_revision,
        integration_sha: supersedeSha,
        included_tickets: [releaseTicket],
      },
    })));
    check(
      "a changed candidate SHA mints a NEW candidate identity and carries no evidence forward",
      superseded.attempt?.attempt_id === "main@2" && superseded.attempt.candidate_id !== acquired.attempt.candidate_id &&
        superseded.attempt.supersedes === "main@1" && superseded.attempt.retry === null &&
        superseded.attempt.verification_state === "pending" && superseded.lease?.lease_revision === 1,
      JSON.stringify(superseded.attempt ?? superseded),
    );

    const stale = await client.callTool({
      name: "release_channel",
      arguments: { action: "renew", lease_id: acquired.lease.lease_id, lease_revision: acquired.lease.lease_revision },
    });
    check(
      "a superseded lease id no longer renews the channel",
      stale.isError === true && textOf(stale).includes("LEASE_EXPIRED"),
      textOf(stale),
    );

    const completed = JSON.parse(textOf(await client.callTool({
      name: "release_channel",
      arguments: {
        action: "complete",
        lease_id: superseded.lease.lease_id,
        lease_revision: superseded.lease.lease_revision,
        release_tag: "v0.0.0-smoke",
      },
    })));
    const clearedStatus = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
    const afterRelease = JSON.parse(textOf(await client.callTool({ name: "reconcile_ticket", arguments: { id: releaseTicket } })));
    check(
      "a successful release clears the channel lease, keeps both immutable attempts, and unblocks the ticket's own reconciliation",
      completed.attempt?.outcome === "released" && completed.lease === null && completed.leaseState === "cleared" &&
        clearedStatus.release?.channels?.length === 0 && clearedStatus.release.attemptCount === 2 &&
        clearedStatus.release.attempts?.map((attempt) => attempt.outcome).join(",") === "superseded,released" &&
        clearedStatus.release.attempts[1].releaseTag === "v0.0.0-smoke" &&
        afterRelease.evidence?.release?.state === "not-applicable",
      JSON.stringify({ lease: completed.lease, channels: clearedStatus.release?.channels, release: afterRelease.evidence?.release }),
    );

    const boardYml = fs.readFileSync(path.join(sandbox, ".kanmer", "data", "board.yml"), "utf8");
    const kanmerDir = fs.readdirSync(path.join(sandbox, ".kanmer"));
    check(
      "release records live in .kanmer/releases/ and never in board.yml, so a stable v0.3.12 server still reads the board",
      !boardYml.includes("release") && kanmerDir.includes("releases") &&
        fs.readdirSync(path.join(sandbox, ".kanmer", "releases")).sort().join(",") === "attempts,channels,heads,state.json,transactions",
      JSON.stringify({ kanmerDir }),
    );
  }
  // CORE-124 (FRD-030 batch mode): the first member's take declares and freezes the batch; members share one
  // workspace, non-members are refused both ways, the packet reports the batch, and release waits for all members.
  {
    const member = async (title) => JSON.parse(
      textOf(await client.callTool({ name: "create_item", arguments: { title, status: "implementing", profile: "chore", docs_todo: true } })),
    ).id;
    const [m1, m2, m3, stranger] = [await member("batch member 1"), await member("batch member 2"), await member("batch member 3"), await member("batch stranger")];
    for (const id of [m1, m2, m3, stranger]) await client.callTool({ name: "set_ticket_doc", arguments: { id, doc: "plan", content: "# Batch" } });
    const batchWorktree = path.join(sandbox, ".worktrees", "batch");
    execFileSync("git", ["worktree", "add", "-b", "batch-branch", batchWorktree, expectedBoardBranch], {
      cwd: sandbox, windowsHide: true, stdio: "ignore",
    });
    const batchTake = {
      branch: "batch-branch",
      worktree: ".worktrees/batch",
      assignee: "ctl-batch",
      controller: "ctl-batch-label",
      controller_run: "smoke-controller-run",
    };
    const missingWorktreeA = await member("batch missing worktree 1");
    const missingWorktreeB = await member("batch missing worktree 2");
    for (const id of [missingWorktreeA, missingWorktreeB]) {
      await client.callTool({ name: "set_ticket_doc", arguments: { id, doc: "plan", content: "# Missing worktree batch" } });
    }
    const beforeMissingWorktreeBatch = treeSnapshot(sandbox);
    const missingWorktreeBatch = await client.callTool({
      name: "take_ticket",
      arguments: {
        id: missingWorktreeA,
        branch: "batch-missing-worktree",
        assignee: batchTake.assignee,
        controller: batchTake.controller,
        controller_run: batchTake.controller_run,
        batch: "smoke-batch-missing-worktree",
        batch_members: [missingWorktreeA, missingWorktreeB],
      },
    });
    check(
      "a missing batch worktree is a structured LEASE_CONFLICT and leaves the complete board tree unchanged",
      missingWorktreeBatch.isError === true && textOf(missingWorktreeBatch).includes("BATCH_WORKSPACE_INVALID") &&
        missingWorktreeBatch.structuredContent?.error?.code === "LEASE_CONFLICT" &&
        JSON.stringify(treeSnapshot(sandbox)) === JSON.stringify(beforeMissingWorktreeBatch),
      textOf(missingWorktreeBatch),
    );
    const beforeOutsideBatch = treeSnapshot(sandbox);
    const outsideBatch = await client.callTool({
      name: "take_ticket",
      arguments: {
        id: m1,
        ...batchTake,
        worktree: path.resolve(sandbox, "..", `${path.basename(sandbox)}-outside`, "batch"),
        batch: "outside-smoke-batch",
        batch_members: [m1, m2],
      },
    });
    check(
      "an out-of-repository batch workspace is a structured LEASE_CONFLICT and writes no board bytes",
      outsideBatch.isError === true && textOf(outsideBatch).includes("BATCH_WORKSPACE_INVALID") &&
        outsideBatch.structuredContent?.error?.code === "LEASE_CONFLICT" &&
        JSON.stringify(treeSnapshot(sandbox)) === JSON.stringify(beforeOutsideBatch),
      textOf(outsideBatch),
    );
    const missingRun = await client.callTool({
      name: "take_ticket",
      arguments: {
        id: m1,
        branch: batchTake.branch,
        worktree: batchTake.worktree,
        assignee: batchTake.assignee,
        controller: batchTake.controller,
        batch: "smoke-batch",
        batch_members: [m1, m2, m3],
      },
    });
    check(
      "a batch declaration requires a nonempty durable controller_run before writing",
      missingRun.isError === true && textOf(missingRun).includes("BATCH_RUN_REQUIRED") &&
        missingRun.structuredContent?.error?.code === "LEASE_CONFLICT",
      textOf(missingRun),
    );
    const first = JSON.parse(textOf(await client.callTool({ name: "take_ticket", arguments: { id: m1, ...batchTake, batch: "smoke-batch", batch_members: [m1, m2, m3] } })));
    const frozenSibling = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m3 } })));
    check(
      "take_ticket with batch + batch_members declares and freezes the batch on every member (siblings stay untaken)",
      first.lease_batch === "smoke-batch" && first.lease_batch_frozen_at === first.taken_at && frozenSibling.lease_batch === "smoke-batch" &&
        frozenSibling.lease_batch_frozen_at === first.taken_at && !frozenSibling.taken_at && !frozenSibling.lease_id,
      JSON.stringify({ first: first.lease_batch, sibling: frozenSibling.lease_batch, siblingTaken: frozenSibling.taken_at ?? null }),
    );
    const untakenBatchPlan = [
      "# Plan — untaken frozen batch member",
      "",
      "## Expected files",
      "| Action | Repo-root-relative path | Responsibility |",
      "|---|---|---|",
      "| Modify | `src/batch.ts` | bounded batch fixture |",
      "",
      "## Ordered steps",
      "",
      "### Step 1 — Execute the bounded batch change",
      "- Files: `src/batch.ts`",
      "- Change: apply the bounded batch fixture change.",
      "- Tests: `src/batch.test.ts`",
      "- Commands: `npm test`",
      "- Done when: `npm test` passes.",
      "",
      "## Acceptance checks",
      "- `npm test` passes.",
      "",
      "## Stop condition",
      "Stop after this step.",
      "",
    ].join("\n");
    for (const id of [m1, m2]) {
      await client.callTool({ name: "set_ticket_doc", arguments: { id, doc: "plan", content: untakenBatchPlan } });
      await client.callTool({ name: "set_ticket_doc", arguments: { id, doc: "checklist", content: "- [ ] Step 1 — execute the bounded batch change\n" } });
    }
    const authorizedTakenBatchPacket = JSON.parse(textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: m1, controller_run: batchTake.controller_run, step: 1 },
    })));
    check(
      "an exactly authorized batch controller obtains a taken member packet despite non-authoritative display-owner labels",
      authorizedTakenBatchPacket.ready === true && authorizedTakenBatchPacket.ticket?.taken?.assignee === batchTake.assignee &&
        authorizedTakenBatchPacket.claim?.controller === batchTake.controller,
      JSON.stringify({ ready: authorizedTakenBatchPacket.ready, reason: authorizedTakenBatchPacket.reason, taken: authorizedTakenBatchPacket.ticket?.taken, claim: authorizedTakenBatchPacket.claim }),
    );

    const movedBatchWorktree = path.join(sandbox, ".worktrees", "batch-moved");
    execFileSync("git", ["worktree", "move", batchWorktree, movedBatchWorktree], {
      cwd: sandbox, windowsHide: true, stdio: "ignore",
    });
    const refusedMovedUntakenBatchPacket = JSON.parse(textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: m2, controller_run: batchTake.controller_run, step: 1 },
    })));
    const siblingAfterMovedRefusal = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m2 } })));
    check(
      "an untaken frozen member refuses a moved projected worktree without acquiring a lease",
      refusedMovedUntakenBatchPacket.ready === false &&
        refusedMovedUntakenBatchPacket.reason.includes("cannot be resolved on disk") &&
        !siblingAfterMovedRefusal.taken_at && !siblingAfterMovedRefusal.lease_id,
      JSON.stringify({ packet: refusedMovedUntakenBatchPacket, sibling: siblingAfterMovedRefusal }),
    );
    execFileSync("git", ["worktree", "move", movedBatchWorktree, batchWorktree], {
      cwd: sandbox, windowsHide: true, stdio: "ignore",
    });

    const wrongProjectedBranch = "batch-projected-wrong-branch";
    execFileSync("git", ["-C", batchWorktree, "checkout", "-b", wrongProjectedBranch], {
      windowsHide: true, stdio: "ignore",
    });
    const refusedWrongBranchUntakenBatchPacket = JSON.parse(textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: m2, controller_run: batchTake.controller_run, step: 1 },
    })));
    const siblingAfterWrongBranchRefusal = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m2 } })));
    check(
      "an untaken frozen member refuses a wrong-branch projected worktree without acquiring a lease",
      refusedWrongBranchUntakenBatchPacket.ready === false &&
        refusedWrongBranchUntakenBatchPacket.reason.includes(batchTake.branch) &&
        refusedWrongBranchUntakenBatchPacket.reason.includes(wrongProjectedBranch) &&
        !siblingAfterWrongBranchRefusal.taken_at && !siblingAfterWrongBranchRefusal.lease_id,
      JSON.stringify({ packet: refusedWrongBranchUntakenBatchPacket, sibling: siblingAfterWrongBranchRefusal }),
    );
    execFileSync("git", ["-C", batchWorktree, "checkout", batchTake.branch], {
      windowsHide: true, stdio: "ignore",
    });
    execFileSync("git", ["branch", "-D", wrongProjectedBranch], {
      cwd: sandbox, windowsHide: true, stdio: "ignore",
    });

    const untakenBatchPacket = JSON.parse(textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: m2, controller_run: batchTake.controller_run, step: 1 },
    })));
    check(
      "an untaken frozen member receives the immutable batch workspace before take without being reported as taken",
      untakenBatchPacket.ready === true && untakenBatchPacket.ticket?.taken === null &&
        untakenBatchPacket.ticket?.workspace?.branch === batchTake.branch &&
        untakenBatchPacket.ticket?.workspace?.worktree === batchTake.worktree &&
        untakenBatchPacket.claim?.workspace === first.lease_workspace &&
        untakenBatchPacket.claim?.batch?.branch === batchTake.branch &&
        untakenBatchPacket.claim?.batch?.workspace === first.lease_workspace &&
        untakenBatchPacket.step?.workspace?.branch === batchTake.branch &&
        untakenBatchPacket.step?.workspace?.worktree === batchTake.worktree,
      JSON.stringify({
        ready: untakenBatchPacket.ready,
        taken: untakenBatchPacket.ticket?.taken,
        ticketWorkspace: untakenBatchPacket.ticket?.workspace,
        claimWorkspace: untakenBatchPacket.claim?.workspace,
        batch: untakenBatchPacket.claim?.batch,
        stepWorkspace: untakenBatchPacket.step?.workspace,
        reason: untakenBatchPacket.reason,
      }),
    );
    const replayedFirst = JSON.parse(textOf(await client.callTool({
      name: "take_ticket",
      arguments: { id: m1, ...batchTake, batch: "smoke-batch", batch_members: [m1, m2, m3] },
    })));
    check(
      "an exact first-take replay is response-loss idempotent and returns the original lease",
      replayedFirst.taken_at === first.taken_at && replayedFirst.lease_id === first.lease_id &&
        replayedFirst.lease_revision === first.lease_revision,
      JSON.stringify({
        first: { taken_at: first.taken_at, lease_id: first.lease_id, lease_revision: first.lease_revision },
        replay: { taken_at: replayedFirst.taken_at, lease_id: replayedFirst.lease_id, lease_revision: replayedFirst.lease_revision },
      }),
    );

    const beforeNoCasRenew = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })));
    const noCasRenew = await client.callTool({
      name: "take_ticket",
      arguments: { id: m1, action: "renew", controller_run: batchTake.controller_run },
    });
    const afterNoCasRenew = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })));
    check(
      "a modern batch renewal cannot use the isolated no-token compatibility lane",
      noCasRenew.isError === true && textOf(noCasRenew).includes("LEASE_ID_REQUIRED") &&
        noCasRenew.structuredContent?.error?.code === "LEASE_CONFLICT" &&
        afterNoCasRenew.lease_revision === beforeNoCasRenew.lease_revision,
      textOf(noCasRenew),
    );

    const paddedRenew = JSON.parse(textOf(await client.callTool({
      name: "take_ticket",
      arguments: {
        id: m1,
        action: "renew",
        controller_run: ` ${batchTake.controller_run} `,
        lease_id: afterNoCasRenew.lease_id,
        lease_revision: afterNoCasRenew.lease_revision,
      },
    })));
    const afterPaddedRenew = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })));
    check(
      "a padded matching controller_run renews once and persists its canonical batch identity",
      paddedRenew.lease_revision === afterNoCasRenew.lease_revision + 1 &&
        paddedRenew.lease_controller_run === batchTake.controller_run &&
        afterPaddedRenew.lease_controller_run === batchTake.controller_run &&
        afterPaddedRenew.lease_revision === paddedRenew.lease_revision,
      JSON.stringify({ renewed: paddedRenew.lease_revision, run: afterPaddedRenew.lease_controller_run }),
    );

    // CORE-126: caller-supplied owner labels are observable state, not
    // authority. A second MCP process using the same client product name still
    // cannot cross the durable controller-run boundary.
    const foreignBatchTransport = new StdioClientTransport({
      command: runner,
      args: [serverEntry, "--root", sandbox],
      env: runnerEnv,
    });
    const foreignBatchClient = new Client({ name: "smoke", version: "0.0.0" });
    try {
      await foreignBatchClient.connect(foreignBatchTransport);
      const secondBeforeForeignTake = textOf(await client.callTool({ name: "get_item", arguments: { id: m2 } }));
      const foreignTake = await foreignBatchClient.callTool({
        name: "take_ticket",
        arguments: { id: m2, ...batchTake, controller_run: "foreign-controller-run", batch: "smoke-batch" },
      });
      const secondAfterForeignTake = textOf(await client.callTool({ name: "get_item", arguments: { id: m2 } }));
      check(
        "a same-product competing controller run cannot take a batch member by copying visible labels and workspace",
        foreignTake.isError === true && textOf(foreignTake).includes("BATCH_OWNER_MISMATCH") &&
          foreignTake.structuredContent?.error?.code === "LEASE_CONFLICT" && secondAfterForeignTake === secondBeforeForeignTake,
        textOf(foreignTake),
      );

      const firstBeforeForeignRenew = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })));
      const foreignRenew = await foreignBatchClient.callTool({
        name: "take_ticket",
        arguments: {
          id: m1,
          action: "renew",
          assignee: batchTake.assignee,
          controller_run: "foreign-controller-run",
          lease_id: firstBeforeForeignRenew.lease_id,
          lease_revision: firstBeforeForeignRenew.lease_revision,
        },
      });
      const firstAfterForeignRenew = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })));
      check(
        "a same-product competing controller run cannot renew a batch lease with copied exact CAS tokens",
        foreignRenew.isError === true && textOf(foreignRenew).includes("BATCH_OWNER_MISMATCH") &&
          foreignRenew.structuredContent?.error?.code === "LEASE_CONFLICT" &&
          firstAfterForeignRenew.lease_revision === firstBeforeForeignRenew.lease_revision,
        textOf(foreignRenew),
      );

      const foreignPacket = JSON.parse(textOf(await foreignBatchClient.callTool({
        name: "get_execution_packet",
        arguments: {
          id: m1,
          controller_run: "foreign-controller-run",
          resume: { branch: batchTake.branch, worktree: batchTake.worktree },
        },
      })));
      check(
        "get_execution_packet refuses an exact batch resume from a competing run of the same MCP product",
        foreignPacket.ready === false && foreignPacket.reason.includes("controlled by run smoke-controller-run") &&
          foreignPacket.reason.includes("foreign-controller-run cannot obtain"),
        foreignPacket.reason,
      );
    } finally {
      await foreignBatchClient.close();
    }
    const foreignActorTransport = new StdioClientTransport({
      command: runner,
      args: [serverEntry, "--root", sandbox],
      env: runnerEnv,
    });
    const foreignActorClient = new Client({ name: "foreign-batch-actor", version: "0.0.0" });
    try {
      await foreignActorClient.connect(foreignActorTransport);
      const foreignActorPacket = JSON.parse(textOf(await foreignActorClient.callTool({
        name: "get_execution_packet",
        arguments: {
          id: m1,
          controller_run: batchTake.controller_run,
          resume: { branch: batchTake.branch, worktree: batchTake.worktree },
        },
      })));
      check(
        "get_execution_packet refuses the correct batch run from a wrong actor even with an exact resume",
        foreignActorPacket.ready === false && foreignActorPacket.reason.includes("controlled by smoke") &&
          foreignActorPacket.reason.includes("foreign-batch-actor cannot obtain"),
        foreignActorPacket.reason,
      );
    } finally {
      await foreignActorClient.close();
    }
    const second = JSON.parse(textOf(await client.callTool({
      name: "take_ticket",
      arguments: {
        id: m2,
        ...batchTake,
        branch: untakenBatchPacket.ticket.workspace.branch,
        worktree: untakenBatchPacket.ticket.workspace.worktree,
        batch: "smoke-batch",
      },
    })));
    check(
      "a frozen member takes the batch's worktree and branch and gets its own lease on the shared workspace",
      second.lease_workspace === first.lease_workspace && second.lease_id && second.lease_id !== first.lease_id && second.lease_batch === "smoke-batch",
      JSON.stringify({ workspace: second.lease_workspace, lease: second.lease_id }),
    );
    const mismatch = await client.callTool({ name: "take_ticket", arguments: { id: m3, branch: "batch-branch", worktree: ".worktrees/elsewhere", assignee: "ctl-batch", controller_run: batchTake.controller_run } });
    check(
      "a member on any other worktree is BATCH_WORKSPACE_MISMATCH (LEASE_CONFLICT): a batch owns one workspace",
      mismatch.isError === true && textOf(mismatch).includes("BATCH_WORKSPACE_MISMATCH") && mismatch.structuredContent?.error?.code === "LEASE_CONFLICT",
      textOf(mismatch),
    );
    const joinAttempt = await client.callTool({ name: "take_ticket", arguments: { id: stranger, ...batchTake, batch: "smoke-batch", batch_members: [m1, m2, m3, stranger] } });
    const shareAttempt = await client.callTool({ name: "take_ticket", arguments: { id: stranger, ...batchTake, force: true } });
    const strangerAfter = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: stranger } })));
    check(
      "AC5: an unrelated ticket can neither join the started batch (BATCH_FROZEN) nor share its workspace (WORKSPACE_OCCUPIED, even with force)",
      joinAttempt.isError === true && textOf(joinAttempt).includes("BATCH_FROZEN") && joinAttempt.structuredContent?.error?.code === "LEASE_CONFLICT" &&
        shareAttempt.isError === true && textOf(shareAttempt).includes("WORKSPACE_OCCUPIED") && textOf(shareAttempt).includes("smoke-batch") &&
        !strangerAfter.taken_at && !strangerAfter.lease_batch,
      JSON.stringify([textOf(joinAttempt), textOf(shareAttempt)]),
    );
    const batchPacket = JSON.parse(textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: m2, controller_run: batchTake.controller_run, resume: { branch: "batch-branch", worktree: ".worktrees/batch" } } })));
    check(
      "get_execution_packet is ready for a member on the shared batch worktree and its claim block reports the batch (members, pending, workspace)",
      batchPacket.ready === true && batchPacket.claim?.batch?.id === "smoke-batch" && JSON.stringify(batchPacket.claim.batch.members) === JSON.stringify([m1, m2, m3]) &&
        JSON.stringify(batchPacket.claim.batch.pending) === JSON.stringify([m1, m2, m3]) && batchPacket.claim.batch.workspace === first.lease_workspace &&
        batchPacket.claim.batch.frozenAt === first.taken_at,
      JSON.stringify(batchPacket.claim?.batch ?? batchPacket),
    );
    const earlyRelease = await client.callTool({ name: "take_ticket", arguments: { id: m1, action: "release" } });
    const stillTaken = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: m1 } })));
    check(
      "take_ticket release refuses BATCH_ACTIVE (LEASE_CONFLICT) while another member is not Done or archived; nothing is written",
      earlyRelease.isError === true && textOf(earlyRelease).includes("BATCH_ACTIVE") && textOf(earlyRelease).includes(m2) && textOf(earlyRelease).includes(m3) &&
        earlyRelease.structuredContent?.error?.code === "LEASE_CONFLICT" && stillTaken.taken_at === first.taken_at && stillTaken.lease_batch === "smoke-batch",
      textOf(earlyRelease),
    );
    await client.callTool({ name: "update_item", arguments: { id: m3, archived: true } });
    const beforeArchivedMemberExecution = treeSnapshot(sandbox);
    const archivedMemberPacket = JSON.parse(textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: m3, controller_run: batchTake.controller_run },
    })));
    const archivedMemberTake = await client.callTool({
      name: "take_ticket",
      arguments: { id: m3, ...batchTake, batch: "smoke-batch" },
    });
    check(
      "an untaken archived batch member receives no packet or lease and leaves every board byte unchanged",
      archivedMemberPacket.ready === false && archivedMemberPacket.reason.includes("archived") &&
        archivedMemberTake.isError === true && textOf(archivedMemberTake).includes("BATCH_ACTIVE") &&
        archivedMemberTake.structuredContent?.error?.code === "LEASE_CONFLICT" &&
        JSON.stringify(treeSnapshot(sandbox)) === JSON.stringify(beforeArchivedMemberExecution),
      JSON.stringify({ packet: archivedMemberPacket, take: textOf(archivedMemberTake) }),
    );
    const archivedRoster = JSON.parse(textOf(await client.callTool({ name: "list_items", arguments: { include_archived: true } })))
      .filter((item) => [m1, m2, m3].includes(item.id));
    check(
      "list_items include_archived discovers every frozen member with the compact batch identity used by closeout",
      archivedRoster.length === 3 && archivedRoster.every((item) =>
        item.batch?.id === "smoke-batch" && item.batch.controller && item.batch.frozenAt === first.taken_at &&
          item.batch.state === "active" && item.batch.branch === "batch-branch" &&
          item.batch.workspace === first.lease_workspace &&
          JSON.stringify(item.batch.members) === JSON.stringify([m1, m2, m3])
      ),
      JSON.stringify(archivedRoster.map((item) => ({ id: item.id, archived: item.archived, batch: item.batch }))),
    );
    const malformedDir = path.join(sandbox, ".kanmer", "areas", "_none", "BROKEN-999");
    fs.mkdirSync(malformedDir, { recursive: true });
    fs.writeFileSync(path.join(malformedDir, "BROKEN-999.md"), "---\nid: BROKEN-999\ntype: ticket\nstatus: [\n---\n", "utf8");
    const warnedListing = JSON.parse(textOf(await client.callTool({ name: "list_items", arguments: { include_archived: true } })));
    check(
      "list_items preserves its valid summaries and warnings when an unrelated item is malformed",
      Array.isArray(warnedListing.items) && warnedListing.items.some((item) => item.id === m1 && item.batch?.id === "smoke-batch") &&
        warnedListing.warnings?.some((warning) => String(warning.file).includes("BROKEN-999")),
      JSON.stringify({ items: warnedListing.items?.length, warnings: warnedListing.warnings }),
    );
    fs.rmSync(malformedDir, { recursive: true, force: true });
    await client.callTool({ name: "update_item", arguments: { id: m1, archived: true } });
    await client.callTool({ name: "update_item", arguments: { id: m2, archived: true } });
    const batchManifestFile = path.join(
      sandbox,
      ".kanmer",
      "batches",
      "transactions",
      `${createHash("sha256").update("smoke-batch").digest("hex")}.json`,
    );
    await client.callTool({ name: "take_ticket", arguments: { id: m1, action: "release" } });
    const releasingManifest = fs.readFileSync(batchManifestFile, "utf8");
    await client.callTool({ name: "take_ticket", arguments: { id: m2, action: "release" } });
    await client.callTool({ name: "take_ticket", arguments: { id: m3, action: "release" } });
    check(
      "ordinary final batch release removes its authoritative manifest",
      !fs.existsSync(batchManifestFile),
      batchManifestFile,
    );
    // Recreate exactly the durable crash boundary: every ticket projection is
    // clear, but the final releasing manifest unlink did not persist.
    fs.writeFileSync(batchManifestFile, releasingManifest, "utf8");
    const freshCloseoutRoster = JSON.parse(textOf(await client.callTool({
      name: "list_items",
      arguments: { include_archived: true },
    }))).filter((item) => [m1, m2, m3].includes(item.id));
    check(
      "a fresh closeout discovers the complete releasing roster and shared Git path after every ticket projection cleared",
      freshCloseoutRoster.length === 3 && freshCloseoutRoster.every((item) =>
        item.batch?.id === "smoke-batch" && item.batch.state === "releasing" &&
          item.batch.branch === "batch-branch" && item.batch.workspace === first.lease_workspace &&
          JSON.stringify(item.batch.members) === JSON.stringify([m1, m2, m3])
      ),
      JSON.stringify(freshCloseoutRoster.map((item) => ({ id: item.id, batch: item.batch }))),
    );
    await client.callTool({ name: "take_ticket", arguments: { id: freshCloseoutRoster[0].id, action: "release" } });
    const afterRecoveredCloseout = JSON.parse(textOf(await client.callTool({
      name: "list_items",
      arguments: { include_archived: true },
    }))).filter((item) => [m1, m2, m3].includes(item.id));
    check(
      "a fresh release retry unlinks the final manifest and leaves all terminal tickets clear",
      !fs.existsSync(batchManifestFile) && afterRecoveredCloseout.every((item) => item.batch === null),
      JSON.stringify(afterRecoveredCloseout.map((item) => ({ id: item.id, batch: item.batch }))),
    );

    const terminalMember = async (title) => JSON.parse(textOf(await client.callTool({
      name: "create_item",
      arguments: { title, status: "implementing", profile: "custom", requires: {} },
    }))).id;
    const [terminalFirstId, terminalSecondId] = [
      await terminalMember("terminal batch member 1"),
      await terminalMember("terminal batch member 2"),
    ];
    const terminalBatchTake = {
      ...batchTake,
      batch: "smoke-terminal-batch",
    };
    await client.callTool({
      name: "take_ticket",
      arguments: {
        id: terminalFirstId,
        ...terminalBatchTake,
        batch_members: [terminalFirstId, terminalSecondId],
      },
    });
    for (const status of ["review", "verifying", "done"]) {
      await client.callTool({ name: "move_item", arguments: { id: terminalSecondId, status } });
    }
    const beforeDoneMemberExecution = treeSnapshot(sandbox);
    const doneMemberPacket = JSON.parse(textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: terminalSecondId, controller_run: terminalBatchTake.controller_run },
    })));
    const doneMemberTake = await client.callTool({
      name: "take_ticket",
      arguments: { id: terminalSecondId, ...terminalBatchTake },
    });
    check(
      "an untaken Done batch member receives no packet or lease and leaves every board byte unchanged",
      doneMemberPacket.ready === false && doneMemberPacket.reason.includes("terminal") && doneMemberPacket.reason.includes("done") &&
        doneMemberTake.isError === true && textOf(doneMemberTake).includes("BATCH_ACTIVE") &&
        doneMemberTake.structuredContent?.error?.code === "LEASE_CONFLICT" &&
        JSON.stringify(treeSnapshot(sandbox)) === JSON.stringify(beforeDoneMemberExecution),
      JSON.stringify({ packet: doneMemberPacket, take: textOf(doneMemberTake) }),
    );
    for (const status of ["review", "verifying", "done"]) {
      await client.callTool({ name: "move_item", arguments: { id: terminalFirstId, status } });
    }
    await client.callTool({ name: "take_ticket", arguments: { id: terminalFirstId, action: "release" } });
    const beforeReleasingMemberExecution = treeSnapshot(sandbox);
    const releasingMemberPacket = JSON.parse(textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: terminalSecondId, controller_run: terminalBatchTake.controller_run },
    })));
    const releasingMemberTake = await client.callTool({
      name: "take_ticket",
      arguments: { id: terminalSecondId, ...terminalBatchTake },
    });
    check(
      "a releasing batch issues no member packet or lease and leaves every board byte unchanged",
      releasingMemberPacket.ready === false && releasingMemberPacket.reason.includes("releasing") &&
        releasingMemberTake.isError === true && textOf(releasingMemberTake).includes("releasing batch smoke-terminal-batch") &&
        releasingMemberTake.structuredContent?.error?.code === "LEASE_CONFLICT" &&
        JSON.stringify(treeSnapshot(sandbox)) === JSON.stringify(beforeReleasingMemberExecution),
      JSON.stringify({ packet: releasingMemberPacket, take: textOf(releasingMemberTake) }),
    );
    await client.callTool({ name: "take_ticket", arguments: { id: terminalSecondId, action: "release" } });
    const isolated = JSON.parse(textOf(await client.callTool({ name: "take_ticket", arguments: { id: stranger, branch: "stranger-branch", assignee: "ctl-batch" } })));
    check("isolated mode stays the default: the stranger takes its own branch with no batch record", Boolean(isolated.taken_at) && !isolated.lease_batch, JSON.stringify({ taken: isolated.taken_at, batch: isolated.lease_batch ?? null }));
  }
  // F-004: release/renew/transfer honour expected_revision like take does — a stale token is REVISION_CONFLICT with zero writes.
  {
    const staleRev = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: claimId } }))).revision;
    await client.callTool({ name: "append_scratch", arguments: { id: claimId, content: "moves nothing counted" } });
    await client.callTool({ name: "set_ticket_doc", arguments: { id: claimId, doc: "plan", content: "# moved the revision" } });
    const beforeItem = textOf(await client.callTool({ name: "get_item", arguments: { id: claimId } }));
    const staleRenew = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-a", expected_revision: staleRev } });
    const staleRelease = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "release", expected_revision: staleRev } });
    const staleTransfer = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "transfer", assignee: "ctl-b", reason: "operator: smoke", expected_revision: staleRev } });
    check(
      "take_ticket renew/release/transfer refuse a stale expected_revision with REVISION_CONFLICT and write nothing",
      [staleRenew, staleRelease, staleTransfer].every((r) => r.isError === true && r.structuredContent?.error?.code === "REVISION_CONFLICT") &&
        textOf(await client.callTool({ name: "get_item", arguments: { id: claimId } })) === beforeItem,
      JSON.stringify([staleRenew.structuredContent?.error, staleRelease.structuredContent?.error, staleTransfer.structuredContent?.error]),
    );
    const freshRev = JSON.parse(beforeItem).revision;
    const freshRenew = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-a", expected_revision: freshRev } });
    check("take_ticket renew accepts the current expected_revision", freshRenew.isError !== true, textOf(freshRenew));
  }
  const liveTransfer = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "transfer", assignee: "ctl-b" } });
  check("take_ticket transfer refuses a live claim with CLAIM_LIVE", liveTransfer.isError === true && textOf(liveTransfer).includes("CLAIM_LIVE"), textOf(liveTransfer));
  const foreignRenew = await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-b" } });
  check("take_ticket renew refuses a foreign claim with CLAIM_NOT_OWNED", foreignRenew.isError === true && textOf(foreignRenew).includes("CLAIM_NOT_OWNED"), textOf(foreignRenew));
  const ownRenew = JSON.parse(textOf(await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "renew", assignee: "ctl-a" } })));
  check("take_ticket renew extends the owner's claim", Date.parse(ownRenew.claim_expires_at) >= Date.parse(claimed.claim_expires_at), ownRenew.claim_expires_at);
  const claimFile = path.join(sandbox, ".kanmer", "areas", "_none", claimId, `${claimId}.md`);
  const staleExpiry = new Date(Date.now() - 60 * 60_000).toISOString();
  fs.writeFileSync(claimFile, fs.readFileSync(claimFile, "utf8").replace(/^claim_expires_at: .*$/m, `claim_expires_at: '${staleExpiry}'`), "utf8");
  const expiredPacket = JSON.parse(textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: claimId } })));
  check(
    "get_execution_packet names transfer for an expired foreign claim",
    expiredPacket.ready === false && expiredPacket.reason.includes("claim expired at") && expiredPacket.reason.includes('action "transfer"'),
    expiredPacket.reason,
  );
  const transferred = JSON.parse(textOf(await client.callTool({ name: "take_ticket", arguments: { id: claimId, action: "transfer" } })));
  check(
    "take_ticket transfer of an expired claim keeps branch/worktree and reassigns to the caller",
    transferred.assignee === "smoke" && transferred.claim_controller === "smoke" && transferred.branch === "claim-branch" &&
      transferred.worktree === ".worktrees/claim" && Date.parse(transferred.claim_expires_at) > Date.now(),
    JSON.stringify(transferred),
  );
  check(
    "take_ticket transfer of an expired claim mints a new lease and records the old controller and the re-read evidence",
    transferred.lease_id && transferred.lease_id !== claimed.lease_id && transferred.lease_revision === claimed.lease_revision + 3 &&
      transferred.lease_reclaimed_from === "ctl-a" &&
      textOf(await client.callTool({ name: "get_ticket_doc", arguments: { id: claimId, doc: "scratch/execution" } })).includes("evidence: workspace clean (matches-claim), pr absent, commits 0, proof absent"),
    JSON.stringify({ lease_id: transferred.lease_id, was: claimed.lease_id, rev: transferred.lease_revision, from: transferred.lease_reclaimed_from }),
  );
  const transferredPacket = JSON.parse(textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: claimId } })));
  check("the new controller receives a resumed packet after transfer", transferredPacket.ready === true && transferredPacket.claim.state === "live", transferredPacket.reason);
  const backNoReason = await client.callTool({ name: "move_item", arguments: { id: claimId, status: "preparing" } });
  check("move_item refuses a backward move without a reason", backNoReason.isError === true && textOf(backNoReason).includes("BACKWARD_MOVE_NEEDS_REASON"), textOf(backNoReason));
  const backWithReason = JSON.parse(textOf(await client.callTool({ name: "move_item", arguments: { id: claimId, status: "preparing", reason: "re-plan after transfer" } })));
  check("move_item audits a backward move with a reason", backWithReason.status === "preparing", JSON.stringify(backWithReason));
  const transitions = textOf(await client.callTool({ name: "get_ticket_doc", arguments: { id: claimId, doc: "scratch/execution" } }));
  check("backward moves and transfers are recorded in scratch/execution Transitions", transitions.includes("## Transitions") && transitions.includes("claim-transfer") && transitions.includes("re-plan after transfer"), transitions.slice(0, 300));
  const resumedTopLevel = execFileSync("git", ["-C", resumedWorktree, "rev-parse", "--show-toplevel"], {
    encoding: "utf8", windowsHide: true,
  }).trim();
  const resumedBranch = execFileSync("git", ["-C", resumedWorktree, "branch", "--show-current"], {
    encoding: "utf8", windowsHide: true,
  }).trim();
  const resumedPrefix = execFileSync("git", ["-C", resumedWorktree, "rev-parse", "--show-prefix"], {
    encoding: "utf8", windowsHide: true,
  }).trim();
  check(
    "resumed packet's recorded worktree passes the execute skill's validation commands",
    resumedTopLevel.length > 0 && resumedPrefix === "" &&
      resumedBranch === resumedOccupied.ticket.taken?.branch,
    `${resumedTopLevel} (prefix: ${resumedPrefix || "."}) @ ${resumedBranch}`,
  );
  execFileSync("git", ["-C", resumedWorktree, "checkout", "--detach"], {
    windowsHide: true, stdio: "ignore",
  });
  const refusedDetachedResume = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: occupiedId, resume: { branch: "other-branch", worktree: ".worktrees/other" } },
    })),
  );
  check(
    "a resumed packet refuses a detached recorded worktree",
    refusedDetachedResume.ready === false && refusedDetachedResume.reason.includes("HEAD is detached"),
  );
  execFileSync("git", ["-C", resumedWorktree, "checkout", "-b", "diverged-branch"], {
    windowsHide: true, stdio: "ignore",
  });
  const refusedDivergedResume = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: occupiedId, resume: { branch: "other-branch", worktree: ".worktrees/other" } },
    })),
  );
  check(
    "a resumed packet refuses a recorded worktree on a different branch",
    refusedDivergedResume.ready === false && refusedDivergedResume.reason.includes("other-branch") &&
      refusedDivergedResume.reason.includes("diverged-branch"),
  );
  execFileSync("git", ["-C", resumedWorktree, "checkout", "other-branch"], {
    windowsHide: true, stdio: "ignore",
  });
  const refusedMismatchedResume = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: occupiedId, resume: { branch: "other-branch", worktree: ".worktrees/not-other" } },
    })),
  );
  check(
    "mismatched resume remains an occupancy refusal",
    refusedMismatchedResume.ready === false && refusedMismatchedResume.reason.includes("other-agent"),
  );
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: occupiedId, doc: "post-implementation-report", content: "# Occupied hand-off\n" },
  });
  await client.callTool({ name: "update_item", arguments: { id: occupiedId, status: "review" } });
  const refusedReviewResume = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: occupiedId, resume: { branch: "other-branch", worktree: ".worktrees/other" } },
    })),
  );
  check(
    "a taken Review ticket cannot issue an execution resume packet",
    refusedReviewResume.ready === false && refusedReviewResume.reason.includes("not implementing"),
  );
  await client.callTool({ name: "update_item", arguments: { id: occupiedId, status: "verifying" } });
  const refusedVerifyingResume = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: occupiedId, resume: { branch: "other-branch", worktree: ".worktrees/other" } },
    })),
  );
  check(
    "a taken Verifying ticket cannot issue an execution resume packet",
    refusedVerifyingResume.ready === false && refusedVerifyingResume.reason.includes("not implementing"),
  );

  const resumedWorktreeAlias = path.join(sandbox, ".worktrees", "other-alias");
  fs.symlinkSync(resumedWorktree, resumedWorktreeAlias, process.platform === "win32" ? "junction" : "dir");
  const duplicateWorktreeId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "duplicate resumed worktree", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: duplicateWorktreeId, doc: "plan", content: "# Duplicate worktree" } });
  await client.callTool({ name: "take_ticket", arguments: { id: duplicateWorktreeId, branch: "duplicate-branch", worktree: ".worktrees/other-alias", assignee: "other-agent" } });
  const refusedDuplicateWorktree = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: duplicateWorktreeId, resume: { branch: "duplicate-branch", worktree: ".worktrees/other-alias" } },
    })),
  );
  check(
    "a resumed ticket cannot reuse another active ticket's aliased worktree",
    refusedDuplicateWorktree.ready === false && refusedDuplicateWorktree.reason.includes(occupiedId),
  );

  const nestedOtherWorktree = path.join(resumedWorktree, "nested");
  fs.mkdirSync(nestedOtherWorktree);
  const nestedOtherWorktreeId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "nested active worktree", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: nestedOtherWorktreeId, doc: "plan", content: "# Nested worktree" } });
  await client.callTool({
    name: "take_ticket",
    arguments: { id: nestedOtherWorktreeId, branch: "nested-branch", worktree: ".worktrees/other/nested", assignee: "other-agent" },
  });
  const refusedNestedOtherWorktree = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: nestedOtherWorktreeId, resume: { branch: "nested-branch", worktree: ".worktrees/other/nested" } },
    })),
  );
  check(
    "a resumed packet refuses a subdirectory of another ticket's worktree",
    refusedNestedOtherWorktree.ready === false && refusedNestedOtherWorktree.reason.includes("inside a Git worktree"),
  );

  const foreignWorktree = path.join(sandbox, "foreign-worktree");
  fs.mkdirSync(foreignWorktree);
  execFileSync("git", ["init"], { cwd: foreignWorktree, windowsHide: true, stdio: "ignore" });
  const foreignWorktreeId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "foreign resumed worktree", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: foreignWorktreeId, doc: "plan", content: "# Foreign worktree" } });
  await client.callTool({ name: "take_ticket", arguments: { id: foreignWorktreeId, branch: "foreign-branch", worktree: "foreign-worktree", assignee: "other-agent" } });
  const refusedForeignWorktree = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: foreignWorktreeId, resume: { branch: "foreign-branch", worktree: "foreign-worktree" } },
    })),
  );
  check(
    "a resumed ticket cannot use a worktree from a different Git repository",
    refusedForeignWorktree.ready === false && refusedForeignWorktree.reason.includes("different Git repository"),
  );

  const boardWorktreeId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "board as resumed worktree", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: boardWorktreeId, doc: "plan", content: "# Board worktree" } });
  const refusedBoardWorktree = await client.callTool({
    name: "take_ticket",
    arguments: { id: boardWorktreeId, branch: "board-branch", worktree: ".", assignee: "other-agent" },
  });
  check(
    "taking a ticket rejects the board worktree before it can become resumable",
    refusedBoardWorktree.isError === true && textOf(refusedBoardWorktree).includes("board workspace"),
    textOf(refusedBoardWorktree),
  );

  const boardAlias = path.join(sandbox, "board-alias");
  fs.symlinkSync(sandbox, boardAlias, process.platform === "win32" ? "junction" : "dir");
  const boardAliasId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "aliased board as resumed worktree", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: boardAliasId, doc: "plan", content: "# Aliased board worktree" } });
  await client.callTool({ name: "take_ticket", arguments: { id: boardAliasId, branch: "aliased-board-branch", worktree: "board-alias", assignee: "other-agent" } });
  const refusedAliasedBoardWorktree = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: boardAliasId, resume: { branch: "aliased-board-branch", worktree: "board-alias" } },
    })),
  );
  check(
    "a resumed ticket cannot use an aliased board worktree",
    refusedAliasedBoardWorktree.ready === false && refusedAliasedBoardWorktree.reason.includes("board worktree"),
  );

  const boardChildId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "board child as resumed worktree", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: boardChildId, doc: "plan", content: "# Board child" } });
  await client.callTool({
    name: "take_ticket",
    arguments: { id: boardChildId, branch: expectedBoardBranch, worktree: "docs", assignee: "other-agent" },
  });
  const refusedBoardChild = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: boardChildId, resume: { branch: expectedBoardBranch, worktree: "docs" } },
    })),
  );
  check(
    "a resumed packet refuses a subdirectory of the board worktree",
    refusedBoardChild.ready === false && refusedBoardChild.reason.includes("inside a Git worktree"),
  );

  const dedicatedBoardWorktree = path.join(sandbox, ".worktrees", "dedicated-board");
  execFileSync("git", ["worktree", "add", "-b", "dedicated-board", dedicatedBoardWorktree, expectedBoardBranch], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  const nestedBoardBranch = "nested-board-ticket";
  const nestedBoardWorktree = path.join(dedicatedBoardWorktree, "nested-ticket");
  const nestedBoardWorktreeRelative = path.relative(sandbox, nestedBoardWorktree).replace(/\\/g, "/");
  execFileSync("git", ["worktree", "add", "-b", nestedBoardBranch, nestedBoardWorktree, expectedBoardBranch], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  const dedicatedTransport = new StdioClientTransport({
    command: runner,
    args: [serverEntry, "--root", dedicatedBoardWorktree, "--repo-root", sandbox],
    env: runnerEnv,
  });
  const dedicatedClient = new Client({ name: "dedicated-board-smoke", version: "0.0.0" });
  try {
    await dedicatedClient.connect(dedicatedTransport);
    const sourceCheckoutId = JSON.parse(
      textOf(await dedicatedClient.callTool({
        name: "create_item",
        arguments: { title: "source checkout as resumed worktree", status: "implementing", profile: "chore", docs_todo: true },
      })),
    ).id;
    await dedicatedClient.callTool({ name: "set_ticket_doc", arguments: { id: sourceCheckoutId, doc: "plan", content: "# Source checkout" } });
    await dedicatedClient.callTool({
      name: "take_ticket",
      arguments: { id: sourceCheckoutId, branch: "source-checkout-branch", worktree: ".", assignee: "other-agent" },
    });
    const refusedSourceCheckout = JSON.parse(
      textOf(await dedicatedClient.callTool({
        name: "get_execution_packet",
        arguments: { id: sourceCheckoutId, resume: { branch: "source-checkout-branch", worktree: "." } },
      })),
    );
    check(
      "a dedicated-board ticket cannot resume in the shared source checkout",
      refusedSourceCheckout.ready === false && refusedSourceCheckout.reason.includes("shared source checkout"),
    );
    const sourceChildId = JSON.parse(
      textOf(await dedicatedClient.callTool({
        name: "create_item",
        arguments: { title: "source child as resumed worktree", status: "implementing", profile: "chore", docs_todo: true },
      })),
    ).id;
    await dedicatedClient.callTool({ name: "set_ticket_doc", arguments: { id: sourceChildId, doc: "plan", content: "# Source child" } });
    await dedicatedClient.callTool({
      name: "take_ticket",
      arguments: { id: sourceChildId, branch: expectedBoardBranch, worktree: "docs", assignee: "other-agent" },
    });
    const refusedSourceChild = JSON.parse(
      textOf(await dedicatedClient.callTool({
        name: "get_execution_packet",
        arguments: { id: sourceChildId, resume: { branch: expectedBoardBranch, worktree: "docs" } },
      })),
    );
    check(
      "a dedicated-board ticket cannot resume in a child of the shared source checkout",
      refusedSourceChild.ready === false && refusedSourceChild.reason.includes("inside a Git worktree"),
    );
    const nestedBoardId = JSON.parse(
      textOf(await dedicatedClient.callTool({
        name: "create_item",
        arguments: { title: "nested board worktree refusal", status: "implementing", profile: "chore", docs_todo: true },
      })),
    ).id;
    await dedicatedClient.callTool({ name: "set_ticket_doc", arguments: { id: nestedBoardId, doc: "plan", content: "# Nested board worktree" } });
    await dedicatedClient.callTool({
      name: "take_ticket",
      arguments: { id: nestedBoardId, branch: nestedBoardBranch, worktree: nestedBoardWorktreeRelative, assignee: "other-agent" },
    });
    const nestedResume = { branch: nestedBoardBranch, worktree: nestedBoardWorktreeRelative };
    const refusedNestedWhole = JSON.parse(textOf(await dedicatedClient.callTool({
      name: "get_execution_packet",
      arguments: { id: nestedBoardId, resume: nestedResume },
    })));
    const refusedNestedStep = JSON.parse(textOf(await dedicatedClient.callTool({
      name: "get_execution_packet",
      arguments: { id: nestedBoardId, step: 1, resume: nestedResume },
    })));
    check(
      "whole-ticket and constrained issuance refuse a real linked worktree nested below a dedicated board",
      refusedNestedWhole.ready === false && refusedNestedStep.ready === false &&
        refusedNestedWhole.reason.includes("protected dedicated board worktree") &&
        refusedNestedStep.reason.includes("protected dedicated board worktree"),
      JSON.stringify({ whole: refusedNestedWhole.reason, step: refusedNestedStep.reason }),
    );
  } finally {
    await dedicatedClient.close();
    execFileSync("git", ["worktree", "remove", "--force", nestedBoardWorktree], { cwd: sandbox, windowsHide: true, stdio: "ignore" });
    execFileSync("git", ["branch", "-D", nestedBoardBranch], { cwd: sandbox, windowsHide: true, stdio: "ignore" });
    execFileSync("git", ["worktree", "remove", "--force", dedicatedBoardWorktree], { cwd: sandbox, windowsHide: true, stdio: "ignore" });
    execFileSync("git", ["branch", "-D", "dedicated-board"], { cwd: sandbox, windowsHide: true, stdio: "ignore" });
  }

  const staleWorktreeId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "unrelated stale worktree", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: staleWorktreeId, doc: "plan", content: "# Stale worktree" } });
  await client.callTool({
    name: "take_ticket",
    arguments: { id: staleWorktreeId, branch: "stale-branch", worktree: ".worktrees/missing", assignee: "other-agent" },
  });
  const isolatedWorktree = path.join(sandbox, ".worktrees", "isolated");
  execFileSync("git", ["worktree", "add", "-b", "isolated-branch", isolatedWorktree, expectedBoardBranch], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  const isolatedWorktreeId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "isolated resume despite stale peer", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: isolatedWorktreeId, doc: "plan", content: "# Isolated worktree" } });
  await client.callTool({
    name: "take_ticket",
    arguments: { id: isolatedWorktreeId, branch: "isolated-branch", worktree: ".worktrees/isolated", assignee: "other-agent" },
  });
  const resumedDespiteStalePeer = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: isolatedWorktreeId, resume: { branch: "isolated-branch", worktree: ".worktrees/isolated" } },
    })),
  );
  check(
    "an unrelated missing worktree warns without blocking an isolated resume",
    resumedDespiteStalePeer.ready === true &&
      resumedDespiteStalePeer.warnings.some((warning) => warning.includes(staleWorktreeId) && warning.includes("unresolved")),
  );

  const incompleteTakenId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "incomplete taken ticket", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({ name: "set_ticket_doc", arguments: { id: incompleteTakenId, doc: "plan", content: "# Incomplete taken ticket" } });
  await client.callTool({ name: "take_ticket", arguments: { id: incompleteTakenId, branch: "incomplete-branch", assignee: "smoke" } });
  const refusedIncompleteTaken = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: incompleteTakenId } })),
  );
  check(
    "a taken ticket without a worktree is refused before an unusable ready packet",
    refusedIncompleteTaken.ready === false && refusedIncompleteTaken.reason.includes("incomplete taken-ticket metadata"),
  );

  const oversizedAuthorityId = JSON.parse(
    textOf(await client.callTool({
      name: "create_item",
      arguments: { title: "oversized execution authority", status: "implementing", profile: "chore", docs_todo: true },
    })),
  ).id;
  const oversizedResearchDir = path.join(sandbox, ".kanmer", "areas", "_none", oversizedAuthorityId, "research");
  fs.mkdirSync(oversizedResearchDir, { recursive: true });
  fs.writeFileSync(path.join(oversizedResearchDir, "research.md"), "x".repeat(70_000), "utf8");
  const oversizedWhole = JSON.parse(textOf(await client.callTool({
    name: "get_execution_packet",
    arguments: { id: oversizedAuthorityId },
  })));
  const oversizedConstrained = JSON.parse(textOf(await client.callTool({
    name: "get_execution_packet",
    arguments: { id: oversizedAuthorityId, step: 1 },
  })));
  check(
    "whole-ticket and constrained issuance fail closed on oversized board authority before packet compilation",
    oversizedWhole.ready === false && oversizedConstrained.ready === false &&
      /pre-read bytes/i.test(oversizedWhole.reason) && /pre-read bytes/i.test(oversizedConstrained.reason),
    JSON.stringify({ whole: oversizedWhole.reason, constrained: oversizedConstrained.reason }),
  );

  // CORE-118 / FRD-033: an approved plan compiles into one bounded step packet.
  // The whole-ticket packet is unchanged apart from an ADVISORY validation
  // report; only a `step` request makes structural findings blocking.
  const codesOf = (validation) => (validation?.findings ?? []).map((finding) => finding.code);
  const stepId = JSON.parse(
    textOf(
      await client.callTool({
        name: "create_item",
        arguments: {
          title: "step packet fixture",
          status: "implementing",
          profile: "feature",
          docs_todo: true,
          groups: [epic.id],
          body: "Step packet body.",
        },
      }),
    ),
  ).id;
  const stepResearchVersion = JSON.parse(
    textOf(await client.callTool({ name: "set_ticket_doc", arguments: { id: stepId, doc: "research", content: "Queue retry research." } })),
  ).version;
  const stepFilesVersion = JSON.parse(
    textOf(await client.callTool({ name: "set_ticket_doc", arguments: { id: stepId, doc: "files", content: "Queue files map." } })),
  ).version;
  const stepPlan = [
    "# Plan — step packet fixture",
    "",
    "## Objective",
    "Cap the upload retry loop.",
    "",
    "## Starting state",
    "Verified in `src/queue.ts:12`.",
    "Evidence: `research/research.md`@`" + stepResearchVersion + "`, `files/files.md`@`" + stepFilesVersion + "`.",
    "",
    "## Governing docs",
    "Meets `docs/functional/frd/FRD-001-uploads.md`.",
    "",
    "## Required changes",
    "Cap the retry loop in `src/queue.ts`.",
    "",
    "## Expected files",
    "| Action | Repo-root-relative path | Responsibility |",
    "|---|---|---|",
    "| Modify | `src/queue.ts` | retry loop |",
    "| Add | `src/queue.test.ts` | retry proof |",
    "| Modify | `docs/queue.md` | note the cap |",
    "",
    "## Do not modify",
    "- `src/vendor/bundle.js` — generated output.",
    "",
    "## Constraints",
    "The cap stays behind `QUEUE_MAX_RETRIES`.",
    "",
    "## Ordered steps",
    "",
    "### Step 1 — Bound the retry loop",
    "- Preconditions: `enqueue` retries forever.",
    "- Files: `src/queue.ts`, `src/queue.test.ts`",
    "- Change: cap the loop at `QUEUE_MAX_RETRIES`.",
    "- Preserved behaviour: a first-attempt success returns immediately.",
    "- Negative cases: a permanent failure stops after three attempts",
    "- Tests: `src/queue.test.ts`",
    "- Commands: `npm test`",
    "- Expected output: the retry suite passes.",
    "- Done when: `npm test` reports green.",
    "- Deviation stop: stop if the cap must become dynamic.",
    "",
    "### Step 2 — Document the cap",
    "- Preconditions: step 1 landed.",
    "- Files: `docs/queue.md`",
    "- Change: record the cap.",
    "- Preserved behaviour: no runtime change.",
    "- Negative cases: none",
    "- Tests: `src/queue.test.ts`",
    "- Commands: `npm test`",
    "- Expected output: unchanged suite result.",
    "- Done when: the note exists.",
    "- Deviation stop: stop on any runtime change.",
    "",
    "### Step 3 — Touch something the plan never declared",
    "- Preconditions: none.",
    "- Files: `src/secret.ts`",
    "- Change: edit an undeclared file.",
    "- Preserved behaviour: none.",
    "- Negative cases: none",
    "- Tests: `src/queue.test.ts`",
    "- Commands: `npm test`",
    "- Expected output: none.",
    "- Done when: never.",
    "- Deviation stop: stop immediately.",
    "",
    "## Acceptance checks",
    "- `npm test` proves the cap.",
    "",
    "## Commands",
    "- `npm test`",
    "",
    "## Failure and deviation rules",
    "Stop and report on any failing check.",
    "",
    "## Stop condition",
    "Stop when the PR is open.",
    "",
  ].join("\n");
  await client.callTool({ name: "set_ticket_doc", arguments: { id: stepId, doc: "plan", content: stepPlan } });
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: stepId, doc: "checklist", content: "# Checklist\n\nPlan approved; selected step marker not mapped yet.\n" },
  });
  await client.callTool({ name: "set_ticket_doc", arguments: { id: stepId, doc: "open-questions", content: "- [x] resolved" } });

  const wholeTicketPacket = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: stepId } })),
  );
  check(
    "a whole-ticket packet carries an advisory validation report and no step block",
    wholeTicketPacket.ready === true && wholeTicketPacket.step === undefined &&
      wholeTicketPacket.validation?.ok === true && wholeTicketPacket.validation.blockers === 0 &&
      Array.isArray(wholeTicketPacket.validation.findings) &&
      wholeTicketPacket.validation.findings.every((finding) => finding.severity === "advisory"),
    JSON.stringify(wholeTicketPacket.validation),
  );
  check(
    "group context carries the shared-research evidence version",
    wholeTicketPacket.groupContexts?.length === 1 &&
      /^[a-f0-9]{16}$/.test(wholeTicketPacket.groupContexts?.[0]?.version ?? ""),
    JSON.stringify(wholeTicketPacket.groupContexts),
  );

  // The whole-ticket packet above remains the setup route. A constrained
  // packet additionally needs the recorded real Git workspace whose changes
  // reconciliation will inspect; caller-supplied path lists are never proof.
  fs.mkdirSync(path.join(sandbox, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(sandbox, "src", "queue.ts"),
    "export const QUEUE_MAX_RETRIES = 3;\nexport const enqueue = () => 'queued';\n",
  );
  fs.writeFileSync(
    path.join(sandbox, "src", "queue.test.ts"),
    "// deterministic constrained-step fixture\n",
  );
  execFileSync("git", ["add", "--", "src/queue.ts", "src/queue.test.ts"], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  execFileSync(
    "git",
    ["-c", "user.name=Kanmer smoke", "-c", "user.email=smoke@example.invalid", "commit", "-m", "step packet source fixture"],
    { cwd: sandbox, windowsHide: true, stdio: "ignore" },
  );
  const stepBranch = "step-packet-branch";
  const stepWorktreeRelative = ".worktrees/step-packet";
  const stepWorktree = path.join(sandbox, stepWorktreeRelative);
  execFileSync("git", ["worktree", "add", "-b", stepBranch, stepWorktree, expectedBoardBranch], {
    cwd: sandbox, windowsHide: true, stdio: "ignore",
  });
  const stepTaken = JSON.parse(textOf(await client.callTool({
    name: "take_ticket",
    arguments: {
      id: stepId,
      branch: stepBranch,
      worktree: stepWorktreeRelative,
      assignee: "smoke",
      expected_project: expectedProject,
    },
  })));
  check(
    "constrained execution records the exact real branch and worktree",
    stepTaken.branch === stepBranch && stepTaken.worktree === stepWorktreeRelative,
    JSON.stringify({ branch: stepTaken.branch, worktree: stepTaken.worktree }),
  );

  const refusedWithoutChecklistMarker = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: stepId, step: 1, resume: { branch: stepBranch, worktree: stepWorktreeRelative } },
    })),
  );
  check(
    "a plan-only constrained request refuses without a mapped unchecked checklist marker",
    refusedWithoutChecklistMarker.ready === false && /mapped unchecked checklist marker/i.test(refusedWithoutChecklistMarker.reason),
    refusedWithoutChecklistMarker.reason,
  );
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: stepId, doc: "checklist", content: "- [ ] Step 1 — cap the loop\n- [ ] Step 2 — document the cap\n" },
  });

  const stepOne = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: stepId, step: 1, resume: { branch: stepBranch, worktree: stepWorktreeRelative } },
    })),
  );
  check(
    "a compiled step packet limits the worker to that step's allowed files and omits unenforceable free-form symbols",
    stepOne.ready === true &&
      JSON.stringify(stepOne.step?.allowedFiles) === JSON.stringify(["src/queue.ts", "src/queue.test.ts"]) &&
      JSON.stringify(stepOne.step?.allowedSymbols) === JSON.stringify([]) &&
      JSON.stringify(stepOne.step?.forbiddenFiles) === JSON.stringify(["src/vendor/bundle.js"]) &&
      !stepOne.step?.allowedFiles.includes("docs/queue.md"),
    JSON.stringify(stepOne.step?.allowedFiles ?? stepOne.reason),
  );
  check(
    "a compiled step packet records its exact tests, commands, expected output and stop condition",
    JSON.stringify(stepOne.step?.tests) === JSON.stringify(["src/queue.test.ts"]) &&
      JSON.stringify(stepOne.step?.commands) === JSON.stringify(["npm test"]) &&
      stepOne.step?.expectedOutput === "the retry suite passes." &&
      stepOne.step?.doneCondition === "`npm test` reports green." &&
      stepOne.step?.deviationStop === "stop if the cap must become dynamic." &&
      stepOne.step?.stopCondition.includes("Stop when the PR is open.") &&
      stepOne.step?.stopCondition.includes("Complete only this step, then stop and report."),
    JSON.stringify(stepOne.step?.stopCondition),
  );
  check(
    "a compiled step packet is versioned and bound to project, ticket revision, plan and step identity",
    stepOne.step?.packetVersion === "step-packet/2" &&
      /^[a-f0-9]{64}$/.test(stepOne.step?.packetId ?? "") &&
      stepOne.step?.project?.fingerprint === expectedProject &&
      typeof stepOne.step?.project?.project_id === "string" &&
      stepOne.step?.ticket?.id === stepId &&
      stepOne.step?.ticket?.revision === stepOne.ticket?.revision &&
      stepOne.step?.workspace?.branch === stepBranch &&
      stepOne.step?.workspace?.worktree === stepWorktreeRelative &&
      /^[a-f0-9]{40}$/.test(stepOne.step?.workspace?.head ?? "") &&
      stepOne.step?.plan?.path === "plan/plan.md" &&
      stepOne.step?.plan?.version === stepOne.documents?.plan?.version &&
      JSON.stringify(stepOne.step?.step) === JSON.stringify({ index: 1, total: 3, id: "step-1", title: "Bound the retry loop" }),
    JSON.stringify(stepOne.step?.step),
  );
  check(
    "a compiled step packet keeps the shared group and ticket evidence layers apart",
    stepOne.step?.evidence?.group?.length === 1 &&
      JSON.stringify(stepOne.step?.evidence?.group?.map((e) => e.path)) === JSON.stringify([`${epic.id}/context.md`]) &&
      stepOne.step?.evidence?.ticket?.some((e) => e.path === "research/research.md" && e.version === stepResearchVersion) &&
      stepOne.step?.evidence?.ticket?.some((e) => e.path === "files/files.md" && e.version === stepFilesVersion),
    JSON.stringify(stepOne.step?.evidence),
  );

  const nextBeforeTick = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: stepId, step: "next", resume: { branch: stepBranch, worktree: stepWorktreeRelative } },
    })),
  );
  check(
    "step \"next\" selects the first unfinished ordered step",
    nextBeforeTick.ready === true && nextBeforeTick.step?.step?.index === 1,
    JSON.stringify(nextBeforeTick.step?.step ?? nextBeforeTick.reason),
  );

  const stepBoardBeforeReconcile = treeSnapshot(path.join(sandbox, ".kanmer"));
  fs.writeFileSync(path.join(stepWorktree, "src", "secret.ts"), "export const secret = true;\n");
  const undeclaredReconciliation = JSON.parse(textOf(await client.callTool({
    name: "reconcile_ticket",
    arguments: { id: stepId, step_packet: stepOne.step },
  })));
  check(
    "step reconciliation derives and refuses an undeclared actual workspace change",
    undeclaredReconciliation.step?.status === "fail" &&
      undeclaredReconciliation.step?.findings?.some((finding) => finding.code === "STEP_PATH_UNDECLARED" && finding.path === "src/secret.ts"),
    JSON.stringify(undeclaredReconciliation.step),
  );
  fs.rmSync(path.join(stepWorktree, "src", "secret.ts"));
  check(
    "packet-aware reconciliation is read-only for the board",
    JSON.stringify(treeSnapshot(path.join(sandbox, ".kanmer"))) === JSON.stringify(stepBoardBeforeReconcile),
  );

  fs.appendFileSync(path.join(stepWorktree, "src", "queue.ts"), "// cap retry loop at QUEUE_MAX_RETRIES\n");
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: stepId, doc: "checklist", content: "- [x] Step 1 — cap the loop\n- [ ] Step 2 — document the cap\n" },
  });
  const reconciledStepOne = JSON.parse(textOf(await client.callTool({
    name: "reconcile_ticket",
    arguments: { id: stepId, step_packet: stepOne.step },
  })));
  check(
    "a selected checklist tick plus only allowed actual changes reconciles PASS",
    reconciledStepOne.step?.status === "pass" &&
      JSON.stringify(reconciledStepOne.step?.changedPaths) === JSON.stringify([{ path: "src/queue.ts", classification: "allowed" }]),
    JSON.stringify(reconciledStepOne.step),
  );
  const refusedNextWithoutPrior = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: { id: stepId, step: "next", resume: { branch: stepBranch, worktree: stepWorktreeRelative } },
    })),
  );
  check(
    "a later step refuses packet-id-free or missing predecessor authority",
    refusedNextWithoutPrior.ready === false && refusedNextWithoutPrior.reason.includes("complete exact prior_step_packet"),
    refusedNextWithoutPrior.reason,
  );
  const nextAfterTick = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: {
        id: stepId,
        step: "next",
        resume: { branch: stepBranch, worktree: stepWorktreeRelative },
        prior_step_packet: stepOne.step,
      },
    })),
  );
  check(
    "step \"next\" advances only after the exact prior packet reconciles PASS",
    nextAfterTick.ready === true && nextAfterTick.step?.step?.index === 2 &&
      JSON.stringify(nextAfterTick.step?.allowedFiles) === JSON.stringify(["docs/queue.md"]),
    JSON.stringify(nextAfterTick.step?.step ?? nextAfterTick.reason),
  );

  const stepTicketFile = path.join(sandbox, ".kanmer", "areas", "_none", stepId, `${stepId}.md`);
  // Scoped to `.kanmer`: by this point the sandbox also holds the linked Git
  // worktrees earlier checks created, and the board is what must not move.
  const stepRefusalBefore = {
    tree: treeSnapshot(path.join(sandbox, ".kanmer")),
    ticket: fs.readFileSync(stepTicketFile, "utf8"),
    activity: fs.readFileSync(packetActivity, "utf8"),
  };
  const broadenedPrior = structuredClone(stepOne.step);
  broadenedPrior.allowedFiles.push("src/secret.ts");
  const refusedTamperedPrior = JSON.parse(textOf(await client.callTool({
    name: "get_execution_packet",
    arguments: {
      id: stepId,
      step: "next",
      resume: { branch: stepBranch, worktree: stepWorktreeRelative },
      prior_step_packet: broadenedPrior,
    },
  })));
  check(
    "a recomputed-authority attempt without a matching full packet digest is refused",
    refusedTamperedPrior.ready === false && refusedTamperedPrior.code === "GATE_BLOCKED" &&
      refusedTamperedPrior.reason.includes("digest does not match"),
    refusedTamperedPrior.reason,
  );
  const refusedSkip = JSON.parse(textOf(await client.callTool({
    name: "get_execution_packet",
    arguments: {
      id: stepId,
      step: 3,
      resume: { branch: stepBranch, worktree: stepWorktreeRelative },
      prior_step_packet: stepOne.step,
    },
  })));
  check(
    "numeric selection cannot skip the current unfinished ordered step",
    refusedSkip.ready === false && refusedSkip.reason.includes("not the immediately preceding step 2"),
    refusedSkip.reason,
  );
  const stepRefusalAfter = {
    tree: treeSnapshot(path.join(sandbox, ".kanmer")),
    ticket: fs.readFileSync(stepTicketFile, "utf8"),
    activity: fs.readFileSync(packetActivity, "utf8"),
  };
  check(
    "a step-packet refusal leaves board stage, claim and workspace unchanged",
    JSON.stringify(stepRefusalAfter) === JSON.stringify(stepRefusalBefore),
  );

  const refusedNoSteps = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: packetId, step: 1 } })),
  );
  check(
    "a constrained request without a recorded worktree is refused while its whole-ticket setup packet still works",
    refusedNoSteps.ready === false && refusedNoSteps.reason.includes("proven recorded branch and worktree") &&
      readyPacket.ready === true,
    refusedNoSteps.reason,
  );
  const legacyStepsId = JSON.parse(
    textOf(await client.callTool({ name: "create_item", arguments: { title: "legacy step list", status: "implementing", profile: "chore", docs_todo: true } })),
  ).id;
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: legacyStepsId, doc: "plan", content: "# Legacy\n\n## Ordered steps\n1. Do everything.\n\n## Stop condition\nStop.\n" },
  });
  const refusedUnstructured = JSON.parse(
    textOf(await client.callTool({ name: "get_execution_packet", arguments: { id: legacyStepsId, step: 1 } })),
  );
  check(
    "an unclaimed legacy plan cannot bypass the recorded-workspace constraint",
    refusedUnstructured.ready === false && refusedUnstructured.reason.includes("proven recorded branch and worktree"),
    refusedUnstructured.reason,
  );

  await client.callTool({ name: "set_ticket_doc", arguments: { id: stepId, doc: "research", content: "Queue retry research, revised." } });
  const refusedStaleEvidence = JSON.parse(
    textOf(await client.callTool({
      name: "get_execution_packet",
      arguments: {
        id: stepId,
        step: 2,
        resume: { branch: stepBranch, worktree: stepWorktreeRelative },
        prior_step_packet: stepOne.step,
      },
    })),
  );
  check(
    "a plan pinned to superseded evidence cannot authorize another step",
    refusedStaleEvidence.ready === false && refusedStaleEvidence.reason.includes("prior step reconciled as fail") &&
      refusedStaleEvidence.reason.includes("Evidence research/research.md changed"),
    refusedStaleEvidence.reason,
  );

  // CORE-122: reconcile_ticket is a read-only inspector with an advisory
  // recommendation. An unclaimed Review ticket with no PR has one safe
  // recommendation: return it to Implementing. CORE-131 adds the apply half —
  // a separate, explicitly revision-bound tool; the dry run still mutates
  // nothing (FRD-028 acceptance 1 must not regress).
  const reconcileTool = tools.tools.find((t) => t.name === "reconcile_ticket");
  check("reconcile_ticket is read-only and discloses external Git/GitHub reads", reconcileTool?.annotations?.readOnlyHint === true && reconcileTool?.annotations?.openWorldHint === true);
  const applyTool = tools.tools.find((t) => t.name === "apply_reconciliation");
  check(
    "apply_reconciliation is registered as a non-destructive, non-idempotent write that discloses external reads",
    applyTool?.annotations?.readOnlyHint === false &&
      applyTool?.annotations?.destructiveHint === false &&
      applyTool?.annotations?.idempotentHint === false &&
      applyTool?.annotations?.openWorldHint === true &&
      applyTool?.inputSchema?.required?.includes("expected_revision") === true &&
      // registerTool injects expected_project for every write tool; it is
      // never hand-added to the schema.
      Object.keys(applyTool?.inputSchema?.properties ?? {}).sort().join(",") === "controller,expected_project,expected_revision,id,reason",
    JSON.stringify(applyTool?.annotations ?? null) + " " + Object.keys(applyTool?.inputSchema?.properties ?? {}).sort().join(","),
  );
  const reconcileId = JSON.parse(
    textOf(await client.callTool({
      name: "create_item",
      arguments: { title: "reconciliation dry-run", status: "review", profile: "custom", requires: {}, expected_project: expectedProject },
    })),
  ).id;
  const reconcileBefore = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: reconcileId } })));
  const reconciliation = JSON.parse(textOf(await client.callTool({ name: "reconcile_ticket", arguments: { id: reconcileId } })));
  check(
    "reconcile_ticket returns an advisory recommendation with claim facts, bound to the ticket revision",
    reconciliation.evidence?.ticket?.id === reconcileId &&
      reconciliation.recommendation?.action === "MOVE_TO_IMPLEMENTING" &&
      reconciliation.recommendation?.advisory === true &&
      reconciliation.recommendation?.ticketId === reconcileId &&
      reconciliation.recommendation?.revision === reconcileBefore.revision &&
      // The revision is the only freshness token: no second proposal hash.
      reconciliation.recommendation?.id === undefined &&
      reconciliation.proposal === undefined &&
      reconciliation.evidence?.claim?.state === "unclaimed" &&
      reconciliation.evidence?.claim?.reviewRound === 0 &&
      reconciliation.evidence?.claim?.remediationBudget === 1 &&
      reconciliation.evidence?.release?.state === "not-applicable" &&
      reconciliation.findings?.[0]?.code === "REVIEW_WITHOUT_PR_OR_WORKER",
    JSON.stringify(reconciliation),
  );
  const reconcileAfter = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: reconcileId } })));
  check(
    "reconcile_ticket never mutates the ticket",
    reconcileAfter.status === "review" && reconcileAfter.updated === reconcileBefore.updated,
    JSON.stringify({ before: reconcileBefore.updated, after: reconcileAfter.updated, status: reconcileAfter.status }),
  );
  // FRD-028 acceptance 2: a stale revision is a structured conflict that
  // writes nothing.
  const staleApply = await client.callTool({
    name: "apply_reconciliation",
    arguments: { id: reconcileId, expected_revision: "rev1:0000000000000000", reason: "operator: smoke", expected_project: expectedProject },
  });
  const staleApplyItem = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: reconcileId } })));
  check(
    "apply_reconciliation refuses a stale expected_revision and mutates nothing",
    staleApply.isError === true &&
      staleApply.structuredContent?.error?.code === "REVISION_CONFLICT" &&
      staleApplyItem.status === "review" &&
      staleApplyItem.revision === reconcileBefore.revision &&
      staleApplyItem.updated === reconcileBefore.updated,
    textOf(staleApply),
  );
  // The production caller: the same recommendation, applied through a real MCP
  // client, with the operator authority CORE-121's contract demands.
  const applied = await client.callTool({
    name: "apply_reconciliation",
    arguments: {
      id: reconcileId,
      expected_revision: reconcileBefore.revision,
      reason: "operator: reconciliation smoke returns the PR-less review ticket",
      expected_project: expectedProject,
    },
  });
  const appliedResult = applied.isError ? null : JSON.parse(textOf(applied));
  const appliedItem = JSON.parse(textOf(await client.callTool({ name: "get_item", arguments: { id: reconcileId } })));
  const appliedExecution = JSON.parse(
    textOf(await client.callTool({ name: "get_ticket_doc", arguments: { id: reconcileId, doc: "scratch/execution" } })),
  );
  check(
    "apply_reconciliation applies the current recommendation and records one durable transition",
    applied.isError !== true &&
      appliedResult?.action === "MOVE_TO_IMPLEMENTING" &&
      appliedResult?.item?.status === "implementing" &&
      appliedResult?.result?.recommendation?.action === "MOVE_TO_IMPLEMENTING" &&
      appliedItem.status === "implementing" &&
      appliedExecution.content?.includes("## Transitions") === true &&
      appliedExecution.content?.includes(`reconcile MOVE_TO_IMPLEMENTING by `) === true &&
      appliedExecution.content?.includes(`; stage review → implementing; revision ${reconcileBefore.revision}`) === true,
    textOf(applied) + " " + JSON.stringify(appliedExecution.content ?? null),
  );

  // --- FRD-029 AC4/AC5 (MCP-054): named endpoints, observational only -----
  // A second project fixture served by ITS OWN process: two endpoints, one
  // project each. The registry names both; neither can reach the other.
  const clientB = new Client({ name: "smoke-b", version: "0.0.0" });
  await clientB.connect(new StdioClientTransport({ command: runner, args: [serverEntry, "--root", sandboxB], env: runnerEnv }));
  try {
    const noRegistry = JSON.parse(textOf(await client.callTool({ name: "list_projects", arguments: {} })));
    check(
      "list_projects without a registry file is empty, not an error",
      noRegistry.registry?.exists === false && noRegistry.registry?.error === null && noRegistry.registry?.source === "env" &&
        noRegistry.registry?.path === registryFile && noRegistry.endpoints?.length === 0 && noRegistry.bound?.project_id === projectId,
      JSON.stringify(noRegistry.registry),
    );
    const createdB = await clientB.callTool({ name: "create_item", arguments: { type: "ticket", title: "Fixture B ticket", profile: "chore" } });
    const ticketB = JSON.parse(textOf(createdB)).id;
    await clientB.callTool({ name: "take_ticket", arguments: { id: ticketB, branch: "b-work", worktree: ".worktrees/b-work", assignee: "controller-b", stage: "backlog" } });
    const statusB = JSON.parse(textOf(await clientB.callTool({ name: "get_status", arguments: {} })));
    const projectIdB = statusB.project?.project_id;
    check("fixture B has its own logical project_id", UUID_RE.test(projectIdB ?? "") && projectIdB !== projectId, `${projectId} vs ${projectIdB}`);
    fs.writeFileSync(registryFile, JSON.stringify({
      schema: 1,
      endpoints: {
        alpha: { boardRoot: sandbox, policy: "main-only" },
        beta: { boardRoot: sandboxB, boardBranch: "kanmer-board" },
        gamma: { boardRoot: "relative/board" },
      },
    }), "utf8");
    const fromA = JSON.parse(textOf(await client.callTool({ name: "list_projects", arguments: {} })));
    const fromB = JSON.parse(textOf(await clientB.callTool({ name: "list_projects", arguments: {} })));
    const byName = (view) => Object.fromEntries((view.endpoints ?? []).map((e) => [e.name, e]));
    const a = byName(fromA);
    const b = byName(fromB);
    check(
      "both endpoints observe both named projects with their distinct project_ids",
      fromA.registry?.exists === true && fromA.endpoints?.length === 3 &&
        a.alpha?.project?.project_id === projectId && a.beta?.project?.project_id === projectIdB &&
        b.alpha?.project?.project_id === projectId && b.beta?.project?.project_id === projectIdB &&
        a.alpha.health === "ok" && a.beta.health === "ok" && a.alpha.policy === "main-only",
      JSON.stringify({ a: Object.keys(a), b: Object.keys(b) }),
    );
    check(
      "each process marks only its own endpoint as bound",
      a.alpha?.bound === true && a.beta?.bound === false && fromA.bound?.endpoint === "alpha" &&
        b.beta?.bound === true && b.alpha?.bound === false && fromB.bound?.endpoint === "beta",
      JSON.stringify({ fromA: fromA.bound, fromB: fromB.bound }),
    );
    check(
      "fixture B's active controller and workspace are observable from endpoint A",
      a.beta?.controllers?.some((c) => c.controller === "controller-b" && c.tickets.includes(ticketB)) &&
        a.beta?.workspaces?.some((w) => w.ticket === ticketB && w.branch === "b-work" && w.worktree === ".worktrees/b-work" && w.claim === "live"),
      JSON.stringify(a.beta?.workspaces),
    );
    check(
      "an invalid registry entry is reported, not dropped or resolved",
      a.gamma?.health === "invalid" && a.gamma?.problems?.some((p) => p.includes("absolute")) && a.gamma?.project === null,
      JSON.stringify(a.gamma),
    );
    check(
      "list_projects carries location evidence and board sync per endpoint",
      typeof a.beta?.location?.fingerprint === "string" && a.beta.location.fingerprint.startsWith("kanmer-loc-v1:") &&
        "boardSync" in a.beta && a.beta.location.boardPath !== a.alpha.location.boardPath,
    );
    const filtered = JSON.parse(textOf(await client.callTool({ name: "list_projects", arguments: { name: "beta" } })));
    const unknownName = JSON.parse(textOf(await client.callTool({ name: "list_projects", arguments: { name: "delta" } })));
    check(
      "the name filter selects one endpoint and reports an unknown name as missing",
      filtered.endpoints?.length === 1 && filtered.endpoints[0].name === "beta" && unknownName.endpoints?.length === 0 && unknownName.missing?.[0] === "delta",
    );
    const pathArgs = JSON.parse(textOf(await client.callTool({ name: "list_projects", arguments: { boardRoot: sandboxB, root: sandboxB, name: "alpha" } })));
    check(
      "list_projects ignores path-like arguments — a request cannot select a board",
      pathArgs.endpoints?.length === 1 && pathArgs.endpoints[0].name === "alpha" && pathArgs.bound?.project_id === projectId,
    );
    const projectsTool = tools.tools.find((t) => t.name === "list_projects");
    check(
      "no tool schema at all lets a request choose a project path",
      projectsTool?.annotations?.readOnlyHint === true && Object.keys(projectsTool.inputSchema?.properties ?? {}).join(",") === "name" &&
        tools.tools.every((t) => !["root", "path_root", "project_root", "board_root", "repo_root", "cwd", "boardRoot", "repoRoot"].some((k) => k in (t.inputSchema?.properties ?? {}))),
    );
    // Cross-project mutation: endpoint A is asked to write "as" project B.
    const ticketBFile = path.join(sandboxB, ".kanmer", "areas", "_none", ticketB, `${ticketB}.md`);
    const ticketAFile = path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001", "TICK-001.md");
    const beforeB = fs.readFileSync(ticketBFile, "utf8");
    const beforeA = fs.readFileSync(ticketAFile, "utf8");
    const cross = await client.callTool({ name: "update_item", arguments: { id: "TICK-001", labels: ["cross"], expected_project: projectIdB } });
    const crossB = await client.callTool({ name: "update_item", arguments: { id: ticketB, labels: ["cross"], expected_project: projectIdB } });
    check(
      "a cross-project mutation is refused structurally with WRONG_PROJECT and writes nothing on either board",
      cross.isError === true && cross.structuredContent?.error?.code === "WRONG_PROJECT" && cross.structuredContent?.project?.project_id === projectId &&
        crossB.isError === true && crossB.structuredContent?.error?.code === "WRONG_PROJECT" &&
        fs.readFileSync(ticketBFile, "utf8") === beforeB && fs.readFileSync(ticketAFile, "utf8") === beforeA,
      JSON.stringify({ cross: cross.structuredContent, crossB: crossB.structuredContent }),
    );
    const afterA = JSON.parse(textOf(await client.callTool({ name: "get_status", arguments: {} })));
    check(
      "observing other endpoints never rebinds this process",
      afterA.project?.project_id === projectId && afterA.projectRoot === sandbox && afterA.compat?.endpointRegistry === "optional" &&
        !fs.existsSync(path.join(sandboxB, ".kanmer", "endpoints.json")) && fs.readFileSync(registryFile, "utf8").includes("gamma"),
    );
  } finally {
    await clientB.close();
  }

  const del1 = await client.callTool({ name: "delete_item", arguments: { id: "TICK-001" } });
  check(
    "delete_item removes the ticket folder",
    textOf(del1).includes("TICK-001") &&
      !fs.existsSync(path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001")),
  );
  const delPayload = JSON.parse(textOf(del1));
  check(
    "delete_item reports cleanedLinks and bodyReferencesRemain",
    Array.isArray(delPayload.cleanedLinks) && Array.isArray(delPayload.bodyReferencesRemain),
  );
} finally {
  await client.close();
  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.rmSync(sandboxB, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

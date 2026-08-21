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
import { canonicalProjectPath, projectIdentity } from "../dist/project-identity.js";

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
  check("tools/list returns 30 tools", tools.tools.length === 30, `got ${tools.tools.length}`);
  for (const name of [
    "append_scratch",
    "link_doc",
    "get_doc_gates",
    "migrate_board",
    "create_group",
    "update_group",
    "get_group",
    "list_groups",
    "get_group_doc",
    "set_group_doc",
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
  const expectedPosixBoardRoot = process.platform === "win32" ? "c:/srv/kanmer-board" : "/srv/kanmer-board";
  const expectedPosixRepoRoot = process.platform === "win32" ? "c:/srv/kanmer-repo" : "/srv/kanmer-repo";
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
    "reads alone do not create .kanmer/ (lazy init)",
    !fs.existsSync(path.join(sandbox, ".kanmer")),
  );
  const healthBefore = statusBefore.boardWorktree;
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
    plan.isError === true && textOf(plan).includes("set_ticket_doc") && plan.structuredContent === undefined,
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
    "blocked",
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
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

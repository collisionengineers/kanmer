// Standalone smoke test: spawn the built server over stdio and exercise tools.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

try {
  await client.connect(transport);

  const tools = await client.listTools();
  check("tools/list returns 24 tools", tools.tools.length === 24, `got ${tools.tools.length}`);
  for (const name of ["append_scratch", "link_doc", "get_doc_gates", "migrate_board"]) {
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

  const boardRes = await client.callTool({ name: "list_board", arguments: {} });
  const board = JSON.parse(textOf(boardRes));
  check(
    "list_board returns the seven workflow stages",
    JSON.stringify(board.statuses.map((s) => s.id)) ===
      JSON.stringify([
        "backlog",
        "researching",
        "planning",
        "implementing",
        "review",
        "verifying",
        "done",
      ]),
    board.statuses.map((s) => s.id).join(">"),
  );
  check("board has no phases dimension", board.phases === undefined);
  check("board carries priorities", board.priorities.some((p) => p.id === "urgent"));
  check("board carries areas array", Array.isArray(board.areas));
  check("list_board reports source: default before any write", board.source === "default", board.source);

  const itemsBeforeWrite = await client.callTool({ name: "list_items", arguments: {} });
  check("list_items works before any write", JSON.parse(textOf(itemsBeforeWrite)).length === 0);
  const statusBefore = JSON.parse(
    textOf(await client.callTool({ name: "get_status", arguments: {} })),
  );
  check(
    "get_status reports exists=false, format 2, default board on a fresh root",
    statusBefore.exists === false &&
      statusBefore.format === 2 &&
      statusBefore.boardSource === "default",
  );
  check(
    "reads alone do not create .kanmer/ (lazy init)",
    !fs.existsSync(path.join(sandbox, ".kanmer")),
  );

  const created = await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "Smoke ticket", body: "See [[PLAN-001]]" },
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
    plan.isError === true && textOf(plan).includes("set_ticket_doc"),
  );

  // Created directly in implementing — creation is ungated, so imports/backfills
  // of in-flight work land wherever they belong.
  const second = await client.callTool({
    name: "create_item",
    arguments: {
      type: "ticket",
      title: "Second ticket",
      status: "implementing",
      body: "See [[TICK-001]]",
    },
  });
  check("create_item allocates TICK-002 into implementing", JSON.parse(textOf(second)).id === "TICK-002");

  // Document gate: entering review needs post-implementation-report.md.
  const gatedReview = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-002", status: "review" },
  });
  check(
    "move_item into review is gated on post-implementation-report.md",
    gatedReview.isError === true && textOf(gatedReview).includes("post-implementation-report"),
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

  const conflict = await client.callTool({
    name: "update_item",
    arguments: { id: "TICK-001", title: "New", expected_updated: "2000-01-01T00:00:00.000Z" },
  });
  check(
    "update_item with stale expected_updated returns a conflict",
    conflict.isError === true && textOf(conflict).includes("Conflict"),
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
    enrichedItem.docs.research === true && enrichedItem.docs.proof === false,
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
    "move_item into review succeeds once post-implementation-report.md exists",
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
    gated.isError === true && textOf(gated).includes("proof.md"),
  );
  await client.callTool({
    name: "set_ticket_doc",
    arguments: { id: "TICK-002", doc: "proof", content: "Smoke evidence." },
  });
  const nowDone = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-002", status: "done" },
  });
  check("move_item succeeds once proof.md exists", JSON.parse(textOf(nowDone)).status === "done");
  const released = await client.callTool({
    name: "take_ticket",
    arguments: { id: "TICK-002", action: "release" },
  });
  check("take_ticket release clears the taken fields", !JSON.parse(textOf(released)).taken_at);

  // A status reorder that would make a stage final is gated the same way a move
  // is: a ticket created directly into "review" without the configured
  // post-implementation report needed to cross its new final boundary.
  await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "Reorder victim", status: "review" },
  });
  const gatedReorder = await client.callTool({
    name: "reorder_columns",
    arguments: {
      kind: "status",
      order: ["backlog", "researching", "planning", "implementing", "verifying", "done", "review"],
    },
  });
  check(
    "reorder_columns status applies the configured final-stage gate",
    gatedReorder.isError === true && textOf(gatedReorder).includes("post-implementation-report.md"),
    textOf(gatedReorder).slice(0, 80),
  );
  const boardStillDone = JSON.parse(
    textOf(await client.callTool({ name: "list_board", arguments: {} })),
  );
  check(
    "the refused status reorder left the board untouched",
    boardStillDone.statuses[boardStillDone.statuses.length - 1].id === "done",
  );

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

  // Board management verbs.
  const renamed = JSON.parse(
    textOf(
      await client.callTool({
        name: "update_column",
        arguments: { kind: "priority", id: "low", name: "Someday" },
      }),
    ),
  );
  check(
    "update_column renames in place",
    renamed.priorities.find((p) => p.id === "low")?.name === "Someday",
  );
  const badOrder = await client.callTool({
    name: "reorder_columns",
    arguments: { kind: "priority", order: ["low", "medium"] },
  });
  check("reorder_columns rejects a non-permutation", badOrder.isError === true);
  const reordered = JSON.parse(
    textOf(
      await client.callTool({
        name: "reorder_columns",
        arguments: { kind: "priority", order: ["urgent", "high", "medium", "low"] },
      }),
    ),
  );
  check(
    "reorder_columns applies the permutation",
    reordered.priorities[0].id === "urgent",
  );
  await client.callTool({
    name: "add_column",
    arguments: { kind: "status", id: "qa", name: "QA" },
  });
  const removedEmpty = JSON.parse(
    textOf(
      await client.callTool({ name: "remove_column", arguments: { kind: "status", id: "qa" } }),
    ),
  );
  check(
    "remove_column drops an empty column",
    removedEmpty.board.statuses.every((s) => s.id !== "qa"),
  );

  const links = await client.callTool({ name: "get_links", arguments: { id: "TICK-001" } });
  check("get_links resolves wiki backlink", textOf(links).includes("TICK-002"));

  const search = await client.callTool({ name: "search_items", arguments: { query: "Smoke ticket" } });
  check("search_items finds the ticket", textOf(search).includes("TICK-001"));

  const onDisk = fs.existsSync(
    path.join(sandbox, ".kanmer", "areas", "_none", "TICK-001", "TICK-001.md"),
  );
  check("ticket lives in its own folder under areas/_none", onDisk);
  check(
    "version.json stamped with format 2",
    JSON.parse(fs.readFileSync(path.join(sandbox, ".kanmer", "version.json"), "utf8")).format === 2,
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
    "id",
    "labels",
    "order",
    "priority",
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
        arguments: { type: "ticket", title: "Gate probe" },
      }),
    ),
  );
  const gpId = gateProbe.id;
  const gatesForProbe = JSON.parse(
    textOf(await client.callTool({ name: "get_doc_gates", arguments: { id: gpId } })),
  );
  check(
    "get_doc_gates reports the ticket's doc types and gates",
    Array.isArray(gatesForProbe.docTypes) && Array.isArray(gatesForProbe.gates),
  );
  const blockedLeave = await client.callTool({
    name: "move_item",
    arguments: { id: gpId, status: "researching" },
  });
  check(
    "leaving backlog is gated on a governing doc",
    blockedLeave.isError === true && /governing/i.test(textOf(blockedLeave)),
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
    arguments: { id: gpId, status: "researching" },
  });
  check(
    "a linked governing doc satisfies the leave-backlog gate",
    JSON.parse(textOf(nowLeaves)).status === "researching",
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

  // Scratch: append, read back through get_ticket_doc(scratch-<slug>).
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
        arguments: { id: gpId, doc: "scratch-research" },
      }),
    ),
  );
  check(
    "append_scratch is read back through get_ticket_doc(scratch-<slug>)",
    scratchBack.content?.includes("scratch line one") &&
      scratchBack.content?.includes("scratch line two"),
  );
  const probeDocs = JSON.parse(
    textOf(await client.callTool({ name: "get_item", arguments: { id: gpId } })),
  );
  check(
    "scratch is not counted among the pipeline docs",
    probeDocs.docs["scratch-research"] === undefined,
  );

  // Board-level doc model + a no-op migrate dry run.
  const boardGates = JSON.parse(
    textOf(await client.callTool({ name: "get_doc_gates", arguments: {} })),
  );
  check(
    "get_doc_gates without id returns the board's doc model",
    Array.isArray(boardGates.default?.types) && typeof boardGates.repoDocs === "object",
  );
  const migratePreview = JSON.parse(
    textOf(await client.callTool({ name: "migrate_board", arguments: { dry_run: true } })),
  );
  check(
    "migrate_board dry_run reports on an already-current board",
    migratePreview.backfill && Array.isArray(migratePreview.backfill.addedStages),
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

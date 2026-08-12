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
  check("tools/list returns 11 tools", tools.tools.length === 11, `got ${tools.tools.length}`);

  const del = tools.tools.find((t) => t.name === "delete_item");
  check("delete_item is destructive", del?.annotations?.destructiveHint === true);
  const list = tools.tools.find((t) => t.name === "list_items");
  check("list_items is read-only", list?.annotations?.readOnlyHint === true);
  check("add_column tool exists", tools.tools.some((t) => t.name === "add_column"));

  const boardRes = await client.callTool({ name: "list_board", arguments: {} });
  const board = JSON.parse(textOf(boardRes));
  check(
    "list_board returns the six workflow stages",
    JSON.stringify(board.statuses.map((s) => s.id)) ===
      JSON.stringify(["todo", "planning", "implementing", "review", "verifying", "done"]),
    board.statuses.map((s) => s.id).join(">"),
  );
  check("board has no phases dimension", board.phases === undefined);
  check("board carries priorities", board.priorities.some((p) => p.id === "urgent"));
  check("board carries areas array", Array.isArray(board.areas));
  check("list_board reports source: default before any write", board.source === "default", board.source);

  const itemsBeforeWrite = await client.callTool({ name: "list_items", arguments: {} });
  check("list_items works before any write", JSON.parse(textOf(itemsBeforeWrite)).length === 0);
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
  check("create_item defaults to the first stage", createdItem.status === "todo", createdItem.status);
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

  const second = await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "Second ticket", body: "See [[TICK-001]]" },
  });
  check("create_item allocates TICK-002", JSON.parse(textOf(second)).id === "TICK-002");

  const moved = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-001", status: "review" },
  });
  check("move_item changes status", JSON.parse(textOf(moved)).status === "review");

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
    "id",
    "labels",
    "priority",
    "status",
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

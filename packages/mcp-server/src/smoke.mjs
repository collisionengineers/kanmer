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

  const phases = await client.callTool({ name: "list_phases", arguments: {} });
  const board = JSON.parse(textOf(phases));
  check("list_phases returns board", board.phases.some((p) => p.id === "build"));
  check("board carries priorities", board.priorities.some((p) => p.id === "urgent"));
  check("board carries areas array", Array.isArray(board.areas));

  const created = await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "Smoke ticket", phase: "build", body: "See [[PLAN-001]]" },
  });
  const createdItem = JSON.parse(textOf(created));
  check("create_item allocates TICK-001", createdItem.id === "TICK-001", createdItem.id);
  check("create_item honours phase", createdItem.phase === "build");

  const plan = await client.callTool({
    name: "create_item",
    arguments: { type: "plan", title: "Smoke plan" },
  });
  check("create_item allocates PLAN-001", JSON.parse(textOf(plan)).id === "PLAN-001");

  const moved = await client.callTool({
    name: "move_item",
    arguments: { id: "TICK-001", status: "review" },
  });
  check("move_item changes status", JSON.parse(textOf(moved)).status === "review");

  const links = await client.callTool({ name: "get_links", arguments: { id: "PLAN-001" } });
  check("get_links resolves wiki backlink", textOf(links).includes("TICK-001"));

  const search = await client.callTool({ name: "search_items", arguments: { query: "Smoke ticket" } });
  check("search_items finds the ticket", textOf(search).includes("TICK-001"));

  const onDisk = fs.existsSync(path.join(sandbox, ".kanmer", "tickets", "TICK-001.md"));
  check("ticket file written to .kanmer/tickets", onDisk);

  // Areas: add an area column, create a ticket in it, filter by it.
  const addArea = await client.callTool({
    name: "add_column",
    arguments: { kind: "area", id: "ui", name: "UI", color: "#5b8cff" },
  });
  check("add_column area updates board", textOf(addArea).includes('"ui"'));
  await client.callTool({
    name: "create_item",
    arguments: { type: "ticket", title: "UI card", area: "ui" },
  });
  const uiList = await client.callTool({ name: "list_items", arguments: { area: "ui" } });
  check("list_items filters by area", JSON.parse(textOf(uiList)).length === 1);

  // Archive: hide from default listing, visible with include_archived.
  await client.callTool({ name: "update_item", arguments: { id: "PLAN-001", archived: true } });
  const activePlans = await client.callTool({ name: "list_items", arguments: { type: "plan" } });
  check("archived item excluded by default", JSON.parse(textOf(activePlans)).length === 0);
  const allPlans = await client.callTool({
    name: "list_items",
    arguments: { type: "plan", include_archived: true },
  });
  check("archived item shown with include_archived", JSON.parse(textOf(allPlans)).length === 1);

  const del1 = await client.callTool({ name: "delete_item", arguments: { id: "TICK-001" } });
  check("delete_item removes the file", textOf(del1).includes("TICK-001") && !fs.existsSync(path.join(sandbox, ".kanmer", "tickets", "TICK-001.md")));
} finally {
  await client.close();
  fs.rmSync(sandbox, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

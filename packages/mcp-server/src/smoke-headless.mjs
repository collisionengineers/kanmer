// Headless acceptance rail: run the standalone server from a plain temp host
// with no repository node_modules, using only an explicit board root.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const sourceServer = process.env.KANMER_SERVER ?? join(here, "..", "dist", "standalone", "kanmer-mcp.cjs");
const host = mkdtempSync(join(tmpdir(), "kanmer-headless-"));
const board = join(host, "board");
const server = join(host, "kanmer-mcp.cjs");
const hostMarker = join(host, "host-marker.txt");
const checks = [];
const check = (name, ok, detail = "") => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
try {
  copyFileSync(sourceServer, server);
  await import("node:fs/promises").then(({ writeFile }) => writeFile(hostMarker, "host\n"));
  const transport = new StdioClientTransport({ command: process.execPath, args: [server, "--root", board], cwd: host });
  const client = new Client({ name: "headless-smoke", version: "0.0.0" });
  await client.connect(transport);
  const tools = await client.listTools();
  const prompts = await client.listPrompts();
  check("standalone server starts without node_modules", tools.tools.length >= 30);
  check("live tools and prompts are exposed", prompts.prompts.some((p) => p.name === "standup") && tools.tools.some((t) => t.name === "get_status"));
  const status = JSON.parse((await client.callTool({ name: "get_status", arguments: {} })).content.map((c) => c.text).join("\n"));
  check("explicit board root is reported", status.rootSource === "flag" && status.projectRoot === board);
  const created = await client.callTool({ name: "create_item", arguments: { title: "headless smoke" } });
  check("headless write succeeds", created.isError !== true && existsSync(join(board, ".kanmer")));
  const list = JSON.parse((await client.callTool({ name: "list_items", arguments: {} })).content.map((c) => c.text).join("\n"));
  check("headless read returns the written item", Array.isArray(list) && list.some((item) => item.title === "headless smoke"));
  await transport.close();
  check("host files outside board remain untouched", readFileSync(hostMarker, "utf8") === "host\n" && readdirSync(host).includes("kanmer-mcp.cjs"));
} finally {
  rmSync(host, { recursive: true, force: true });
}
if (checks.some((ok) => !ok)) process.exitCode = 1;

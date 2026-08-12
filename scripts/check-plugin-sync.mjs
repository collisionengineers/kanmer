// Fail if the MCP tool names registered by the server drift from the ones
// documented in the plugin's tool reference. Part of the verification checklist:
// the skills describe the tool surface, so a rename that only lands on one side
// leaves agents following instructions for tools that no longer exist.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(root, "packages/mcp-server/src/index.ts");
const refPath = join(
  root,
  "plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md",
);

for (const p of [serverPath, refPath]) {
  if (!existsSync(p)) {
    console.error(`Missing file: ${p}`);
    process.exit(1);
  }
}

const serverSrc = readFileSync(serverPath, "utf8");
const refDoc = readFileSync(refPath, "utf8");

const registered = [...serverSrc.matchAll(/registerTool\(\s*"([^"]+)"/g)].map((m) => m[1]);

// Only the tool tables count. Everything from "## Field semantics" onward
// documents fields and item types, whose names would otherwise be mistaken for
// tools. Documented tools are the first cell of a table row: | `tool_name` | … |
const toolSection = refDoc.split(/^## Field semantics/m)[0];
const documented = [...toolSection.matchAll(/^\|\s*`([a-z_]+)`\s*\|/gm)].map((m) => m[1]);

const missing = registered.filter((t) => !documented.includes(t));
const stale = documented.filter((t) => !registered.includes(t));

if (missing.length || stale.length) {
  if (missing.length) console.error(`Undocumented tools: ${missing.join(", ")}`);
  if (stale.length) console.error(`Documented but unregistered: ${stale.join(", ")}`);
  console.error(`Update ${refPath}`);
  process.exit(1);
}

console.log(`plugin-sync OK — ${registered.length} tools match`);

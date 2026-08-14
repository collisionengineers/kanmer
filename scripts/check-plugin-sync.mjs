// Fail if the plugin is out of sync with the server, in two ways:
//
//   1. tool NAMES registered by the server vs. documented in the plugin's tool
//      reference — the skills describe the tool surface, so a rename that only
//      lands on one side leaves agents following instructions for tools that no
//      longer exist;
//   2. the committed bundle's BYTES vs. a fresh build. The committed
//      plugins/kanmer/mcp/kanmer-mcp.cjs carries independent compiled copies of
//      every store method, so behaviour can drift arbitrarily far from source
//      without a single tool name changing. Names alone cannot see that.
//
// (2) means plugin:check now requires a prior `npm run build` — consistent with
// `npm run plugin:build` already running it, and with AGENTS.md §10 pairing the
// two. It assumes tsup output is reproducible, which it is at this commit; if a
// future toolchain bump breaks that, the failure message already names the fix
// (`npm run plugin:build`), which is also the correct action either way.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(root, "packages/mcp-server/src/index.ts");
const refPath = join(
  root,
  "plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md",
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

// The bundle's bytes. Tool names are the contract; the bundle is the thing
// installed plugins actually run.
const bundlePath = join(root, "plugins/kanmer/mcp/kanmer-mcp.cjs");
const distPath = join(root, "packages/mcp-server/dist/standalone/kanmer-mcp.cjs");
if (!existsSync(bundlePath)) {
  console.error(`No committed plugin bundle at ${bundlePath} — run \`npm run plugin:build\`.`);
  process.exit(1);
}
if (!existsSync(distPath)) {
  console.error(
    `No standalone bundle at ${distPath} — run \`npm run build\` first ` +
      `(plugin:check now verifies the committed bundle's bytes, not just tool names).`,
  );
  process.exit(1);
}
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
if (sha(bundlePath) !== sha(distPath)) {
  console.error("Committed plugin bundle differs from a fresh build — run `npm run plugin:build`.");
  process.exit(1);
}

console.log(`plugin-sync OK — ${registered.length} tools match, bundle bytes match`);

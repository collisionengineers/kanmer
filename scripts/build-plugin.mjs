// Copy the standalone MCP bundle into the plugin. Run after `npm run build`.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "packages/mcp-server/dist/standalone/kanmer-mcp.cjs");
const dest = join(root, "plugins/kanmer/mcp/kanmer-mcp.cjs");

if (!existsSync(src)) {
  console.error("Standalone bundle missing — run `npm run build` first.");
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
const kb = Math.round(statSync(dest).size / 1024);
console.log(`plugin: copied kanmer-mcp.cjs (${kb} KB) → ${dest}`);

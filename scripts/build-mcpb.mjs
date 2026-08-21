// Build the deterministic Claude Desktop MCPB from the freshly-built server.
// The source manifest is never rewritten; generated metadata lives only under
// dist/mcpb, which is intentionally disposable.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const sourcePath = join(root, "mcpb", "manifest.json");
const standalonePath = join(root, "packages", "mcp-server", "dist", "standalone", "kanmer-mcp.cjs");
const iconPath = join(root, "apps", "gui", "build", "icon.png");
const outputRoot = join(root, "dist", "mcpb");
const staging = join(outputRoot, "staging");
const output = join(outputRoot, `kanmer-${packageJson.version}.mcpb`);

for (const [label, path] of [["source manifest", sourcePath], ["standalone server", standalonePath], ["canonical icon", iconPath]]) {
  if (!existsSync(path)) throw new Error(`${label} missing: ${path}`);
}

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
if (source.version !== packageJson.version) {
  throw new Error(`mcpb/manifest.json version ${source.version} differs from package.json ${packageJson.version}`);
}

const probeRoot = join(outputRoot, "probe-root");
rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(probeRoot, { recursive: true });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, "packages", "mcp-server", "dist", "index.js"), "--root", probeRoot],
});
const client = new Client({ name: "mcpb-builder", version: packageJson.version });
let tools;
let prompts;
try {
  await client.connect(transport);
  tools = (await client.listTools()).tools;
  prompts = (await client.listPrompts()).prompts;
} finally {
  await transport.close();
}

mkdirSync(join(staging, "server"), { recursive: true });
copyFileSync(standalonePath, join(staging, "server", "kanmer-mcp.cjs"));
copyFileSync(iconPath, join(staging, "icon.png"));
const generated = {
  ...source,
  tools: tools.map(({ name, description }) => ({ name, ...(description ? { description } : {}) })),
  tools_generated: true,
  prompts: prompts.map(({ name, description, arguments: args }) => ({
    name,
    ...(description ? { description } : {}),
    ...(args?.length ? { arguments: args.map((arg) => arg.name) } : {}),
    text: `Use the ${name} prompt from the running Kanmer server.`,
  })),
  prompts_generated: true,
};
writeFileSync(join(staging, "manifest.json"), `${JSON.stringify(generated, null, 2)}\n`, "utf8");

const cli = join(root, "node_modules", "@anthropic-ai", "mcpb", "dist", "cli", "cli.js");
execFileSync(process.execPath, [cli, "validate", join(staging, "manifest.json")], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, [cli, "pack", staging, output], { cwd: root, stdio: "inherit" });
rmSync(probeRoot, { recursive: true, force: true });
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
console.log(`mcpb: built ${output} (${tools.length} tools, ${prompts.length} prompts)`);
console.log(`mcpb: manifest sha256 ${hash(join(staging, "manifest.json"))}, server sha256 ${hash(join(staging, "server", "kanmer-mcp.cjs"))}`);

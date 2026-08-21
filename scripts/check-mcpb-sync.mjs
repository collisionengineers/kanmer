// Validate the generated MCPB contents and the source-to-staging contract.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const outputRoot = join(root, "dist", "mcpb");
const staging = join(outputRoot, "staging");
const bundle = join(outputRoot, `kanmer-${pkg.version}.mcpb`);
const sourcePath = join(root, "mcpb", "manifest.json");
const cli = join(root, "node_modules", "@anthropic-ai", "mcpb", "dist", "cli", "cli.js");
const unpacked = join(outputRoot, "unpacked-check");

if (!existsSync(bundle) || !existsSync(staging)) throw new Error("MCPB output/staging is missing; run npm run mcpb:build first");
execFileSync(process.execPath, [cli, "validate", join(staging, "manifest.json")], { cwd: root, stdio: "inherit" });
rmSync(unpacked, { recursive: true, force: true });
execFileSync(process.execPath, [cli, "unpack", bundle, unpacked], { cwd: root, stdio: "inherit" });

const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const files = (base) => {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [relative(base, path).replaceAll("\\", "/")];
  });
  return walk(base).sort();
};
const stagedFiles = files(staging);
const unpackedFiles = files(unpacked);
if (JSON.stringify(stagedFiles) !== JSON.stringify(unpackedFiles)) {
  throw new Error(`MCPB file list drift:\nstaging=${stagedFiles.join(", ")}\nunpacked=${unpackedFiles.join(", ")}`);
}
const expectedFiles = ["icon.png", "manifest.json", "server/kanmer-mcp.cjs"];
if (JSON.stringify(stagedFiles) !== JSON.stringify(expectedFiles)) throw new Error(`unexpected MCPB files: ${stagedFiles.join(", ")}`);
for (const file of stagedFiles) {
  if (digest(join(staging, file)) !== digest(join(unpacked, file))) throw new Error(`MCPB byte drift: ${file}`);
  if (file.includes("..") || file.startsWith("/") || /^[A-Za-z]:/.test(file)) throw new Error(`unsafe archive path: ${file}`);
}
if (digest(join(staging, "icon.png")) !== digest(join(root, "apps", "gui", "build", "icon.png"))) throw new Error("MCPB icon differs from canonical icon");
if (digest(join(staging, "server", "kanmer-mcp.cjs")) !== digest(join(root, "packages", "mcp-server", "dist", "standalone", "kanmer-mcp.cjs"))) throw new Error("MCPB server differs from fresh standalone");
const plugin = join(root, "plugins", "kanmer", "mcp", "kanmer-mcp.cjs");
if (existsSync(plugin) && digest(join(staging, "server", "kanmer-mcp.cjs")) !== digest(plugin)) throw new Error("MCPB server differs from distributed plugin copy");
const manifest = JSON.parse(readFileSync(join(staging, "manifest.json"), "utf8"));
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
for (const key of ["manifest_version", "name", "display_name", "description", "author", "icon", "server", "compatibility", "user_config"]) {
  if (JSON.stringify(manifest[key]) !== JSON.stringify(source[key])) throw new Error(`generated manifest drift in ${key}`);
}
if (manifest.version !== pkg.version || !manifest.tools?.length || !manifest.prompts?.length) throw new Error("generated manifest is missing version or live MCP metadata");
if (manifest.server.mcp_config.args.join(" ").includes(resolve(root))) throw new Error("manifest contains a machine-specific absolute path");
rmSync(unpacked, { recursive: true, force: true });
console.log(`mcpb: check passed (${stagedFiles.length} files, ${statSync(bundle).size} bytes)`);

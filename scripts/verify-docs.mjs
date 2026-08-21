#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manual = join(root, "docs", "manual");
const files = [
  "remote-access.md",
  "remote-access-troubleshooting.md",
  join("providers", "cloudflared.md"),
];
const ids = [
  "PROJECT_CONFIG_VALID", "REMOTE_CONFIG_VALID", "SECRET_REFERENCE_VALID", "TUNNEL_EXECUTABLE_VALID",
  "TUNNEL_CONFIG_VALID", "LOCAL_STATUS_READY", "LOCAL_BIND_LOOPBACK", "AUTH_MISSING_REJECTED",
  "AUTH_WRONG_REJECTED", "AUTH_VALID_ACCEPTED", "MCP_INITIALIZE_LOCAL", "PROJECT_FINGERPRINT_LOCAL",
  "REMOTE_TOOL_POLICY_LOCAL", "SESSION_CLOSE_LOCAL", "TUNNEL_PROCESS_READY", "PUBLIC_DNS_RESOLVES",
  "PUBLIC_TLS_VALID", "PUBLIC_ROUTE_NO_REDIRECT", "AUTH_MISSING_PUBLIC_REJECTED", "MCP_INITIALIZE_PUBLIC",
  "PROJECT_FINGERPRINT_PUBLIC", "REMOTE_TOOL_POLICY_PUBLIC", "SESSION_CLOSE_PUBLIC", "LOCAL_PUBLIC_CONSISTENT",
  "DIAGNOSTIC_REDACTION", "NO_BOARD_MUTATION",
];

function fail(message) {
  console.error(`verify-docs: ${message}`);
  process.exitCode = 1;
}

const contents = new Map();
for (const file of files) {
  const path = join(manual, file);
  if (!existsSync(path)) fail(`missing ${relative(root, path)}`);
  else contents.set(file, readFileSync(path, "utf8"));
}

const overview = contents.get("remote-access.md") ?? "";
const troubleshooting = contents.get("remote-access-troubleshooting.md") ?? "";
const provider = contents.get(join("providers", "cloudflared.md")) ?? "";

for (const anchor of [
  "## Remote access", "## Security model", "## Prerequisites", "## Architecture and terms",
  "## GUI setup", "## Headless setup", "## Configure a remote MCP client", "## Start, stop and auto-start",
  "## Run connector doctor", "## Rotate or recover a token", "## Move or remove a project",
  "## Security and limitations",
]) if (!overview.includes(anchor)) fail(`remote-access.md is missing ${anchor}`);

const rows = [...troubleshooting.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((match) => match[1]);
if (rows.length !== ids.length) fail(`troubleshooting table has ${rows.length} rows; expected ${ids.length}`);
for (const id of ids) {
  const count = rows.filter((row) => row === id).length;
  if (count !== 1) fail(`${id} appears ${count} times in the troubleshooting table`);
}
for (const row of rows) if (!ids.includes(row)) fail(`unknown doctor id ${row}`);

for (const pattern of [
  /cloudflared\s+(?:tunnel|access|login|create|route)/i,
  /account\s+(?:id|token|login|create|provision)/i,
  /C:\\Users\\|\/Users\/|[A-Za-z]:\\[^\s]+/,
  /(?:bearer|token|secret|credential)[-_]?[A-Za-z0-9]{32,}/i,
]) {
  if (pattern.test(overview)) fail(`provider-neutral chapter contains forbidden pattern ${pattern}`);
}
if (!/named Cloudflare Tunnel/i.test(provider)) fail("Cloudflare appendix does not state named-tunnel scope");
if (!/mandatory Kanmer bearer/i.test(overview)) fail("provider-neutral chapter omits mandatory bearer boundary");
if (!/Worker/i.test(overview) || !/external client proof/i.test(overview)) fail("provider-neutral chapter omits the Worker proof boundary");

const generated = join(root, "apps", "gui", "src", "renderer", "src", "manual", "chapters.generated.ts");
if (!existsSync(generated)) fail("generated manual artifact is missing");
else {
  const output = readFileSync(generated, "utf8");
  for (const id of ["remote-access", "remote-access-troubleshooting", "cloudflared"]) {
    if (!output.includes(`\"id\": \"${id}\"`)) fail(`generated manual is missing ${id}`);
  }
}

const build = spawnSync(process.execPath, ["scripts/build-manual.mjs", "--check"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) fail("generated manual is stale; run the manual builder");

if (process.exitCode) process.exit(process.exitCode);
console.log("verify-docs: PASS — 3 remote chapters, 26 doctor ids, generated manual current");

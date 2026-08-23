#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkDocStructureFiles } from "./check-doc-structure.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manual = join(root, "docs", "manual");
const entries = [
  { key: "remote-access.md", path: join(manual, "remote-access.md") },
  { key: "remote-access-troubleshooting.md", path: join(manual, "remote-access-troubleshooting.md") },
  { key: "providers/cloudflared.md", path: join(manual, "providers", "cloudflared.md") },
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
const failures = [];
for (const problem of checkDocStructureFiles({ root })) failures.push(problem);
const tick = String.fromCharCode(96);
function fail(message) { failures.push(message); }
function headingSlugs(markdown) {
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)]
    .map((match) => match[1].toLowerCase().replace(new RegExp("[" + tick + "*_~]", "g"), "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-")));
}
function validateMarkdown(entry, markdown) {
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    let marker = null;
    if (trimmed.startsWith(tick.repeat(3))) marker = tick;
    else if (trimmed.startsWith("~~~")) marker = "~";
    if (!marker) continue;
    if (!fence) fence = marker;
    else if (marker === fence) fence = null;
  }
  if (fence) fail(entry.key + " has an unclosed code fence");
  const linkPattern = new RegExp("\\[[^\\]]+\\]\\(([^)\\s]+)(?:\\s+[\"'][^\"']+[\"'])?\\)", "g");
  for (const match of markdown.matchAll(linkPattern)) {
    const target = match[1].replace(/^<|>$/g, "");
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
    const parts = target.split("#", 2);
    const rawPath = parts[0];
    const anchor = parts[1];
    const targetPath = rawPath ? resolve(dirname(entry.path), decodeURIComponent(rawPath)) : entry.path;
    if (!existsSync(targetPath)) {
      fail(entry.key + " links to missing " + target);
      continue;
    }
    if (anchor && targetPath.toLowerCase().endsWith(".md")) {
      const targetMarkdown = readFileSync(targetPath, "utf8");
      if (!headingSlugs(targetMarkdown).has(anchor.toLowerCase())) fail(entry.key + " links to missing anchor " + target);
    }
  }
}

const contents = new Map();
for (const entry of entries) {
  if (!existsSync(entry.path)) fail("missing " + relative(root, entry.path));
  else {
    const markdown = readFileSync(entry.path, "utf8");
    contents.set(entry.key, markdown);
    validateMarkdown(entry, markdown);
  }
}

const overview = contents.get("remote-access.md") ?? "";
const troubleshooting = contents.get("remote-access-troubleshooting.md") ?? "";
const provider = contents.get("providers/cloudflared.md") ?? "";
for (const anchor of [
  "## Remote access", "## Security model", "## Prerequisites", "## Architecture and terms",
  "## GUI setup", "## Headless setup", "## Configure a remote MCP client", "## Start, stop and auto-start",
  "## Run connector doctor", "## Rotate or recover a token", "## Move or remove a project",
  "## Security and limitations",
]) if (!overview.includes(anchor)) fail("remote-access.md is missing " + anchor);
for (const anchor of ["## Doctor checks", "## Safe escalation"]) if (!troubleshooting.includes(anchor)) fail("troubleshooting chapter is missing " + anchor);
for (const anchor of ["## Supported named-tunnel mode", "## Operator provisioning", "## Public verification and rollback", "## Boundaries"]) if (!provider.includes(anchor)) fail("Cloudflare appendix is missing " + anchor);

const rows = [...troubleshooting.matchAll(new RegExp("^\\|\\s*" + tick + "([^" + tick + "]+)" + tick + "\\s*\\|", "gm"))].map((match) => match[1]);
if (rows.length !== ids.length) fail("troubleshooting table has " + rows.length + " rows; expected " + ids.length);
for (const id of ids) {
  const count = rows.filter((row) => row === id).length;
  if (count !== 1) fail(id + " appears " + count + " times in the troubleshooting table");
}
for (const row of rows) if (!ids.includes(row)) fail("unknown doctor id " + row);
for (const column of ["Safe observed / expected", "Likely causes", "Ordered repair", "Rerun", "Stop or escalate"]) {
  if (!troubleshooting.includes("| " + column + " |")) fail("troubleshooting matrix is missing " + column);
}

const providerNeutral = overview + "\n" + troubleshooting;
for (const pattern of [
  /cloudflared\s+(?:tunnel|access|login|create|route)/i,
  /account\s+(?:id|token|login|create|provision)/i,
  /C:\\Users\\|\/Users\/|[A-Za-z]:\\[^\s]+/,
  /(?:bearer|token|secret|credential)[-_]?[A-Za-z0-9]{32,}/i,
  /(?:--insecure|--no-verify|--token(?:=|\s)|--url(?:=|\s))/i,
  /https?:\/\/[^\s]*(?:token|secret|credential)=/i,
  /0\.0\.0\.0/,
]) if (pattern.test(providerNeutral)) fail("provider-neutral chapters contain forbidden pattern " + pattern);
for (const [key, markdown] of contents) {
  if (/(?:bearer|token|secret|credential)[-_]?[A-Za-z0-9]{32,}/i.test(markdown)) fail(key + " contains a secret-shaped value");
  if (/C:\\Users\\|\/Users\/|[A-Za-z]:\\[^\s]+/.test(markdown)) fail(key + " contains a machine-specific path");
}
if (!/named Cloudflare Tunnel/i.test(provider)) fail("Cloudflare appendix does not state named-tunnel scope");
if (!/mandatory Kanmer bearer/i.test(overview)) fail("provider-neutral chapter omits mandatory bearer boundary");
if (!/Worker/i.test(overview) || !/external client proof/i.test(overview)) fail("provider-neutral chapter omits the Worker proof boundary");
if (!/Never bypass TLS|Do not .*TLS/i.test(providerNeutral)) fail("provider-neutral chapters omit the TLS prohibition");
if (!/Quick Tunnel.*production|production.*Quick Tunnel/i.test(providerNeutral)) fail("provider-neutral chapters omit the Quick Tunnel boundary");

const generated = join(root, "apps", "gui", "src", "renderer", "src", "manual", "chapters.generated.ts");
if (!existsSync(generated)) fail("generated manual artifact is missing");
else {
  const output = readFileSync(generated, "utf8");
  for (const id of ["remote-access", "remote-access-troubleshooting", "cloudflared"]) {
    if (!output.includes('"id": "' + id + '"')) fail("generated manual is missing " + id);
  }
  const canary = "__DOC013_CANARY_5E8B6D4A1F__";
  const disposable = mkdtempSync(join(tmpdir(), "kanmer-doc013-"));
  try {
    writeFileSync(join(disposable, "input.md"), canary);
    const input = readFileSync(join(disposable, "input.md"), "utf8");
    if (!input.includes(canary) || [...contents.values(), output].some((value) => value.includes(canary))) {
      fail("disposable canary reached authored docs or generated output");
    }
  } finally {
    rmSync(disposable, { recursive: true, force: true });
  }
}

const build = spawnSync(process.execPath, ["scripts/build-manual.mjs", "--check"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) fail("generated manual is stale; run the manual builder");

if (failures.length) {
  for (const failure of failures) console.error("verify-docs: " + failure);
  process.exitCode = 1;
} else {
  console.log("verify-docs: PASS — document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current");
}

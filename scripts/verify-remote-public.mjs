#!/usr/bin/env node
/**
 * Operator-only MCP-028 proof entry point.
 *
 * This script is intentionally not part of `verify` or normal CI. It accepts
 * references to protected inputs, never their contents, and treats a missing
 * cloudflared/authenticated environment as INCONCLUSIVE (exit 2).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (flag) => args.includes(flag);
const descriptor = value("--descriptor");
const output = value("--output");
const sha = value("--sha");
const forbidden = args.some((arg) => /bearer|token=|secret=|authorization=|credential=/i.test(arg));
const usage = "usage: node scripts/verify-remote-public.mjs --acknowledge-protected-environment --sha <full-sha> --descriptor <protected-json-reference> [--output <path>]";

function safeJson(value) {
  return JSON.stringify(value).replace(/[A-Za-z0-9_-]{43,}/g, "[redacted]");
}

function currentSha() {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); }
  catch { return undefined; }
}

function writeResult(result) {
  const text = `${safeJson(result)}\n`;
  if (output) return writeFile(path.resolve(output), text, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(text);
  return undefined;
}

const commit = currentSha();
if (forbidden || args.includes("--help") || !has("--acknowledge-protected-environment") || !sha || !/^[0-9a-f]{40}$/i.test(sha) || !descriptor || !output && args.includes("--output")) {
  await writeResult({ schemaVersion: 1, ticket: "MCP-028", outcome: "inconclusive", reason: forbidden ? "secret-bearing arguments are forbidden" : usage });
  process.exitCode = 2;
} else if (!commit || commit.toLowerCase() !== sha.toLowerCase()) {
  await writeResult({ schemaVersion: 1, ticket: "MCP-028", outcome: "fail", reason: "requested full commit does not match the checkout" });
  process.exitCode = 1;
} else {
  let cloudflared = true;
  try { execFileSync(process.platform === "win32" ? "where.exe" : "sh", process.platform === "win32" ? ["cloudflared"] : ["-c", "command -v cloudflared"], { stdio: "ignore" }); }
  catch { cloudflared = false; }
  if (!cloudflared) {
    await writeResult({ schemaVersion: 1, ticket: "MCP-028", outcome: "inconclusive", reason: "cloudflared is unavailable; protected tunnel/auth proof was not run", exactCommitVerified: true });
    process.exitCode = 2;
  } else {
    const client = spawnSync(process.execPath, [path.resolve("packages/mcp-server/src/integration/remote-public-client.mjs"), "--descriptor", path.resolve(descriptor)], { encoding: "utf8", timeout: 120_000 });
    let child;
    try { child = JSON.parse(client.stdout || "{}"); } catch { child = { outcome: "inconclusive", reason: "protected client returned no sanitised evidence" }; }
    const failed = client.status !== 0 && client.status !== 2;
    const outcome = failed ? "fail" : child.outcome === "pass" ? "pass" : child.outcome === "fail" ? "fail" : "inconclusive";
    await writeResult({ schemaVersion: 1, ticket: "MCP-028", outcome, exactCommitVerified: true, protectedClient: child });
    process.exitCode = outcome === "pass" ? 0 : outcome === "fail" ? 1 : 2;
  }
}

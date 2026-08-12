import { app } from "electron";
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type ConnectTarget = "codex" | "claude";

export interface ConnectResult {
  ok: boolean;
  /** The exact command a user could run by hand (for the copy fallback). */
  command: string;
  output: string;
}

interface Invocation {
  command: string; // the executable that runs the server (the Electron binary)
  args: string[]; // [serverScript, "--root", projectRoot]
  env: Record<string, string>;
}

/**
 * How to launch the MCP server. We run it via the Electron binary as Node
 * (ELECTRON_RUN_AS_NODE=1), so the target machine needs no separate Node.
 */
function serverInvocation(projectRoot: string): Invocation {
  const env = { ELECTRON_RUN_AS_NODE: "1" };
  let script: string;
  if (app.isPackaged) {
    script = join(process.resourcesPath, "mcp", "kanmer-mcp.cjs");
  } else {
    // Dev: prefer the standalone bundle, fall back to the ESM dist.
    const repoRoot = resolve(app.getAppPath(), "..", "..");
    const standalone = join(
      repoRoot,
      "packages",
      "mcp-server",
      "dist",
      "standalone",
      "kanmer-mcp.cjs",
    );
    const esm = join(repoRoot, "packages", "mcp-server", "dist", "index.js");
    script = existsSync(standalone) ? standalone : esm;
  }
  return { command: process.execPath, args: [script, "--root", projectRoot], env };
}

/** Quote an argument for a cmd.exe / shell command line if needed. */
function q(s: string): string {
  return /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

/** Build the `<cli> mcp add …` command line for a target. */
function addCommand(target: ConnectTarget, inv: Invocation): string {
  const envFlag = target === "codex" ? "--env" : "-e";
  const envParts = Object.entries(inv.env).flatMap(([k, v]) => [envFlag, `${k}=${v}`]);
  const scope = target === "claude" ? ["-s", "user"] : [];
  const server = [inv.command, ...inv.args];
  const parts = [
    target,
    "mcp",
    "add",
    "kanmer",
    ...scope,
    ...envParts,
    "--",
    ...server,
  ];
  return parts.map(q).join(" ");
}

function removeCommand(target: ConnectTarget): string {
  return target === "claude" ? "claude mcp remove kanmer -s user" : "codex mcp remove kanmer";
}

/**
 * Register Kanmer's MCP server with codex or Claude Code by running their
 * `mcp add` CLI. Remove-then-add makes it idempotent. Returns the command line
 * either way so the UI can offer a copy-paste fallback if the CLI isn't found.
 */
export async function connectAgent(
  target: ConnectTarget,
  projectRoot: string,
): Promise<ConnectResult> {
  const inv = serverInvocation(projectRoot);
  const command = addCommand(target, inv);
  try {
    await execAsync(removeCommand(target)).catch(() => undefined); // ignore "not found"
    const { stdout, stderr } = await execAsync(command);
    return { ok: true, command, output: (stdout || stderr || "Added.").trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, command, output: msg };
  }
}

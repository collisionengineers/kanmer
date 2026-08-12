import { app } from "electron";
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
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

/**
 * codex has no project scope, so each project registers under its own server
 * name — otherwise a second project would silently rewrite the first one's
 * hardcoded --root.
 */
function codexServerName(projectRoot: string): string {
  const cleaned = basename(projectRoot)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `kanmer-${cleaned || "project"}`;
}

/** Build the `<cli> mcp add …` command line for a target. */
function addCommand(target: ConnectTarget, inv: Invocation, projectRoot: string): string {
  const envFlag = target === "codex" ? "--env" : "-e";
  const envParts = Object.entries(inv.env).flatMap(([k, v]) => [envFlag, `${k}=${v}`]);
  // Claude Code: project scope writes <project>/.mcp.json, so the entry
  // travels with the project instead of one user-scope entry per machine
  // being silently rewritten by whichever project connected last.
  const name = target === "claude" ? "kanmer" : codexServerName(projectRoot);
  const scope = target === "claude" ? ["-s", "project"] : [];
  const server = [inv.command, ...inv.args];
  const parts = [target, "mcp", "add", name, ...scope, ...envParts, "--", ...server];
  return parts.map(q).join(" ");
}

function removeCommands(target: ConnectTarget, projectRoot: string): string[] {
  if (target === "claude") {
    return [
      "claude mcp remove kanmer -s project",
      // Clean up the stale user-scope entry older Kanmer versions wrote.
      "claude mcp remove kanmer -s user",
    ];
  }
  return [`codex mcp remove ${codexServerName(projectRoot)}`];
}

/**
 * Register Kanmer's MCP server with codex or Claude Code by running their
 * `mcp add` CLI, scoped per project. Remove-then-add makes it idempotent.
 * Returns the command line either way so the UI can offer a copy-paste
 * fallback if the CLI isn't found (for Claude Code, run it from the project
 * folder — project scope writes .mcp.json into the current directory).
 */
export async function connectAgent(
  target: ConnectTarget,
  projectRoot: string,
): Promise<ConnectResult> {
  const inv = serverInvocation(projectRoot);
  const command = addCommand(target, inv, projectRoot);
  try {
    for (const rm of removeCommands(target, projectRoot)) {
      await execAsync(rm, { cwd: projectRoot }).catch(() => undefined); // ignore "not found"
    }
    const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });
    return { ok: true, command, output: (stdout || stderr || "Added.").trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, command, output: msg };
  }
}

import { app } from "electron";
import { execFile, execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { parseSessions } from "../shared/mcp-sessions.js";
import type { McpSessions } from "../shared/ipc.js";

/**
 * Which agent MCP servers an update would force-kill.
 *
 * The NSIS installer (`allowOnlyOneInstallerInstance.nsh:79-101`) stops every
 * process whose path is under `$INSTDIR` — by PATH PREFIX, not image name — and
 * `connect.ts` registers `command = process.execPath`, so the agent's MCP
 * server IS the installed Kanmer.exe. An update therefore closes it, silently:
 * electron-updater passes `--updated`, which suppresses the installer's own
 * prompt (`NsisUpdater.js:113`).
 *
 * We cannot avoid that, so we name it before the user commits to it. See
 * `shared/mcp-sessions.ts` for the parser and the full reasoning; do not delete
 * this because it "looks like dead diagnostics".
 */

/** The CIM query: our own renderer/GPU children never name the bundle. */
const QUERY =
  "Get-CimInstance Win32_Process | " +
  "Where-Object { $_.ExecutablePath -and $_.CommandLine -like '*kanmer-mcp.cjs*' } | " +
  "Select-Object ExecutablePath,CommandLine | ConvertTo-Json -Compress";

const ARGS = ["-NoProfile", "-NonInteractive", "-Command", QUERY];
const OPTS = { timeout: 4000, windowsHide: true, maxBuffer: 1 << 20 } as const;

const NONE: McpSessions = { count: 0, projects: [], unknown: false };
const UNKNOWN: McpSessions = { count: 0, projects: [], unknown: true };

/**
 * True when a probe could possibly find something. Un-packaged means
 * `process.execPath` is the dev Electron binary — nothing an installer would
 * kill — and non-Windows has no NSIS installer at all.
 */
function probeApplies(): boolean {
  return process.platform === "win32" && app.isPackaged;
}

/** Async probe, for the renderer's "Restart now" gate. */
export async function mcpSessions(): Promise<McpSessions> {
  if (!probeApplies()) return { ...NONE };
  const installDir = dirname(process.execPath);
  return new Promise((resolve) => {
    try {
      execFile("powershell.exe", ARGS, OPTS, (err, stdout) => {
        if (err) {
          resolve({ ...UNKNOWN });
          return;
        }
        resolve(parseSessions(stdout, installDir));
      });
    } catch {
      resolve({ ...UNKNOWN });
    }
  });
}

/**
 * Synchronous probe, for `before-quit` only — that handler cannot await, and
 * this is the one thing standing between "user quits at 5pm with an agent
 * mid-run" and an unattended kill. Bounded by OPTS.timeout.
 */
export function mcpSessionsSync(): McpSessions {
  if (!probeApplies()) return { ...NONE };
  try {
    const stdout = execFileSync("powershell.exe", ARGS, { ...OPTS, encoding: "utf8" });
    return parseSessions(stdout, dirname(process.execPath));
  } catch {
    return { ...UNKNOWN };
  }
}

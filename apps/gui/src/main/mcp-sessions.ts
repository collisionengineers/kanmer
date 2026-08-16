import { app } from "electron";
import { execFile, execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { parseSessions } from "../shared/mcp-sessions.js";
import type { McpSessions, McpStopResult } from "../shared/ipc.js";

/**
 * Which agent MCP servers an update would force-kill — and stopping them.
 *
 * The NSIS installer (`allowOnlyOneInstallerInstance.nsh:104-165`) stops every
 * process whose path is under `$INSTDIR` — by PATH PREFIX, not image name — and
 * `connect.ts` registers `command = process.execPath`, so the agent's MCP
 * server IS the installed Kanmer.exe. An update therefore closes it, silently:
 * electron-updater passes `--updated`, which suppresses the installer's own
 * prompt (`NsisUpdater.js:113`).
 *
 * GUI-064: that kill is not reliable enough to build on. It races the
 * uninstaller's own `un.atomicRMDir`, which renames every file out of `$INSTDIR`
 * and aborts on the first rename that fails — and a live MCP server keeps
 * `icudtl.dat` and `v8_context_snapshot.bin` un-renameable. When the rename
 * loses that race the entire update fails with `uninstallFailed: 2` and the user
 * is told to "try running the installer again", which does not help because the
 * server is still there.
 *
 * So we stop them ourselves, before the installer is spawned, and verify. See
 * `shared/mcp-sessions.ts` for the parser and the full reasoning; do not delete
 * this because it "looks like dead diagnostics".
 */

/** The CIM query: our own renderer/GPU children never name the bundle. */
const QUERY =
  "Get-CimInstance Win32_Process | " +
  "Where-Object { $_.ExecutablePath -and $_.CommandLine -like '*kanmer-mcp.cjs*' } | " +
  "Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress";

const ARGS = ["-NoProfile", "-NonInteractive", "-Command", QUERY];
const OPTS = { timeout: 4000, windowsHide: true, maxBuffer: 1 << 20 } as const;

const NONE: McpSessions = { count: 0, projects: [], pids: [], unknown: false };
const UNKNOWN: McpSessions = { count: 0, projects: [], pids: [], unknown: true };

/**
 * How many stop-then-recheck rounds before giving up.
 *
 * More than one on purpose: an agent host that supervises its MCP servers
 * restarts one that dies, and a single kill would hand the installer a freshly
 * respawned lock. Bounded so a host that restarts indefinitely produces a
 * refusal the user can act on rather than a hang.
 */
const STOP_ROUNDS = 3;
/** Grace between killing and re-probing: handles close on process teardown, not on the kill call. */
const SETTLE_MS = 700;

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

// ---------------------------------------------------------------------------
// Stopping them. Everything below exists so that an update either starts from a
// clean install directory or does not start at all.
// ---------------------------------------------------------------------------

/** Kill one pid and its children. Injectable so tests never kill a real process. */
export type Killer = (pid: number) => void;

/**
 * `taskkill /T /F`, the same idiom and for the same reason as `dispatch.ts`: a
 * bare kill orphans grandchildren, and an MCP server spawns them.
 */
const defaultKiller: Killer = (pid) => {
  execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
    timeout: 4000,
    windowsHide: true,
    stdio: "ignore",
  });
};

let killer: Killer = defaultKiller;

/** Test seam. Pass nothing to restore the real one. */
export function setKiller(fn?: Killer): void {
  killer = fn ?? defaultKiller;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Clear agent MCP servers out of the install directory so an update can rename
 * over it.
 *
 * MUST complete before `quitAndInstall` — that call spawns the installer before
 * `app.quit()`, so anything after it is too late (see `updater.ts`).
 *
 * Deliberately conservative about what counts as success:
 * - `unknown: true` (the probe itself failed) is NOT cleared. The probe fails
 *   open for *warning*, because a broken probe must never block a user; it fails
 *   closed for *installing*, because a broken probe must never green-light a
 *   destructive rename we cannot undo.
 * - a session we found but could not resolve to a pid is not cleared either.
 */
export async function stopMcpSessions(): Promise<McpStopResult> {
  if (!probeApplies()) {
    return { cleared: true, stopped: 0, remaining: { ...NONE } };
  }

  let stopped = 0;
  let sessions = await mcpSessions();

  for (let round = 0; round < STOP_ROUNDS; round++) {
    if (sessions.count === 0 && !sessions.unknown) {
      return { cleared: true, stopped, remaining: sessions };
    }
    // Nothing actionable: either the probe broke or we found sessions we cannot
    // address. Re-killing the same nothing on the next round would not help.
    if (sessions.pids.length === 0) break;

    for (const pid of sessions.pids) {
      try {
        killer(pid);
        stopped++;
      } catch {
        // Already gone, or not ours to kill. The re-probe below is the judge —
        // a failed kill is only a problem if the process is still there.
      }
    }
    await sleep(SETTLE_MS);
    sessions = await mcpSessions();
  }

  const cleared = sessions.count === 0 && !sessions.unknown;
  return { cleared, stopped, remaining: sessions };
}

/**
 * The synchronous twin, for `before-quit` — which cannot await. Same contract,
 * same conservatism; `execFileSync` + `Atomics.wait` for the settle, because a
 * quit handler has no event loop turn to give us.
 */
export function stopMcpSessionsSync(): McpStopResult {
  if (!probeApplies()) {
    return { cleared: true, stopped: 0, remaining: { ...NONE } };
  }

  let stopped = 0;
  let sessions = mcpSessionsSync();

  for (let round = 0; round < STOP_ROUNDS; round++) {
    if (sessions.count === 0 && !sessions.unknown) {
      return { cleared: true, stopped, remaining: sessions };
    }
    if (sessions.pids.length === 0) break;

    for (const pid of sessions.pids) {
      try {
        killer(pid);
        stopped++;
      } catch {
        // See stopMcpSessions().
      }
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, SETTLE_MS);
    sessions = mcpSessionsSync();
  }

  const cleared = sessions.count === 0 && !sessions.unknown;
  return { cleared, stopped, remaining: sessions };
}

/** One sentence naming why an install was refused. Shared by both entrances. */
export function refusalMessage(remaining: McpSessions): string {
  if (remaining.unknown) {
    return (
      "Kanmer could not confirm that agent MCP sessions have stopped, so the update was " +
      "not started. Close any running agents and try again."
    );
  }
  const where = remaining.projects.length > 0 ? ` (${remaining.projects.join(", ")})` : "";
  return (
    `${remaining.count} agent MCP session(s)${where} are still running from the Kanmer ` +
    "install folder and could not be stopped. They hold files the installer must replace, " +
    "so the update was not started. Close those agents, then try again."
  );
}

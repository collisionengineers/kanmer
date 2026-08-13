import type { McpSessions } from "./ipc.js";

/**
 * Why this file exists.
 *
 * The NSIS installer's `allowOnlyOneInstallerInstance.nsh:79-101` runs, in
 * PowerShell, the moral equivalent of
 *
 *     Get-CimInstance Win32_Process
 *       | ? { $_.Path.StartsWith('$INSTDIR') }
 *       | % { Stop-Process -Force }
 *
 * — it kills by PATH PREFIX, not by image name. And `connect.ts` registers the
 * agent's MCP server as `command = process.execPath`, i.e. the installed
 * Kanmer.exe itself, run with ELECTRON_RUN_AS_NODE=1. So the agent's MCP server
 * is a process under the install dir, and an update force-kills it. The
 * updater's `--updated` flag suppresses the installer's prompt, so this happens
 * with no dialog of its own.
 *
 * We cannot prevent it (it is inherent to NSIS overwriting a running install),
 * so we name it: this parser turns the CIM query's JSON into the count and the
 * project paths, which the renderer shows before "Restart now" and the main
 * process shows before an unattended quit-install.
 *
 * Zero runtime imports on purpose — the type is type-only — so the vitest suite
 * beside this file needs no electron.
 */

/** Shape of one row of the CIM query. Every field may be absent or wrong. */
interface CimRow {
  ExecutablePath?: unknown;
  CommandLine?: unknown;
}

/** The conservative answer: warn generically, never block. */
const UNKNOWN: McpSessions = { count: 0, projects: [], unknown: true };

/** Lowercase + single separator flavour, so path comparison is Windows-honest. */
function normalize(p: string): string {
  return p.replace(/\//g, "\\").toLowerCase();
}

/**
 * Extract the `--root <path>` argument from an MCP server command line.
 * Handles both the quoted form (a project path containing spaces) and the bare
 * form. Returns null when the flag is absent or empty.
 */
function extractRoot(commandLine: string): string | null {
  const m = commandLine.match(/--root\s+("([^"]*)"|(\S+))/);
  if (!m) return null;
  const value = m[2] ?? m[3] ?? "";
  return value.length > 0 ? value : null;
}

/**
 * Parse the CIM JSON into the sessions an NSIS update would force-kill.
 *
 * `installDir` is `dirname(process.execPath)` of the installed app. Rows whose
 * executable lives elsewhere are excluded — they are not in the installer's
 * blast radius.
 *
 * Fails open: any malformed input yields `{ count: 0, projects: [], unknown:
 * true }`, which callers render as the generic warning. It must never throw and
 * must never be the reason an update is refused.
 */
export function parseSessions(stdout: string, installDir: string): McpSessions {
  try {
    const parsed: unknown = JSON.parse(stdout);
    // `ConvertTo-Json` emits a BARE OBJECT for a single match and an array for
    // two or more. Missing this is the classic PowerShell trap, and it is
    // exactly the one-session case we most want to report correctly.
    const rows: CimRow[] = Array.isArray(parsed)
      ? (parsed as CimRow[])
      : parsed && typeof parsed === "object"
        ? [parsed as CimRow]
        : [];

    // Prefix match, deliberately the same looseness as the installer's own
    // `$_.Path.StartsWith($INSTDIR)`. Being faithful to the predicate we are
    // predicting matters more here than being tighter than it.
    const prefix = normalize(installDir);
    const mine = rows.filter(
      (r) => typeof r.ExecutablePath === "string" && normalize(r.ExecutablePath).startsWith(prefix),
    );

    const projects: string[] = [];
    for (const row of mine) {
      if (typeof row.CommandLine !== "string") continue;
      const root = extractRoot(row.CommandLine);
      if (root && !projects.includes(root)) projects.push(root);
    }

    return { count: mine.length, projects, unknown: false };
  } catch {
    return { ...UNKNOWN };
  }
}

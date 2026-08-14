import type { McpSessions, UpdateStatusEvent } from "../../../shared/ipc.js";

/**
 * What the auto-update state should put on screen, and what the user must be
 * told before a restart. Pure by design (AGENTS.md §7): `lib/` is the only
 * renderer code with vitest coverage, and the restart gate is exactly the logic
 * that must not be buried in JSX — see `restartWarning` below.
 */

export type UpdateSurface =
  | { kind: "none" }
  | { kind: "toast"; text: string }
  | { kind: "banner"; version: string };

/**
 * What the update state should put on screen. `dismissed` is per-session only:
 * there is no "skip this version" persistence, because "Later" already costs
 * the user nothing — autoInstallOnAppQuit installs on the next normal quit.
 *
 * An `auto` check that finds nothing, or that fails because the laptop just
 * went offline, produces no surface at all. That is not news.
 */
export function updateSurface(ev: UpdateStatusEvent | null, dismissed: boolean): UpdateSurface {
  if (!ev) return { kind: "none" };
  const { status, source } = ev;
  switch (status.phase) {
    case "available":
    case "downloading":
      return { kind: "toast", text: `Kanmer ${status.version} is downloading…` };
    case "downloaded":
      return dismissed ? { kind: "none" } : { kind: "banner", version: status.version };
    case "none":
      return source === "manual"
        ? { kind: "toast", text: `Kanmer ${status.version} is up to date.` }
        : { kind: "none" };
    case "error":
      return source === "manual"
        ? { kind: "toast", text: `Update check failed: ${status.message}` }
        : { kind: "none" };
    default:
      // idle / checking / disabled
      return { kind: "none" };
  }
}

/**
 * The "Restart now" gate. Returns the sentence to confirm, or null when there
 * is nothing to lose — in which case the caller may install immediately.
 *
 * THIS IS THE GUARD THAT MUST RUN BEFORE THE installUpdate IPC CALL.
 * quitAndInstall() spawns the installer before app.quit() and the installer
 * force-kills every process under the install dir, so a guard placed after the
 * call is a guard that never runs.
 *
 * Composes at most two clauses into ONE sentence, so the user is asked once
 * rather than through two chained modals.
 */
export function restartWarning(dirtyId: string | null, sessions: McpSessions): string | null {
  const clauses: string[] = [];
  if (dirtyId) clauses.push(`discard unsaved changes to ${dirtyId}`);
  if (sessions.unknown) {
    clauses.push("close any agent MCP sessions running from this install");
  } else if (sessions.count > 0) {
    clauses.push(`close ${sessions.count} agent MCP session(s) (${sessions.projects.join(", ")})`);
  }
  if (clauses.length === 0) return null;
  return `Restarting to update will ${clauses.join(" and ")}. Continue?`;
}

import { describe, expect, it } from "vitest";
import { parseSessions } from "./mcp-sessions.js";

const INSTALL = "C:\\Users\\Alex\\AppData\\Local\\Programs\\Kanmer";
const EXE = `${INSTALL}\\Kanmer.exe`;

let nextPid = 1000;

/** One CIM row as PowerShell's ConvertTo-Json would render it. */
function row(
  root: string,
  exe = EXE,
): { ProcessId: number; ExecutablePath: string; CommandLine: string } {
  return {
    ProcessId: nextPid++,
    ExecutablePath: exe,
    CommandLine: `"${exe}" "${INSTALL}\\resources\\mcp\\kanmer-mcp.cjs" --root ${root}`,
  };
}

describe("parseSessions", () => {
  it("fails open on empty output", () => {
    // The probe returning nothing at all must never look like "no sessions".
    expect(parseSessions("", INSTALL)).toEqual({
      count: 0,
      projects: [],
      pids: [],
      unknown: true,
    });
  });

  it("reports no sessions for an empty array", () => {
    expect(parseSessions("[]", INSTALL)).toEqual({
      count: 0,
      projects: [],
      pids: [],
      unknown: false,
    });
  });

  it("handles a single match, which ConvertTo-Json emits as a bare object", () => {
    const r = row("C:\\code\\proj");
    expect(parseSessions(JSON.stringify(r), INSTALL)).toEqual({
      count: 1,
      projects: ["C:\\code\\proj"],
      pids: [r.ProcessId],
      unknown: false,
    });
  });

  it("counts two sessions on one project as two, with one project path", () => {
    const out = JSON.stringify([row("C:\\code\\proj"), row("C:\\code\\proj")]);
    const res = parseSessions(out, INSTALL);
    expect(res.count).toBe(2);
    expect(res.projects).toEqual(["C:\\code\\proj"]);
  });

  it("excludes a process running from outside the install dir", () => {
    const out = JSON.stringify([
      row("C:\\code\\proj"),
      row("C:\\code\\other", "C:\\Program Files\\SomethingElse\\node.exe"),
    ]);
    const res = parseSessions(out, INSTALL);
    expect(res.count).toBe(1);
    expect(res.projects).toEqual(["C:\\code\\proj"]);
  });

  it("counts the installed MCP child behind the launcher, not cmd.exe parents or decoys", () => {
    const child = {
      ProcessId: 4242,
      ExecutablePath: EXE,
      CommandLine: `"${EXE}" "${INSTALL}\\resources\\mcp\\kanmer-mcp.cjs"`,
    };
    const launcherParent = {
      ProcessId: 4241,
      ExecutablePath: "C:\\Windows\\System32\\cmd.exe",
      CommandLine: 'cmd.exe /d /s /c "%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"',
    };
    const unrelatedCmd = {
      ProcessId: 7000,
      ExecutablePath: "C:\\Windows\\System32\\cmd.exe",
      CommandLine: 'cmd.exe /c "C:\\other\\kanmer-mcp.cjs"',
    };

    expect(parseSessions(JSON.stringify([launcherParent, child, unrelatedCmd]), INSTALL)).toEqual({
      count: 1,
      projects: [],
      pids: [child.ProcessId],
      unknown: false,
    });
  });

  it("reads a quoted --root containing spaces as the whole path", () => {
    const out = JSON.stringify({
      ExecutablePath: EXE,
      CommandLine: `"${EXE}" mcp.cjs --root "C:\\Path With Spaces\\proj"`,
    });
    expect(parseSessions(out, INSTALL).projects).toEqual(["C:\\Path With Spaces\\proj"]);
  });

  it("fails open on malformed JSON", () => {
    expect(parseSessions("{not json", INSTALL)).toEqual({
      count: 0,
      projects: [],
      pids: [],
      unknown: true,
    });
  });

  // --- pids (GUI-064) ------------------------------------------------------
  // The count was enough to warn about a session. Stopping one needs its pid.

  it("collects a pid per matching session", () => {
    const a = row("C:\\code\\a");
    const b = row("C:\\code\\b");
    expect(parseSessions(JSON.stringify([a, b]), INSTALL).pids).toEqual([a.ProcessId, b.ProcessId]);
  });

  it("does not collect pids for processes outside the install dir", () => {
    const mine = row("C:\\code\\a");
    const theirs = row("C:\\code\\b", "C:\\Program Files\\SomethingElse\\node.exe");
    const res = parseSessions(JSON.stringify([mine, theirs]), INSTALL);
    expect(res.pids).toEqual([mine.ProcessId]);
    // Killing `theirs` would be killing an unrelated program.
    expect(res.pids).not.toContain(theirs.ProcessId);
  });

  it("accepts a pid PowerShell rendered as a string", () => {
    const out = JSON.stringify({ ...row("C:\\code\\a"), ProcessId: "4242" });
    expect(parseSessions(out, INSTALL).pids).toEqual([4242]);
  });

  it("still counts a session whose pid is missing or unusable", () => {
    // count > 0 with pids empty is the "found it, cannot stop it" state, which
    // callers must treat as NOT cleared rather than as nothing to do.
    for (const bad of [undefined, null, 0, -1, "abc", 1.5]) {
      const out = JSON.stringify({ ...row("C:\\code\\a"), ProcessId: bad });
      const res = parseSessions(out, INSTALL);
      expect(res.count).toBe(1);
      expect(res.pids).toEqual([]);
    }
  });

  it("does not repeat a pid that appears twice", () => {
    const r = row("C:\\code\\a");
    expect(parseSessions(JSON.stringify([r, { ...r }]), INSTALL).pids).toEqual([r.ProcessId]);
  });
});

import { describe, expect, it } from "vitest";
import { parseSessions } from "./mcp-sessions.js";

const INSTALL = "C:\\Users\\Alex\\AppData\\Local\\Programs\\Kanmer";
const EXE = `${INSTALL}\\Kanmer.exe`;

/** One CIM row as PowerShell's ConvertTo-Json would render it. */
function row(root: string, exe = EXE): { ExecutablePath: string; CommandLine: string } {
  return {
    ExecutablePath: exe,
    CommandLine: `"${exe}" "${INSTALL}\\resources\\mcp\\kanmer-mcp.cjs" --root ${root}`,
  };
}

describe("parseSessions", () => {
  it("fails open on empty output", () => {
    // The probe returning nothing at all must never look like "no sessions".
    expect(parseSessions("", INSTALL)).toEqual({ count: 0, projects: [], unknown: true });
  });

  it("reports no sessions for an empty array", () => {
    expect(parseSessions("[]", INSTALL)).toEqual({ count: 0, projects: [], unknown: false });
  });

  it("handles a single match, which ConvertTo-Json emits as a bare object", () => {
    const out = JSON.stringify(row("C:\\code\\proj"));
    expect(parseSessions(out, INSTALL)).toEqual({
      count: 1,
      projects: ["C:\\code\\proj"],
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
      unknown: true,
    });
  });
});

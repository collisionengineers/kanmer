import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the half of mcp-sessions.ts that STOPS things (GUI-064).
 *
 * The probe shells out to PowerShell and the killer to taskkill, so both are
 * faked: `execFile` is mocked to replay a scripted sequence of CIM results, and
 * the killer is injected. Nothing here starts or kills a real process.
 */

const INSTALL = "C:\\Users\\Alex\\AppData\\Local\\Programs\\Kanmer";
const EXE = `${INSTALL}\\Kanmer.exe`;

/** Queue of stdout strings the mocked probe returns, in order. */
let probeResults: string[] = [];
/** `null` makes the probe itself fail, which must read as "unknown", not "clear". */
let probeFails = false;

vi.mock("electron", () => ({ app: { isPackaged: true } }));
vi.mock("node:child_process", () => ({
  execFile: (
    _cmd: string,
    _args: string[],
    _opts: unknown,
    cb: (err: Error | null, stdout: string) => void,
  ) => {
    if (probeFails) {
      cb(new Error("powershell exploded"), "");
      return;
    }
    cb(null, probeResults.shift() ?? "[]");
  },
  execFileSync: () => {
    if (probeFails) throw new Error("powershell exploded");
    return probeResults.shift() ?? "[]";
  },
}));

const { stopMcpSessions, stopMcpSessionsSync, setKiller, refusalMessage } = await import(
  "./mcp-sessions.js"
);

/** CIM rows as PowerShell's ConvertTo-Json would render them. */
function cim(...pids: number[]): string {
  return JSON.stringify(
    pids.map((pid) => ({
      ProcessId: pid,
      ExecutablePath: EXE,
      CommandLine: `"${EXE}" "${INSTALL}\\resources\\mcp\\kanmer-mcp.cjs" --root C:\\code\\proj`,
    })),
  );
}

const realPlatform = process.platform;
function setPlatform(value: string): void {
  Object.defineProperty(process, "platform", { value, configurable: true });
}

beforeEach(() => {
  probeResults = [];
  probeFails = false;
  setPlatform("win32");
  // process.execPath drives dirname() -> installDir, which the parser matches
  // against ExecutablePath. Point it at our fixture install.
  Object.defineProperty(process, "execPath", { value: EXE, configurable: true });
});

afterEach(() => {
  setKiller();
  setPlatform(realPlatform);
  vi.restoreAllMocks();
});

describe("stopMcpSessions", () => {
  it("is a no-op when nothing is running", async () => {
    probeResults = ["[]"];
    const killed: number[] = [];
    setKiller((pid) => void killed.push(pid));

    const res = await stopMcpSessions();

    expect(res).toEqual({ cleared: true, stopped: 0, remaining: expect.objectContaining({ count: 0 }) });
    expect(killed).toEqual([]);
  });

  it("kills the sessions it finds and reports cleared once they are gone", async () => {
    probeResults = [cim(111, 222), "[]"];
    const killed: number[] = [];
    setKiller((pid) => void killed.push(pid));

    const res = await stopMcpSessions();

    expect(killed).toEqual([111, 222]);
    expect(res.cleared).toBe(true);
    expect(res.stopped).toBe(2);
  });

  it("kills again when the host respawns a server, and still converges", async () => {
    // Round 1 finds 111. It dies, the agent host starts 999 in its place.
    // A single-shot kill would hand the installer a fresh lock; this is the
    // exact scenario that makes the bounded retry loop necessary.
    probeResults = [cim(111), cim(999), "[]"];
    const killed: number[] = [];
    setKiller((pid) => void killed.push(pid));

    const res = await stopMcpSessions();

    expect(killed).toEqual([111, 999]);
    expect(res.cleared).toBe(true);
  });

  it("gives up and refuses when the host respawns forever", async () => {
    // Never empties: every probe finds a new pid.
    probeResults = [cim(1), cim(2), cim(3), cim(4), cim(5)];
    setKiller(() => {});

    const res = await stopMcpSessions();

    expect(res.cleared).toBe(false);
    expect(res.remaining.count).toBeGreaterThan(0);
    // Bounded: it must not loop until the probe queue runs dry.
    expect(res.stopped).toBeLessThanOrEqual(3);
  });

  it("is NOT cleared when the probe itself fails", async () => {
    // The probe fails OPEN for warnings (never trap a user) but must fail
    // CLOSED for installing: a broken probe cannot green-light a rename we
    // have no way to undo.
    probeFails = true;
    const res = await stopMcpSessions();

    expect(res.cleared).toBe(false);
    expect(res.remaining.unknown).toBe(true);
  });

  it("is NOT cleared when a session is found but has no usable pid", async () => {
    const noPid = JSON.stringify({
      ProcessId: null,
      ExecutablePath: EXE,
      CommandLine: `"${EXE}" mcp.cjs --root C:\\code\\proj`,
    });
    probeResults = [noPid];
    const killed: number[] = [];
    setKiller((pid) => void killed.push(pid));

    const res = await stopMcpSessions();

    expect(killed).toEqual([]); // nothing to aim at
    expect(res.cleared).toBe(false);
  });

  it("survives a killer that throws, judging only by the re-probe", async () => {
    // taskkill exits non-zero when the process already went away on its own.
    // That is success, not failure.
    probeResults = [cim(111), "[]"];
    setKiller(() => {
      throw new Error("ERROR: The process \"111\" not found.");
    });

    const res = await stopMcpSessions();

    expect(res.cleared).toBe(true);
  });

  it("does nothing off Windows", async () => {
    setPlatform("darwin");
    const killed: number[] = [];
    setKiller((pid) => void killed.push(pid));

    const res = await stopMcpSessions();

    expect(res.cleared).toBe(true);
    expect(killed).toEqual([]);
  });
});

describe("stopMcpSessionsSync", () => {
  // before-quit cannot await, so this twin has to reach the same verdicts.
  it("clears the same way its async twin does", () => {
    probeResults = [cim(111), "[]"];
    const killed: number[] = [];
    setKiller((pid) => void killed.push(pid));

    const res = stopMcpSessionsSync();

    expect(killed).toEqual([111]);
    expect(res.cleared).toBe(true);
  });

  it("refuses the same way when the probe fails", () => {
    probeFails = true;
    expect(stopMcpSessionsSync().cleared).toBe(false);
  });
});

describe("refusalMessage", () => {
  it("names the projects still holding the install folder", () => {
    const msg = refusalMessage({
      count: 2,
      projects: ["C:\\code\\a", "C:\\code\\b"],
      pids: [1, 2],
      unknown: false,
    });
    expect(msg).toContain("C:\\code\\a");
    expect(msg).toContain("C:\\code\\b");
    // The point of the message is what to DO about it.
    expect(msg).toMatch(/close those agents/i);
  });

  it("stays useful when the probe could not tell us anything", () => {
    const msg = refusalMessage({ count: 0, projects: [], pids: [], unknown: true });
    expect(msg).toMatch(/could not confirm/i);
    expect(msg).not.toContain("0 agent");
  });
});

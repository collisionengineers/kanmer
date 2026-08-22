import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renameWithRetry, withExclusiveFileLock, writeFileAtomic, TMP_FILE_RE } from "./io.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-io-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

/** An error shaped like the one Windows raises when a handle blocks a replace. */
function errno(code: string): NodeJS.ErrnoException {
  const e = new Error(`${code}: simulated`) as NodeJS.ErrnoException;
  e.code = code;
  return e;
}

/** Temp files left in `dir` — the residue an interrupted write must not leave. */
async function strays(): Promise<string[]> {
  return (await fs.readdir(dir)).filter((f) => TMP_FILE_RE.test(f));
}

describe("renameWithRetry", () => {
  it("retries a transient failure and then succeeds", async () => {
    // The real case: a scanner holds the destination for a few milliseconds.
    let calls = 0;
    const rename = vi.fn(async () => {
      calls++;
      if (calls < 3) throw errno("EPERM");
    });
    await renameWithRetry("a", "b", rename);
    expect(calls).toBe(3);
  });

  it("retries every code Windows raises for a blocked replace", async () => {
    for (const code of ["EPERM", "EBUSY", "EACCES"]) {
      let calls = 0;
      const rename = vi.fn(async () => {
        calls++;
        if (calls < 2) throw errno(code);
      });
      await renameWithRetry("a", "b", rename);
      expect(calls, code).toBe(2);
    }
  });

  it("fails fast on a code that will not clear", async () => {
    // Retrying ENOSPC turns a clear failure into a slow one and tells the user
    // nothing, so it must not be retried at all.
    const rename = vi.fn(async () => {
      throw errno("ENOSPC");
    });
    await expect(renameWithRetry("a", "b", rename)).rejects.toThrow(/ENOSPC/);
    expect(rename).toHaveBeenCalledTimes(1);
  });

  it("gives up after a bounded number of attempts", async () => {
    const rename = vi.fn(async () => {
      throw errno("EPERM");
    });
    await expect(renameWithRetry("a", "b", rename)).rejects.toThrow(/EPERM/);
    // 1 initial + 5 backoff steps. A migration must not hang on one file.
    expect(rename).toHaveBeenCalledTimes(6);
  });

  it("rethrows the original error, not a wrapper", async () => {
    const original = errno("EPERM");
    const rename = vi.fn(async () => {
      throw original;
    });
    await expect(renameWithRetry("a", "b", rename)).rejects.toBe(original);
  });
});

describe("writeFileAtomic", () => {
  it("writes the file and leaves no temp behind", async () => {
    const file = path.join(dir, "TICK-001.md");
    await writeFileAtomic(file, "hello");
    expect(await fs.readFile(file, "utf8")).toBe("hello");
    expect(await strays()).toEqual([]);
  });

  it("replaces existing content", async () => {
    const file = path.join(dir, "TICK-001.md");
    await writeFileAtomic(file, "first");
    await writeFileAtomic(file, "second");
    expect(await fs.readFile(file, "utf8")).toBe("second");
    expect(await strays()).toEqual([]);
  });

  it("creates missing parent directories", async () => {
    const file = path.join(dir, "areas", "core", "TICK-002", "TICK-002.md");
    await writeFileAtomic(file, "x");
    expect(await fs.readFile(file, "utf8")).toBe("x");
  });

  it("leaves no temp file behind when the rename fails permanently", async () => {
    // This is the defect that littered a real board with five stray temps: the
    // old implementation had no finally, so a failed rename orphaned its temp.
    const file = path.join(dir, "TICK-003.md");
    const spy = vi.spyOn(fs, "rename").mockRejectedValue(errno("EPERM"));
    try {
      await expect(writeFileAtomic(file, "x")).rejects.toThrow(/EPERM/);
    } finally {
      spy.mockRestore();
    }
    expect(await strays()).toEqual([]);
    // And the target was never created.
    await expect(fs.access(file)).rejects.toThrow();
  });

  it("survives a rename that fails once and then succeeds", async () => {
    const file = path.join(dir, "TICK-004.md");
    const real = fs.rename.bind(fs);
    let first = true;
    const spy = vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (first) {
        first = false;
        throw errno("EPERM");
      }
      return real(from, to);
    });
    try {
      await writeFileAtomic(file, "persisted");
    } finally {
      spy.mockRestore();
    }
    expect(await fs.readFile(file, "utf8")).toBe("persisted");
    expect(await strays()).toEqual([]);
  });
});

describe("TMP_FILE_RE", () => {
  it("matches what writeFileAtomic actually creates", () => {
    expect(TMP_FILE_RE.test(".TICK-162.md.tmp-18292-182")).toBe(true);
    expect(TMP_FILE_RE.test(".board.yml.tmp-23812-5")).toBe(true);
  });

  it("does not match real board files", () => {
    for (const name of ["TICK-162.md", "board.yml", ".gitignore", "notes.tmp"]) {
      expect(TMP_FILE_RE.test(name), name).toBe(false);
    }
  });
});

describe("withExclusiveFileLock", () => {
  it("recovers a stale lock only when the recorded owner is dead", async () => {
    const file = path.join(dir, "cache.lock");
    await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0 }), "utf8");
    const result = await withExclusiveFileLock(file, async () => "recovered", {
      now: () => 60_000,
      staleAfterMs: 30_000,
      processAlive: () => false,
      retryDelaysMs: [0],
    });
    expect(result).toBe("recovered");
    await expect(fs.readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("atomically assigns one stale inode to one concurrent reclaimer", async () => {
    const file = path.join(dir, "cache.lock");
    await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0 }), "utf8");

    let firstQuarantine = true;
    let secondStartedResolve!: () => void;
    const secondStarted = new Promise<void>((resolve) => { secondStartedResolve = resolve; });
    let firstRenamedResolve!: () => void;
    const firstRenamed = new Promise<void>((resolve) => { firstRenamedResolve = resolve; });
    let secondAttemptedResolve!: () => void;
    const secondAttempted = new Promise<void>((resolve) => { secondAttemptedResolve = resolve; });
    let winnerClaimedResolve!: () => void;
    const winnerClaimed = new Promise<void>((resolve) => { winnerClaimedResolve = resolve; });
    let losingReclaimer: Promise<unknown> | undefined;
    const renameStaleLock = async (from: string, to: string): Promise<void> => {
      if (firstQuarantine) {
        firstQuarantine = false;
        losingReclaimer = withExclusiveFileLock(file, async () => {
          throw new Error("the losing reclaimer must not enter the callback");
        }, {
          now: () => 60_000,
          staleAfterMs: 30_000,
          processAlive: () => {
            secondStartedResolve();
            return false;
          },
          retryDelaysMs: [0, 0],
          renameStaleLock,
        });
        await secondStarted;
        await fs.rename(from, to);
        firstRenamedResolve();
        await secondAttempted;
        return;
      }
      await firstRenamed;
      let renameError: unknown;
      try {
        await fs.rename(from, to);
      } catch (error) {
        renameError = error;
      } finally {
        secondAttemptedResolve();
      }
      await winnerClaimed;
      if (renameError) throw renameError;
    };

    let firstEnteredResolve!: () => void;
    const firstEntered = new Promise<void>((resolve) => { firstEnteredResolve = resolve; });
    let releaseFirstResolve!: () => void;
    const releaseFirst = new Promise<void>((resolve) => { releaseFirstResolve = resolve; });
    const winner = withExclusiveFileLock(file, async () => {
      firstEnteredResolve();
      winnerClaimedResolve();
      await releaseFirst;
      return "winner";
    }, {
      now: () => 60_000,
      staleAfterMs: 30_000,
      processAlive: () => false,
      retryDelaysMs: [0],
      renameStaleLock,
    });

    await firstEntered;
    const losing = losingReclaimer;
    if (!losing) throw new Error("concurrent reclaimer was not started");
    await expect(losing).rejects.toMatchObject({ code: "EEXIST" });
    expect(await fs.readFile(file, "utf8")).toMatch(/\"pid\":\d+/);
    releaseFirstResolve();
    await expect(winner).resolves.toBe("winner");
  });

  it("preserves a replacement lock when the stale reclaimer loses the rename race", async () => {
    const file = path.join(dir, "cache-reversed.lock");
    await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0 }), "utf8");

    let firstCall = true;
    let winnerRecreated!: () => void;
    const winnerLockReady = new Promise<void>((resolve) => { winnerRecreated = resolve; });
    let releaseWinner!: () => void;
    const winnerRelease = new Promise<void>((resolve) => { releaseWinner = resolve; });
    let loser: Promise<unknown> | undefined;
    const renameStaleLock = async (from: string, to: string): Promise<void> => {
      if (firstCall) {
        firstCall = false;
        loser = withExclusiveFileLock(file, async () => {
          winnerRecreated();
          await winnerRelease;
          return "winner";
        }, {
          now: () => 60_000,
          staleAfterMs: 30_000,
          processAlive: () => false,
          retryDelaysMs: [0],
          renameStaleLock,
        });
        await winnerLockReady;
        // The second reclaimer has claimed and recreated the original path;
        // this delayed rename is the reversed ordering under test.
        await fs.rename(from, to);
        return;
      }
      await fs.rename(from, to);
    };

    const staleReclaimer = withExclusiveFileLock(file, async () => "stale-reclaimer", {
      now: () => 60_000,
      staleAfterMs: 30_000,
      processAlive: () => false,
      retryDelaysMs: [0],
      renameStaleLock,
    });
    await expect(staleReclaimer).rejects.toMatchObject({ code: "EEXIST" });
    if (!loser) throw new Error("winner reclaimer was not started");
    expect(await fs.readFile(file, "utf8")).toContain(`\"pid\":${process.pid}`);
    releaseWinner();
    await expect(loser).resolves.toBe("winner");
    await expect(fs.readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves fresh, active, malformed, and uncertain locks", async () => {
    const file = path.join(dir, "cache.lock");
    for (const [contents, processAlive] of [
      [JSON.stringify({ pid: 12345, createdAt: 59_999 }), () => false],
      [JSON.stringify({ pid: 12345, createdAt: 0 }), () => true],
      ["not-json", () => false],
    ] as const) {
      await fs.writeFile(file, contents, "utf8");
      await expect(withExclusiveFileLock(file, async () => undefined, {
        now: () => 60_000,
        staleAfterMs: 30_000,
        processAlive,
        retryDelaysMs: [0],
      })).rejects.toMatchObject({ code: "EEXIST" });
    }
  });

  it("always releases a claimed lock after callback failure", async () => {
    const file = path.join(dir, "cache.lock");
    await expect(withExclusiveFileLock(file, async () => { throw new Error("callback failed"); })).rejects.toThrow("callback failed");
    await expect(fs.readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

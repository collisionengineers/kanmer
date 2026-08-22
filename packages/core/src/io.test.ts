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
    let staleMoved!: () => void;
    const staleMovedPromise = new Promise<void>((resolve) => { staleMoved = resolve; });
    let releaseStale!: () => void;
    const staleRelease = new Promise<void>((resolve) => { releaseStale = resolve; });
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
          processAlive: (pid) => pid === process.pid,
          retryDelaysMs: [0],
          renameStaleLock,
        });
        await winnerLockReady;
        // The second reclaimer has claimed and recreated the original path;
        // this delayed rename is the reversed ordering under test.
        await fs.rename(from, to);
        staleMoved();
        await staleRelease;
        return;
      }
      await fs.rename(from, to);
    };

    const staleReclaimer = withExclusiveFileLock(file, async () => "stale-reclaimer", {
      now: () => 60_000,
      staleAfterMs: 30_000,
      processAlive: (pid) => pid === process.pid,
      retryDelaysMs: [0],
      renameStaleLock,
    });
    await staleMovedPromise;
    if (!loser) throw new Error("winner reclaimer was not started");
    releaseWinner();
    await expect(loser).resolves.toBe("winner");
    releaseStale();
    await expect(staleReclaimer).resolves.toBe("stale-reclaimer");
    await expect(fs.readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not delete an active replacement when a third claimant wins the path", async () => {
    const file = path.join(dir, "cache-third.lock");
    await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0 }), "utf8");

    let firstCall = true;
    let winnerReady!: () => void;
    const winnerLockReady = new Promise<void>((resolve) => { winnerReady = resolve; });
    let releaseWinner!: () => void;
    const winnerRelease = new Promise<void>((resolve) => { releaseWinner = resolve; });
    let winnerActive = false;
    let thirdSawWinnerActive = false;
    let staleMoved!: () => void;
    const staleMovedPromise = new Promise<void>((resolve) => { staleMoved = resolve; });
    let releaseStale!: () => void;
    const staleRelease = new Promise<void>((resolve) => { releaseStale = resolve; });
    let winner: Promise<unknown> | undefined;
    const renameStaleLock = async (from: string, to: string): Promise<void> => {
      if (firstCall) {
        firstCall = false;
        winner = withExclusiveFileLock(file, async () => {
          winnerActive = true;
          winnerReady();
          await winnerRelease;
          winnerActive = false;
          return "winner";
        }, {
          now: () => 60_000,
          staleAfterMs: 30_000,
          processAlive: (pid) => pid === process.pid,
          retryDelaysMs: [0],
          renameStaleLock,
        });
        await winnerLockReady;
        await fs.rename(from, to);
        staleMoved();
        await staleRelease;
        return;
      }
      await fs.rename(from, to);
    };

    const staleReclaimer = withExclusiveFileLock(file, async () => "stale-reclaimer", {
      now: () => 60_000,
      staleAfterMs: 30_000,
      processAlive: (pid) => pid === process.pid,
      retryDelaysMs: [0],
      renameStaleLock,
    });
    await staleMovedPromise;
    if (!winner) throw new Error("winner reclaimer was not started");

    let releaseThird!: () => void;
    const thirdRelease = new Promise<void>((resolve) => { releaseThird = resolve; });
    let thirdReady!: () => void;
    const thirdLockReady = new Promise<void>((resolve) => { thirdReady = resolve; });
    const third = withExclusiveFileLock(file, async () => {
      thirdSawWinnerActive = winnerActive;
      thirdReady();
      await thirdRelease;
      return "third";
    }, { retryDelaysMs: [0, 50, 100, 200, 400], processAlive: (pid) => pid === process.pid });
    // The third claimant must wait while the replacement owner is active.
    releaseStale();
    await expect(staleReclaimer).rejects.toMatchObject({ code: "EEXIST" });
    releaseWinner();
    await expect(winner).resolves.toBe("winner");
    await thirdLockReady;
    expect(thirdSawWinnerActive).toBe(false);
    expect(await fs.readFile(file, "utf8")).toContain(`\"pid\":${process.pid}`);
    releaseThird();
    await expect(third).resolves.toBe("third");
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

  it("rejects malformed persisted tokens before constructing owner marker paths", async () => {
    const file = path.join(dir, "cache-token.lock");
    const markerDir = `${file}.owner-nested`;
    const victim = path.join(markerDir, "victim.json");
    await fs.mkdir(markerDir);
    await fs.writeFile(victim, JSON.stringify({ pid: 12345 }), "utf8");
    await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0, token: "nested/victim.json" }), "utf8");

    await expect(withExclusiveFileLock(file, async () => "must not recover", {
      now: () => 60_000,
      staleAfterMs: 30_000,
      processAlive: () => false,
      retryDelaysMs: [0],
    })).rejects.toMatchObject({ code: "EEXIST" });
    await expect(fs.readFile(victim, "utf8")).resolves.toBe(JSON.stringify({ pid: 12345 }));
  });

  it("always releases a claimed lock after callback failure", async () => {
    const file = path.join(dir, "cache.lock");
    await expect(withExclusiveFileLock(file, async () => { throw new Error("callback failed"); })).rejects.toThrow("callback failed");
    await expect(fs.readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("retries transient quarantine rename failures", async () => {
    for (const code of ["EPERM", "EBUSY", "EACCES"]) {
      const file = path.join(dir, `cache-${code}.lock`);
      await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0 }), "utf8");
      let calls = 0;
      const renameStaleLock = async (from: string, to: string): Promise<void> => {
        calls++;
        if (calls === 1) throw errno(code);
        await fs.rename(from, to);
      };

      await expect(withExclusiveFileLock(file, async () => "recovered", {
        now: () => 60_000,
        staleAfterMs: 30_000,
        processAlive: () => false,
        retryDelaysMs: [0],
        renameStaleLock,
      })).resolves.toBe("recovered");
      expect(calls, code).toBe(2);
      await expect(fs.readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("surfaces the final claim error after stale recovery loses its retry", async () => {
    const file = path.join(dir, "cache-final-claim-error.lock");
    await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0 }), "utf8");
    let recovered = false;
    const realLink = fs.link.bind(fs);
    const linkSpy = vi.spyOn(fs, "link").mockImplementation(async (existing, target) => {
      if (recovered && String(target) === file) throw errno("EACCES");
      return realLink(existing, target);
    });
    try {
      await expect(withExclusiveFileLock(file, async () => "must not enter", {
        now: () => 60_000,
        staleAfterMs: 30_000,
        processAlive: () => false,
        retryDelaysMs: [0],
        renameStaleLock: async (from, to) => {
          await fs.rename(from, to);
          recovered = true;
        },
      })).rejects.toMatchObject({ code: "EACCES" });
    } finally {
      linkSpy.mockRestore();
    }
  });

  it("removes the claimant marker when lock cleanup itself fails", async () => {
    const file = path.join(dir, "cache-marker-cleanup.lock");
    await fs.writeFile(file, JSON.stringify({ pid: process.pid, createdAt: 60_000 }), "utf8");
    const realReadFile = fs.readFile.bind(fs);
    const readSpy = vi.spyOn(fs, "readFile").mockImplementation(async (target, options) => {
      if (String(target) === file) throw errno("EACCES");
      return realReadFile(target, options);
    });
    try {
      await expect(withExclusiveFileLock(file, async () => "must not enter", {
        now: () => 60_000,
        processAlive: () => true,
        retryDelaysMs: [0],
      })).rejects.toMatchObject({ code: "EACCES" });
      expect((await fs.readdir(dir)).some((entry) => entry.includes(".owner-"))).toBe(false);
    } finally {
      readSpy.mockRestore();
    }
  });

  it("revalidates stale ownership before retrying a transient quarantine rename", async () => {
    const file = path.join(dir, "cache-revalidate.lock");
    await fs.writeFile(file, JSON.stringify({ pid: 12345, createdAt: 0 }), "utf8");
    const replacementToken = "123e4567-e89b-12d3-a456-426614174000";
    const replacementMarker = `${file}.owner-${replacementToken}`;
    let calls = 0;
    const renameStaleLock = async (from: string): Promise<void> => {
      calls++;
      await fs.rm(from, { force: true });
      await fs.writeFile(replacementMarker, JSON.stringify({ pid: process.pid, token: replacementToken }), "utf8");
      await fs.writeFile(from, JSON.stringify({ pid: process.pid, createdAt: 60_000, token: replacementToken }), "utf8");
      throw errno("EPERM");
    };

    await expect(withExclusiveFileLock(file, async () => "must not recover", {
      now: () => 60_000,
      staleAfterMs: 30_000,
      processAlive: (pid) => pid === process.pid,
      retryDelaysMs: [0],
      renameStaleLock,
    })).rejects.toMatchObject({ code: "EEXIST" });
    expect(calls).toBe(1);
    await fs.rm(file, { force: true });
    await fs.rm(replacementMarker, { force: true });
  });

  it("surfaces quarantine cleanup errors during lock release", async () => {
    const file = path.join(dir, "cache-cleanup.lock");
    let quarantineFile = "";
    const realRm = fs.rm.bind(fs);
    const rmSpy = vi.spyOn(fs, "rm").mockImplementation(async (target, options) => {
      if (quarantineFile && String(target) === quarantineFile) throw errno("EACCES");
      return realRm(target, options);
    });
    try {
      await expect(withExclusiveFileLock(file, async () => {
        const record = JSON.parse(await fs.readFile(file, "utf8")) as { token: string };
        quarantineFile = path.join(dir, "cache-cleanup.lock.stale-test");
        await fs.writeFile(quarantineFile, JSON.stringify({ pid: 12345, createdAt: 0, token: record.token }), "utf8");
        return "done";
      })).rejects.toMatchObject({ code: "EACCES" });
    } finally {
      rmSpy.mockRestore();
    }
  });
});

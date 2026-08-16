import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renameWithRetry, writeFileAtomic, TMP_FILE_RE } from "./io.js";

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

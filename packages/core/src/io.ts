import fs from "node:fs/promises";
import path from "node:path";
import type { Stats } from "node:fs";
import { createHash } from "node:crypto";

/**
 * Version token for a document's exact bytes. Content-hashed, not mtime:
 * immune to coarse mtime granularity and to writeFileAtomic's rename (which
 * replaces the inode, so anything identity-based would false-positive).
 */
export function contentVersion(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

/** Ensure a directory (and parents) exists. */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** True if a path exists. */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * `fs.stat` for a path, or null when it doesn't exist (or can't be read).
 * Lets a caller cheaply ask "has this file changed?" without a try/catch.
 */
export async function statOrNull(p: string): Promise<Stats | null> {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

/**
 * Backoff between rename attempts. ~545 ms total, which is far longer than a
 * virus scanner or indexer holds a just-created file, and far shorter than a
 * user waits before assuming the app has hung.
 */
const RENAME_RETRY_MS = [10, 25, 60, 150, 300];

/**
 * The errno codes Windows raises when an open handle blocks a replace — a
 * realtime scanner reading the temp file, a search indexer, OneDrive, or
 * `git add` hashing the destination.
 *
 * Deliberately narrow. Retrying `ENOSPC` or `EROFS` turns a clear, immediate
 * failure into a slow one and tells the user nothing.
 */
const TRANSIENT_RENAME_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * `fs.rename`, retried while the destination is momentarily unopenable.
 *
 * `rename` takes the injected function purely as a test seam: contriving a real
 * locked file cross-platform is unreliable, and the retry is exactly the part
 * that must be proven.
 */
export async function renameWithRetry(
  from: string,
  to: string,
  rename: (a: string, b: string) => Promise<void> = fs.rename,
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (!TRANSIENT_RENAME_CODES.has(code) || attempt >= RENAME_RETRY_MS.length) throw err;
      await sleep(RENAME_RETRY_MS[attempt]!);
    }
  }
}

/**
 * Atomically write text: write to a temp file in the same directory, then
 * rename over the target. Rename is atomic on the same volume, so a watcher
 * on the target never observes a half-written file.
 *
 * The rename retries (see {@link renameWithRetry}) because on Windows it fails
 * `EPERM` whenever anything holds the destination open, which is ordinary
 * rather than exceptional — antivirus, the indexer, `git add`. A bulk write
 * such as a migration hits it reliably, and without a retry a single scanner
 * read aborts the whole run.
 *
 * The temp file is removed either way. Leaving it behind on failure is what
 * left stray `.tmp-*` files on a real board, uncommitted-but-unignored, for a
 * sync to pick up.
 */
export async function writeFileAtomic(file: string, contents: string): Promise<void> {
  const dir = path.dirname(file);
  await ensureDir(dir);
  // Unique-ish temp name without Math.random dependency concerns.
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${tmpCounter()}`);
  try {
    await fs.writeFile(tmp, contents, "utf8");
    await renameWithRetry(tmp, file);
  } finally {
    // A successful rename already moved it; force makes that a no-op.
    await fs.rm(tmp, { force: true }).catch(() => undefined);
  }
}

/** Matches the temp files {@link writeFileAtomic} and {@link writeFileExclusive} create. */
export const TMP_FILE_RE = /^\.[^/\\]+\.tmp-\d+-\d+$/;

/**
 * Exclusively create `file` with `contents`: fails with EEXIST if the target
 * already exists. The claim is atomic — write a temp file, then hard-link it
 * to the target (link fails if the target exists; works on NTFS). Where hard
 * links aren't supported, fall back to an O_EXCL write, which is equally
 * exclusive just not staged through a temp file. Crash-safe by construction:
 * there is no lock to leak, the item file itself is the lock.
 */
export async function writeFileExclusive(file: string, contents: string): Promise<void> {
  const dir = path.dirname(file);
  await ensureDir(dir);
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${tmpCounter()}`);
  await fs.writeFile(tmp, contents, "utf8");
  try {
    await fs.link(tmp, file);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "ENOSYS" || code === "ENOTSUP") {
      await fs.writeFile(file, contents, { encoding: "utf8", flag: "wx" });
    } else {
      throw err;
    }
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

export async function readText(file: string): Promise<string> {
  return fs.readFile(file, "utf8");
}

export async function removeFile(file: string): Promise<void> {
  await fs.rm(file, { force: true });
}

let _counter = 0;
function tmpCounter(): number {
  _counter = (_counter + 1) % 1_000_000;
  return _counter;
}

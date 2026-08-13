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
 * Atomically write text: write to a temp file in the same directory, then
 * rename over the target. Rename is atomic on the same volume, so a watcher
 * on the target never observes a half-written file.
 */
export async function writeFileAtomic(file: string, contents: string): Promise<void> {
  const dir = path.dirname(file);
  await ensureDir(dir);
  // Unique-ish temp name without Math.random dependency concerns.
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${tmpCounter()}`);
  await fs.writeFile(tmp, contents, "utf8");
  await fs.rename(tmp, file);
}

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

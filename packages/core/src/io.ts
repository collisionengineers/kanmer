import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import type { Stats } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

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

export interface ExclusiveFileLockOptions {
  staleAfterMs?: number;
  now?: () => number;
  processAlive?: (pid: number) => boolean;
  /** Return an OS process-start identity; undefined means identity is unavailable. */
  processIdentity?: (pid: number) => string | undefined;
  retryDelaysMs?: readonly number[];
  renameStaleLock?: (from: string, to: string) => Promise<void>;
}

const DEFAULT_LOCK_STALE_MS = 30_000;
const DEFAULT_LOCK_RETRY_MS = [10, 25, 60, 150, 300, 600, 1_000] as const;

interface LockRecord {
  pid: number;
  createdAt?: number;
  token?: string;
  identity?: string;
}

const LOCK_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidLockToken(value: unknown): value is string {
  return typeof value === "string" && LOCK_TOKEN_RE.test(value);
}

let cachedSelfProcessIdentity: string | undefined;
let cachedSelfProcessIdentityReady = false;

function defaultProcessIdentity(pid: number): string | undefined {
  if (pid === process.pid && cachedSelfProcessIdentityReady) return cachedSelfProcessIdentity;
  let identity: string | undefined;
  if (process.platform === "linux") {
    try {
      // Linux exposes a monotonic process start tick in /proc/<pid>/stat. The
      // field remains stable for the lifetime of a process and changes when a
      // PID is reused, unlike kill(pid, 0) alone.
      const contents = fsSync.readFileSync(`/proc/${pid}/stat`, "utf8");
      const close = contents.lastIndexOf(")");
      const fields = close >= 0 ? contents.slice(close + 2).trim().split(/\s+/) : [];
      identity = fields[19] ? `linux:${fields[19]}` : undefined;
    } catch {
      identity = undefined;
    }
  } else if (process.platform === "win32") {
    try {
      // PowerShell is part of supported Windows installations and exposes the
      // kernel creation time without adding a native dependency. The PID is an
      // integer interpolated into a fixed command, not caller-controlled code.
      const output = execFileSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", `$p=Get-Process -Id ${pid} -ErrorAction Stop; [int64]$p.StartTime.ToFileTimeUtc()`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      const value = output.trim();
      identity = value ? `win32:${value}` : undefined;
    } catch {
      identity = undefined;
    }
  } else {
    identity = undefined;
  }
  if (pid === process.pid) {
    cachedSelfProcessIdentity = identity;
    cachedSelfProcessIdentityReady = true;
  }
  return identity;
}

function parseLockRecord(contents: string): LockRecord | null {
  try {
    const parsed: unknown = JSON.parse(contents);
    const candidate = parsed as { pid?: unknown; createdAt?: unknown; token?: unknown; identity?: unknown };
    if (
      parsed &&
      typeof parsed === "object" &&
      Number.isInteger(candidate.pid) &&
      Number(candidate.pid) > 0 &&
      (candidate.createdAt === undefined || (typeof candidate.createdAt === "number" && Number.isFinite(candidate.createdAt))) &&
      (candidate.token === undefined || isValidLockToken(candidate.token)) &&
      (candidate.identity === undefined || (typeof candidate.identity === "string" && candidate.identity.length > 0))
    ) {
      return {
        pid: Number(candidate.pid),
        ...(candidate.createdAt === undefined ? {} : { createdAt: Number(candidate.createdAt) }),
        ...(candidate.token === undefined ? {} : { token: candidate.token }),
        ...(candidate.identity === undefined ? {} : { identity: candidate.identity }),
      };
    }
  } catch {
    // Legacy lock records are just a PID followed by a newline.
  }
  const pid = Number(contents.trim());
  return Number.isInteger(pid) && pid > 0 ? { pid } : null;
}

/** Invalid metadata (especially a token) is not safe to reinterpret as a stale PID. */
function isUnrecoverableMalformedRecord(contents: string): boolean {
  try {
    const parsed = JSON.parse(contents) as { token?: unknown; createdAt?: unknown; identity?: unknown };
    return Boolean(
      parsed &&
      typeof parsed === "object" &&
      (("token" in parsed && !isValidLockToken(parsed.token)) ||
        ("createdAt" in parsed && !(typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt))) ||
        ("identity" in parsed && !(typeof parsed.identity === "string" && parsed.identity.length > 0))),
    );
  } catch {
    // Empty/partial fallback records are recoverable after the stale interval
    // when no active owner marker exists. There is no path component to trust.
    return false;
  }
}

function defaultProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but this process cannot inspect it.
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function ownerMarkerPath(lockFile: string, token: string): string {
  if (!isValidLockToken(token)) throw new Error("invalid persisted lock token");
  return `${lockFile}.owner-${token}`;
}

async function ownerMarkerActive(
  markerFile: string,
  processAlive: (pid: number) => boolean = defaultProcessAlive,
  processIdentity: (pid: number) => string | undefined = defaultProcessIdentity,
  now: () => number = Date.now,
  staleAfterMs: number = DEFAULT_LOCK_STALE_MS,
): Promise<boolean> {
  let contents: string;
  try {
    contents = await fs.readFile(markerFile, "utf8");
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ENOENT";
  }
  let parsed = false;
  try {
    const marker = JSON.parse(contents) as { pid?: unknown; identity?: unknown };
    if (Number.isInteger(marker.pid) && Number(marker.pid) > 0) {
      // A well-formed lease whose owner has exited is reclaimable now.
      parsed = true;
      let alive: boolean;
      try {
        alive = processAlive(Number(marker.pid));
      } catch {
        return true;
      }
      if (alive) {
        if (typeof marker.identity !== "string" || marker.identity.length === 0) return true;
        try {
          const currentIdentity = processIdentity(Number(marker.pid));
          if (currentIdentity === undefined || currentIdentity === marker.identity) return true;
        } catch {
          return true;
        }
      }
    }
  } catch {
    parsed = false;
  }
  if (!parsed) {
    // A crash between O_EXCL creation and writing the lease can leave an
    // empty/partial owner marker.  It is active while fresh, but must not
    // become a permanent lock after the bounded stale interval.
    try {
      const markerStat = await fs.stat(markerFile);
      if (now() - markerStat.mtimeMs < staleAfterMs) return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return true;
      return false;
    }
  }
  await fs.rm(markerFile, { force: true });
  return false;
}

async function cleanupOwnerQuarantines(lockFile: string, token: string): Promise<void> {
  const dir = path.dirname(lockFile);
  const prefix = `${path.basename(lockFile)}.stale-`;
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries.filter((name) => name.startsWith(prefix))) {
    const quarantineFile = path.join(dir, entry);
    try {
      const contents = await fs.readFile(quarantineFile, "utf8");
      if (parseLockRecord(contents)?.token === token) await fs.rm(quarantineFile, { force: true });
    } catch (error) {
      // A concurrent reclaimer may have consumed the quarantine. Every other
      // read/remove failure must reach the lock owner rather than leaving
      // residue silently.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

async function hasActiveOwnerMarker(
  lockFile: string,
  processAlive: (pid: number) => boolean,
  processIdentity: (pid: number) => string | undefined,
  now: () => number = Date.now,
  staleAfterMs: number = DEFAULT_LOCK_STALE_MS,
): Promise<boolean> {
  let entries: string[];
  try {
    entries = await fs.readdir(path.dirname(lockFile));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  const prefix = `${path.basename(lockFile)}.owner-`;
  for (const entry of entries.filter((name) => name.startsWith(prefix))) {
    if (await ownerMarkerActive(path.join(path.dirname(lockFile), entry), processAlive, processIdentity, now, staleAfterMs)) return true;
  }
  return false;
}

async function releaseOwnedLock(lockFile: string, token: string): Promise<void> {
  // Release the path first, then clear the owner lease and sweep quarantines.
  // A stale-reclaimer that was holding the replacement in quarantine will
  // either discard it (seeing no lease) or restore it; the second token check
  // removes any restoration that races with lease removal, so a completed
  // owner can never leave a ghost lock.
  try {
    const contents = await fs.readFile(lockFile, "utf8");
    if (parseLockRecord(contents)?.token === token) await fs.rm(lockFile, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await fs.rm(ownerMarkerPath(lockFile, token), { force: true });
  await cleanupOwnerQuarantines(lockFile, token);
  try {
    const contents = await fs.readFile(lockFile, "utf8");
    if (parseLockRecord(contents)?.token === token) await fs.rm(lockFile, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await cleanupOwnerQuarantines(lockFile, token);
}

async function recoverStaleLock(
  lockFile: string,
  options: Required<Pick<ExclusiveFileLockOptions, "staleAfterMs" | "now" | "processAlive" | "processIdentity" | "renameStaleLock">>,
): Promise<boolean> {
  let initialContents: string;
  let initialStat: Stats;
  try {
    [initialContents, initialStat] = await Promise.all([fs.readFile(lockFile, "utf8"), fs.stat(lockFile)]);
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT";
  }
  const record = parseLockRecord(initialContents);
  const now = options.now();
  // A caller's clock can be ahead of the persisted timestamp (or the
  // timestamp can be forged into the future).  Filesystem age is the bounded
  // fallback that still permits recovery of a dead owner without trusting a
  // future createdAt forever.
  const persistedAge = record?.createdAt === undefined ? 0 : now - record.createdAt;
  const filesystemAge = now - initialStat.mtimeMs;
  if (Math.max(0, persistedAge, filesystemAge) < options.staleAfterMs) return false;
  if (!record && isUnrecoverableMalformedRecord(initialContents)) return false;
  if (record?.token && await ownerMarkerActive(ownerMarkerPath(lockFile, record.token), options.processAlive, options.processIdentity, options.now, options.staleAfterMs)) return false;
  if (record) {
    let alive: boolean;
    try {
      alive = options.processAlive(record.pid);
      if (alive && record.identity) {
        const currentIdentity = options.processIdentity(record.pid);
        // An identity mismatch proves PID reuse. An unavailable identity is
        // deliberately fail-closed rather than treating a live PID as stale.
        alive = currentIdentity === undefined || currentIdentity === record.identity;
      }
    } catch {
      return false;
    }
    if (alive) return false;
  } else if (await hasActiveOwnerMarker(lockFile, options.processAlive, options.processIdentity, options.now, options.staleAfterMs)) {
    return false;
  }
  // Re-read before quarantining so a concurrent replacement is never treated
  // as the stale record we inspected. The rename below is the ownership
  // transition: exactly one reclaimer can move this inode, and every other
  // reclaimer observes ENOENT rather than unlinking a replacement at the
  // original path.
  const stillOwnsStaleLock = async (): Promise<boolean> => {
    let currentContents: string;
    let currentStat: Stats;
    try {
      [currentContents, currentStat] = await Promise.all([fs.readFile(lockFile, "utf8"), fs.stat(lockFile)]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
    if (
      currentContents !== initialContents ||
      currentStat.dev !== initialStat.dev ||
      currentStat.ino !== initialStat.ino ||
      currentStat.mtimeMs !== initialStat.mtimeMs
    ) return false;
    const currentRecord = parseLockRecord(currentContents);
    if (!currentRecord) {
      return !isUnrecoverableMalformedRecord(currentContents) && !(await hasActiveOwnerMarker(lockFile, options.processAlive, options.processIdentity, options.now, options.staleAfterMs));
    }
    let currentAlive: boolean;
    try {
      currentAlive = options.processAlive(currentRecord.pid);
      if (currentAlive && currentRecord.identity) {
        const currentIdentity = options.processIdentity(currentRecord.pid);
        currentAlive = currentIdentity === undefined || currentIdentity === currentRecord.identity;
      }
    } catch {
      return false;
    }
    if (currentAlive) return false;
    if (currentRecord.token && await ownerMarkerActive(ownerMarkerPath(lockFile, currentRecord.token), options.processAlive, options.processIdentity, options.now, options.staleAfterMs)) return false;
    return !(await hasActiveOwnerMarker(lockFile, options.processAlive, options.processIdentity, options.now, options.staleAfterMs));
  };

  if (!(await stillOwnsStaleLock())) return false;
  const quarantineFile = `${lockFile}.stale-${process.pid}-${tmpCounter()}`;
  let renamed: boolean;
  try {
    renamed = await renameWithRetry(lockFile, quarantineFile, options.renameStaleLock, stillOwnsStaleLock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  if (!renamed) return false;
  // `rename` is atomic, but it cannot compare the inode that was inspected
  // with the inode that is present at the path when the rename executes. A
  // second reclaimer may therefore have replaced the stale record between
  // our identity check and this call. Inspect the quarantine inode before
  // deleting anything; if it is not the stale inode we examined, restore it
  // without overwriting a newer lock. `link` is exclusive at the destination,
  // so a concurrent winner that has already recreated the path is preserved.
  let quarantinedContents: string;
  let quarantinedStat: Stats;
  try {
    [quarantinedContents, quarantinedStat] = await Promise.all([fs.readFile(quarantineFile, "utf8"), fs.stat(quarantineFile)]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  const ownsInspectedInode =
    quarantinedContents === initialContents &&
    quarantinedStat.dev === initialStat.dev &&
    quarantinedStat.ino === initialStat.ino &&
    quarantinedStat.mtimeMs === initialStat.mtimeMs;
  if (!ownsInspectedInode) {
    const replacementToken = parseLockRecord(quarantinedContents)?.token;
    const replacementMarker = replacementToken ? ownerMarkerPath(lockFile, replacementToken) : null;
    const replacementActive = replacementMarker
      ? await ownerMarkerActive(replacementMarker, options.processAlive, options.processIdentity, options.now, options.staleAfterMs)
      : false;
    if (!replacementActive) {
      await fs.rm(quarantineFile, { force: true });
      return false;
    }
    try {
      await fs.link(quarantineFile, lockFile);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return false;
      if (code !== "EEXIST") throw error;
      // A concurrent writer owns the path. Keep the active replacement in
      // quarantine; its owner removes it safely during release.
    }
    return false;
  }
  try {
    await fs.rm(quarantineFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return true;
}

/** Serialize a critical section across processes with an exclusive lock file. */
export async function withExclusiveFileLock<T>(
  lockFile: string,
  work: () => Promise<T>,
  options: ExclusiveFileLockOptions = {},
): Promise<T> {
  const delays = options.retryDelaysMs ?? DEFAULT_LOCK_RETRY_MS;
  const lockOptions = {
    staleAfterMs: options.staleAfterMs ?? DEFAULT_LOCK_STALE_MS,
    now: options.now ?? Date.now,
    processAlive: options.processAlive ?? defaultProcessAlive,
    processIdentity: options.processIdentity ?? defaultProcessIdentity,
    // Keep the injected seam as a single attempt. recoverStaleLock applies
    // the shared bounded retry helper with ownership revalidation between
    // transient attempts.
    renameStaleLock: options.renameStaleLock ?? fs.rename,
  };
  await ensureDir(path.dirname(lockFile));
  let claimed = false;
  const claimToken = randomUUID();
  let claimIdentity: string | undefined;
  try {
    claimIdentity = lockOptions.processIdentity(process.pid);
  } catch {
    claimIdentity = undefined;
  }
  const markerFile = ownerMarkerPath(lockFile, claimToken);
  let lastError: unknown;
  const claim = async (): Promise<void> => {
    // A replacement owner keeps its marker beside the lock while its inode is
    // temporarily quarantined. Do not create a third claimant in that window.
    if (await hasActiveOwnerMarker(lockFile, lockOptions.processAlive, lockOptions.processIdentity, lockOptions.now, lockOptions.staleAfterMs)) {
      const error = new Error("active lock owner is quarantined") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    }
    try {
      await writeFileExclusive(
        markerFile,
        `${JSON.stringify({ pid: process.pid, createdAt: lockOptions.now(), token: claimToken, ...(claimIdentity ? { identity: claimIdentity } : {}) })}\n`,
      );
      await writeFileExclusive(
        lockFile,
        `${JSON.stringify({ pid: process.pid, createdAt: lockOptions.now(), token: claimToken, ...(claimIdentity ? { identity: claimIdentity } : {}) })}\n`,
      );
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      try {
        const contents = await fs.readFile(lockFile, "utf8");
        if (parseLockRecord(contents)?.token === claimToken) await fs.rm(lockFile, { force: true });
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code !== "ENOENT") cleanupErrors.push(readError);
      }
      try {
        await fs.rm(markerFile, { force: true });
      } catch (markerError) {
        cleanupErrors.push(markerError);
      }
      if (cleanupErrors.length > 0) throw new AggregateError([error, ...cleanupErrors], "lock claim and cleanup failed");
      throw error;
    }
  };
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await claim();
      claimed = true;
      break;
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (code !== "EEXIST") throw error;
      if (await recoverStaleLock(lockFile, lockOptions)) {
        try {
          await claim();
          claimed = true;
          break;
        } catch (retryError) {
          lastError = retryError;
        }
      }
      if (attempt === delays.length) {
        // A stale claim can recover successfully and still lose the retry
        // claim. Surface that final claim error instead of the obsolete
        // EEXIST from the stale inode, so callers can act on the real cause.
        throw lastError instanceof Error ? lastError : error;
      }
      await sleep(delays[attempt]!);
    }
  }
  if (!claimed) throw lastError instanceof Error ? lastError : new Error("unable to claim file lock");
  let value!: T;
  let workError: unknown;
  let worked = false;
  try {
    value = await work();
    worked = true;
  } catch (error) {
    workError = error;
  }
  let releaseError: unknown;
  try {
    await releaseOwnedLock(lockFile, claimToken);
  } catch (error) {
    releaseError = error;
  }
  if (workError !== undefined || !worked) {
    if (releaseError !== undefined) {
      throw new AggregateError([workError, releaseError], "lock callback and release failed");
    }
    throw workError;
  }
  if (releaseError !== undefined) throw releaseError;
  return value;
}

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
  beforeRetry?: () => Promise<boolean>,
): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (!TRANSIENT_RENAME_CODES.has(code) || attempt >= RENAME_RETRY_MS.length) throw err;
      await sleep(RENAME_RETRY_MS[attempt]!);
      if (beforeRetry && !(await beforeRetry())) return false;
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

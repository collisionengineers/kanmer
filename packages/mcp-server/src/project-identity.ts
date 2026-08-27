import { createHash } from "node:crypto";
import path from "node:path";

export interface ProjectIdentityInput {
  boardRoot: string;
  format: number;
  repoRoot: string;
  boardSource: "file" | "default";
}

export interface ProjectIdentity {
  boardRoot: string;
  format: number;
  repoRoot: string;
  boardSource: "file" | "default";
  fingerprint: string;
}

function isWindowsAbsolute(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input) || /^\\\\/.test(input);
}

/** Canonicalise only the path details which are intentionally cross-host noisy. */
export function canonicalProjectPath(input: string): string {
  // A smoke vector can deliberately be Windows-looking even when the test
  // host is POSIX. Native path.resolve would treat `C:\\...` as a relative
  // filename there, producing a cwd-dependent identity. Resolve explicit
  // Windows drive/UNC paths with win32; native paths keep host semantics.
  let value = (isWindowsAbsolute(input) ? path.win32.resolve(input) : path.resolve(input)).replace(/\\/g, "/");
  value = value.replace(/^([A-Z]):/, (_, drive: string) => `${drive.toLowerCase()}:`);
  if (!/^\/$/.test(value) && !/^[a-z]:\/$/.test(value)) value = value.replace(/\/+$/, "");
  return value;
}

/**
 * A session-local, machine-local board identity. Keep the payload construction
 * in this exact order: its JSON bytes are the compatibility contract.
 */
export function projectIdentity(input: ProjectIdentityInput): ProjectIdentity {
  const payload = {
    boardRoot: canonicalProjectPath(input.boardRoot),
    format: input.format,
    repoRoot: canonicalProjectPath(input.repoRoot),
  };
  const fingerprint = `kanmer-proj-v1:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  return { ...payload, boardSource: input.boardSource, fingerprint };
}

/**
 * The remote origin as it is safe to report and hash: embedded userinfo
 * (`https://user:token@host/...`, `ssh://git@host/...`) is stripped so a
 * credential can never surface in `get_status` or feed `kanmer-loc-v1`.
 * Returns null for an empty value. Never throws: an unparseable value is
 * scrubbed by pattern, not by URL().
 */
export function redactRemoteOrigin(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  // scheme://userinfo@host/... — drop everything between "//" and the last "@" of the authority.
  const schemed = value.match(/^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)(.*)$/i);
  if (schemed) {
    const [, scheme, authority, rest] = schemed;
    const at = authority.lastIndexOf("@");
    return `${scheme}${at === -1 ? authority : authority.slice(at + 1)}${rest}`;
  }
  // scp-like git@host:owner/repo.git — the "user" is a fixed login name, not a
  // secret, but a token could still be smuggled as user:token@host; strip a
  // password segment while keeping the login.
  const scp = value.match(/^([^@:/]+):([^@/]*)@(.*)$/);
  if (scp) return `${scp[1]}@${scp[3]}`;
  return value;
}

/**
 * Where this board physically is — FRD-029's machine-local location
 * fingerprint. Every field is evidence, never identity: a copy of the board
 * at another path, or a changed/missing remote origin, yields a different
 * `fingerprint` here while the logical `project_id` stays the same. Unknown
 * values are reported as null rather than guessed.
 */
export interface LocationFingerprint {
  repoPath: string;
  boardPath: string;
  machine: string | null;
  boardBranch: string | null;
  remoteOrigin: string | null;
  fingerprint: string;
}

export function locationFingerprint(input: {
  repoPath: string;
  boardPath: string;
  machine: string | null;
  boardBranch: string | null;
  remoteOrigin: string | null;
}): LocationFingerprint {
  const payload = {
    repoPath: canonicalProjectPath(input.repoPath),
    boardPath: canonicalProjectPath(input.boardPath),
    machine: input.machine,
    boardBranch: input.boardBranch,
    remoteOrigin: input.remoteOrigin,
  };
  const fingerprint = `kanmer-loc-v1:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  return { ...payload, fingerprint };
}

/** The logical project as every MCP response reports it. */
export interface LogicalProject {
  /** Stable logical identity, or null on a board that has not been migrated yet. */
  project_id: string | null;
  board_id: string | null;
  /** `logical` once `project.json` exists; `unassigned` until the one-time migration runs. */
  identity: "logical" | "unassigned";
  /** How the identity came to be, when assigned. */
  origin: "generated" | "migrated" | null;
  /** The legacy machine-local fingerprint (`kanmer-proj-v1`), kept as the auditable fallback. */
  fingerprint: string;
}

/**
 * Which `expected_project` values name THIS project: the logical id when one
 * is assigned, and the legacy location fingerprint for clients written
 * before FRD-029. A logical id is never accepted before it has been
 * allocated — it cannot be guessed, so a guess is a wrong project.
 */
export function expectedProjectMatches(sent: string, project: LogicalProject): boolean {
  if (sent === project.fingerprint) return true;
  return project.project_id !== null && sent === project.project_id;
}

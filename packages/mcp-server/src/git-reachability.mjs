import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const FULL_SHA_RE = /^[0-9a-f]{40}$/i;
const COMMIT_ID_RE = /^[0-9a-f]{4,40}$/i;

/**
 * Check ticket commits at the CLI boundary. Argument arrays and a bounded
 * timeout keep repository values out of a shell command and keep a broken
 * object from hanging the merge gate.
 */
export async function collectCommitReachability({ commits, headSha, baseSha, cwd, run = execFile }) {
  if (!FULL_SHA_RE.test(headSha)) {
    throw new Error("pull request head SHA is not a full hexadecimal Git object id");
  }
  if (!FULL_SHA_RE.test(baseSha)) {
    throw new Error("pull request base SHA is not a full hexadecimal Git object id");
  }
  const unique = [...new Set(commits.map((sha) => String(sha).trim().toLowerCase()))].sort();
  return Promise.all(unique.map(async (sha) => {
    if (!COMMIT_ID_RE.test(sha)) {
      return { sha, state: "indeterminate", diagnostic: "ticket commit is not a valid hexadecimal Git object id or abbreviation" };
    }
    try {
      await run("git", ["merge-base", "--is-ancestor", sha, headSha], {
        cwd,
        timeout: 15_000,
        windowsHide: true,
        maxBuffer: 32 * 1024,
      });
    } catch (error) {
      const code = typeof error?.code === "number" ? error.code : Number.NaN;
      if (code === 1) return { sha, state: "unreachable" };
      const diagnostic = String(error?.stderr || error?.message || "git ancestry query failed")
        .replace(/[\r\n]+/g, " ")
        .slice(0, 240);
      return { sha, state: "indeterminate", diagnostic };
    }
    try {
      await run("git", ["merge-base", "--is-ancestor", sha, baseSha], {
        cwd,
        timeout: 15_000,
        windowsHide: true,
        maxBuffer: 32 * 1024,
      });
      return { sha, state: "unreachable", diagnostic: "commit is reachable from the PR base and is outside the base..head range" };
    } catch (error) {
      const code = typeof error?.code === "number" ? error.code : Number.NaN;
      if (code === 1) return { sha, state: "reachable" };
      const diagnostic = String(error?.stderr || error?.message || "git ancestry query failed")
        .replace(/[\r\n]+/g, " ")
        .slice(0, 240);
      return { sha, state: "indeterminate", diagnostic };
    }
  }));
}

/**
 * Reconciliation has only the exact merge target, not a trustworthy PR base.
 * Prove each recorded ticket commit is an ancestor of that target without
 * widening the assertion to whatever happens to be checked out locally.
 * (Salvaged from PR #286 for CORE-122.)
 */
export async function collectCommitReachabilityFromTarget({ commits, targetSha, cwd, run = execFile }) {
  if (!FULL_SHA_RE.test(targetSha)) {
    throw new Error("pull request merge SHA is not a full hexadecimal Git object id");
  }
  const unique = [...new Set(commits.map((sha) => String(sha).trim().toLowerCase()))].sort();
  return Promise.all(unique.map(async (sha) => {
    if (!COMMIT_ID_RE.test(sha)) {
      return { sha, state: "indeterminate", diagnostic: "ticket commit is not a valid hexadecimal Git object id or abbreviation" };
    }
    try {
      await run("git", ["merge-base", "--is-ancestor", sha, targetSha], {
        cwd,
        timeout: 15_000,
        windowsHide: true,
        maxBuffer: 32 * 1024,
      });
      return { sha, state: "reachable" };
    } catch (error) {
      const code = typeof error?.code === "number" ? error.code : Number.NaN;
      if (code === 1) return { sha, state: "unreachable" };
      const diagnostic = String(error?.stderr || error?.message || "git ancestry query failed")
        .replace(/[\r\n]+/g, " ")
        .slice(0, 240);
      return { sha, state: "indeterminate", diagnostic };
    }
  }));
}

/** Fail closed when the PR checkout itself is not a usable Git repository. */
export async function assertGitRepository({ cwd, run = execFile }) {
  await run("git", ["rev-parse", "--git-dir"], {
    cwd,
    timeout: 15_000,
    windowsHide: true,
    maxBuffer: 32 * 1024,
  });
}

/**
 * Board-tip evidence for SYNC_REQUIRED (CORE-123). Reads the fetched board
 * checkout's HEAD and, when the attestation recorded a `board_sha`, asks
 * whether it is an ancestor of that tip. Never throws: a board directory that
 * is not a Git checkout degrades to `unrecorded` (nothing to compare) or
 * `unknown` (an attested SHA that cannot be corroborated).
 */
export async function collectBoardEvidence({ boardRoot, attestedSha, capturedSha, run = execFile }) {
  const options = { cwd: boardRoot, timeout: 15_000, windowsHide: true, maxBuffer: 32 * 1024 };
  const attested = attestedSha ? String(attestedSha).trim().toLowerCase() : undefined;
  let sha = null;
  let diagnostic;
  if (capturedSha !== undefined) {
    sha = capturedSha === null ? null : String(capturedSha).trim().toLowerCase();
    if (sha !== null && !FULL_SHA_RE.test(sha)) {
      sha = null;
      diagnostic = "captured board HEAD is not a full Git object id";
    }
  } else {
    try {
      const { stdout } = await run("git", ["rev-parse", "--verify", "HEAD^{commit}"], options);
      sha = String(stdout).trim().toLowerCase();
      if (!FULL_SHA_RE.test(sha)) { sha = null; diagnostic = "board HEAD is not a full Git object id"; }
    } catch (error) {
      diagnostic = String(error?.stderr || error?.message || "board HEAD could not be read").replace(/[\r\n]+/g, " ").slice(0, 240);
    }
  }
  if (!attested) {
    return { sha, state: "unrecorded", ...(diagnostic ? { diagnostic } : {}) };
  }
  if (!FULL_SHA_RE.test(attested)) {
    return { sha, attestedSha: attested, state: "unknown", diagnostic: "attested board_sha is not a full hexadecimal Git object id" };
  }
  if (sha === null) {
    return { sha, attestedSha: attested, state: "unknown", diagnostic: diagnostic ?? "board tip could not be read" };
  }
  try {
    await run("git", ["merge-base", "--is-ancestor", attested, sha], options);
    return { sha, attestedSha: attested, state: "current" };
  } catch (error) {
    const code = typeof error?.code === "number" ? error.code : Number.NaN;
    if (code === 1) return { sha, attestedSha: attested, state: "stale" };
    const reason = String(error?.stderr || error?.message || "git ancestry query failed").replace(/[\r\n]+/g, " ").slice(0, 240);
    return { sha, attestedSha: attested, state: "unknown", diagnostic: reason };
  }
}

export const isFullGitSha = (value) => FULL_SHA_RE.test(String(value));

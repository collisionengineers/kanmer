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

export const isFullGitSha = (value) => FULL_SHA_RE.test(String(value));

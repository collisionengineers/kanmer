import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import matter from "gray-matter";
import {
  DEFAULT_CLAIM_EXPIRY_MINUTES,
  claimState,
  reconcileEvidence,
  type KanmerStore,
  type ReconciliationEvidence,
  type ReconciliationResult,
} from "@kanmer/core";
import { gitCommonDirectory, sameWorktreePath, type ResolvedPath } from "./execution-packet.js";
// This helper also serves the direct check-pr CLI tests. tsup bundles the
// fixed-argv implementation into this production collector.
// @ts-expect-error The executable source helper is JavaScript by design.
import { collectCommitReachabilityFromTarget } from "./git-reachability.mjs";

// Salvaged from PR #286 (CORE-113) and reduced to the read-only inspector
// (CORE-122): no apply surface, bounded subprocesses, common-dir identity,
// and the CORE-121 bootstrap claim contract.

const execFile = promisify(execFileCallback);

/** Every Git/GitHub subprocess is bounded so a stalled host cannot hang the inspector. */
export const GIT_TIMEOUT_MS = 15_000;
export const GH_TIMEOUT_MS = 15_000;
export const GIT_MAX_BUFFER = 32 * 1024;
export const GH_MAX_BUFFER = 1024 * 1024;

export interface ReconciliationRunOptions {
  cwd: string;
  windowsHide: boolean;
  timeout: number;
  maxBuffer: number;
}

export type ReconciliationRun = (
  command: string,
  args: readonly string[],
  options: ReconciliationRunOptions,
) => Promise<{ stdout: string }>;

export type CommonDirResolver = (directory: string) => Promise<ResolvedPath>;

type RequiredChecks = ReconciliationEvidence["pullRequest"]["requiredChecks"];
type PullRequestEvidence = ReconciliationEvidence["pullRequest"];

function gitOptions(cwd: string): ReconciliationRunOptions {
  return { cwd, windowsHide: true, timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER };
}

function ghOptions(cwd: string): ReconciliationRunOptions {
  return { cwd, windowsHide: true, timeout: GH_TIMEOUT_MS, maxBuffer: GH_MAX_BUFFER };
}

function normalPath(value: string): string {
  return path.resolve(value).replace(/[\\/]+$/, "").toLowerCase();
}

function runErrorCode(error: unknown): number | string | undefined {
  const code = (error as { code?: unknown })?.code;
  return typeof code === "number" || typeof code === "string" ? code : undefined;
}

function errorStdout(error: unknown): string | null {
  const value = (error as { stdout?: unknown })?.stdout;
  return typeof value === "string" ? value : null;
}

function validTimestamp(value: unknown): boolean {
  const text = value instanceof Date ? value.toISOString() : value;
  return typeof text === "string" && text.trim().length > 0 && !Number.isNaN(Date.parse(text));
}

/** Decode a complete proof record; an existence-only proof gate is not PASS evidence. */
export function proofEvidence(raw: string | null): ReconciliationEvidence["proof"] {
  if (!raw) return { state: "absent" };
  try {
    const parsed = matter(raw).data;
    if (
      parsed.kind !== "proof-record" ||
      typeof parsed.result !== "string" ||
      typeof parsed.merged_sha !== "string" || !parsed.merged_sha.trim() ||
      typeof parsed.environment !== "string" || !parsed.environment.trim() ||
      !validTimestamp(parsed.verified_at) ||
      !Array.isArray(parsed.attempts)
    ) return { state: "invalid" };
    const result = parsed.result.trim().toUpperCase();
    const mergedSha = parsed.merged_sha.trim();
    if (result === "PASS") return { state: "pass", mergedSha };
    if (result === "FAIL") return { state: "fail", mergedSha };
    return { state: "invalid" };
  } catch {
    return { state: "invalid" };
  }
}

/** Interpret only `gh pr checks --required`; rollup checks can be unrelated. */
export function requiredChecksEvidence(raw: unknown): RequiredChecks {
  if (!Array.isArray(raw)) return "unavailable";
  if (raw.length === 0) return "not-applicable";
  const checks = raw.map((check) => {
    const value = check as { bucket?: unknown; state?: unknown };
    return {
      bucket: typeof value.bucket === "string" ? value.bucket.toLowerCase() : "",
      state: typeof value.state === "string" ? value.state.toLowerCase() : "",
    };
  });
  if (checks.some((check) => check.bucket === "fail" || ["failure", "cancelled", "timed_out", "action_required", "error"].includes(check.state))) return "fail";
  if (checks.some((check) => check.bucket === "pending" || ["pending", "queued", "in_progress", "requested", "waiting"].includes(check.state))) return "pending";
  if (checks.every((check) => check.bucket === "pass" || check.bucket === "skipping" || ["success", "neutral", "skipped"].includes(check.state))) return "pass";
  return "unavailable";
}

export function pullRequestEvidence(raw: unknown, requiredChecks: RequiredChecks): PullRequestEvidence {
  if (!raw || typeof raw !== "object") return { state: "unavailable", requiredChecks: "unavailable" };
  const value = raw as { state?: unknown; headRefOid?: unknown; mergeCommit?: { oid?: unknown } | null };
  const state = value.state === "MERGED" ? "merged" : value.state === "CLOSED" ? "closed-unmerged" : value.state === "OPEN" ? "open" : "unavailable";
  const mergeSha = typeof value.mergeCommit?.oid === "string" && value.mergeCommit.oid ? value.mergeCommit.oid : undefined;
  const headSha = typeof value.headRefOid === "string" && value.headRefOid ? value.headRefOid : undefined;
  return { state, requiredChecks, ...(headSha ? { headSha } : {}), ...(mergeSha ? { mergeSha } : {}) };
}

function selectorForRecordedPr(value: string, repo: string): { key: string; selector: string } | null {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return { key: repo.toLowerCase() + "#" + trimmed, selector: trimmed };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.search || url.hash) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 4 || parts[2] !== "pull" || !/^\d+$/.test(parts[3] ?? "")) return null;
    if (`${parts[0]}/${parts[1]}`.toLowerCase() !== repo.toLowerCase()) return null;
    return { key: repo.toLowerCase() + "#" + parts[3], selector: trimmed };
  } catch {
    return null;
  }
}

async function sourceRepository(store: KanmerStore, run: ReconciliationRun): Promise<string | null> {
  try {
    const { stdout } = await run("gh", ["repo", "view", "--json", "nameWithOwner"], ghOptions(store.paths.repoRoot));
    const name = (JSON.parse(stdout) as { nameWithOwner?: unknown }).nameWithOwner;
    return typeof name === "string" && /^[^/]+\/[^/]+$/.test(name) ? name : null;
  } catch {
    return null;
  }
}

async function requiredChecksFor(store: KanmerStore, selector: string, run: ReconciliationRun): Promise<RequiredChecks> {
  try {
    const { stdout } = await run("gh", ["pr", "checks", selector, "--required", "--json", "state,bucket"], ghOptions(store.paths.repoRoot));
    return requiredChecksEvidence(JSON.parse(stdout));
  } catch (error) {
    // `gh pr checks` exits non-zero when a check failed but still prints JSON.
    // A killed/timed-out child has no trustworthy stdout.
    if ((error as { killed?: unknown })?.killed) return "unavailable";
    const stdout = errorStdout(error);
    if (!stdout) return "unavailable";
    try {
      return requiredChecksEvidence(JSON.parse(stdout));
    } catch {
      return "unavailable";
    }
  }
}

async function collectPullRequestEvidence(store: KanmerStore, refs: readonly string[], run: ReconciliationRun): Promise<PullRequestEvidence> {
  if (refs.length === 0) return { state: "absent", requiredChecks: "not-applicable" };
  const repo = await sourceRepository(store, run);
  if (!repo) return { state: "unavailable", requiredChecks: "unavailable" };
  const candidates = refs.map((reference) => selectorForRecordedPr(reference, repo));
  if (candidates.some((candidate) => candidate === null)) return { state: "unavailable", requiredChecks: "unavailable" };
  const selectorsByKey = new Map<string, { key: string; selector: string }>();
  for (const candidate of candidates as { key: string; selector: string }[]) {
    const existing = selectorsByKey.get(candidate.key);
    // Retain an exact URL when both forms name the same PR; it keeps repository
    // identity in the argv sent to GitHub without treating it as a second PR.
    if (!existing || candidate.selector.includes("://")) selectorsByKey.set(candidate.key, candidate);
  }
  const selectors = [...selectorsByKey.values()];
  const observed: { selector: string; raw: unknown; evidence: PullRequestEvidence }[] = [];
  for (const { selector } of selectors) {
    try {
      const { stdout } = await run("gh", ["pr", "view", selector, "--json", "state,headRefOid,mergeCommit"], ghOptions(store.paths.repoRoot));
      const raw = JSON.parse(stdout);
      observed.push({ selector, raw, evidence: pullRequestEvidence(raw, "unavailable") });
    } catch {
      return { state: "unavailable", requiredChecks: "unavailable" };
    }
  }
  const exactly = (state: PullRequestEvidence["state"]) => observed.filter((entry) => entry.evidence.state === state);
  const open = exactly("open");
  const merged = exactly("merged");
  const closed = exactly("closed-unmerged");
  const selected = open.length === 1 ? open[0]
    : open.length > 1 ? undefined
      : merged.length === 1 ? merged[0]
        : merged.length > 1 ? undefined
          : closed.length === 1 ? closed[0]
            : undefined;
  if (!selected) return { state: "unavailable", requiredChecks: "unavailable" };
  return pullRequestEvidence(selected.raw, await requiredChecksFor(store, selected.selector, run));
}

/**
 * Observe the recorded worktree without touching it. Repository identity is
 * proven by comparing physical `--git-common-dir` paths, the same rule
 * execution-packet uses for resume, so a linked `.worktrees/<id>` checkout is
 * `matches-claim` rather than a foreign repository.
 */
export async function workspaceEvidence(
  store: KanmerStore,
  worktree: string | undefined,
  branch: string | undefined,
  run: ReconciliationRun,
  stat: typeof fs.stat = fs.stat,
  resolveCommonDir: CommonDirResolver = gitCommonDirectory,
): Promise<ReconciliationEvidence["workspace"]> {
  if (!worktree) return { state: "not-recorded", recordedWorktree: null, claimIdentity: "not-applicable" };
  const candidate = path.resolve(store.paths.repoRoot, worktree);
  if (normalPath(candidate) === normalPath(store.paths.projectRoot)) return { state: "unavailable", recordedWorktree: worktree, boardWorktree: true, claimIdentity: "unavailable" };
  try {
    await stat(candidate);
  } catch (error) {
    return {
      state: runErrorCode(error) === "ENOENT" ? "missing" : "unavailable",
      recordedWorktree: worktree,
      claimIdentity: "unavailable",
    };
  }
  let status: string;
  try {
    ({ stdout: status } = await run("git", ["-C", candidate, "status", "--porcelain"], gitOptions(store.paths.repoRoot)));
  } catch {
    return { state: "unavailable", recordedWorktree: worktree, claimIdentity: "unavailable" };
  }
  const [candidateGit, sourceGit] = await Promise.all([resolveCommonDir(candidate), resolveCommonDir(store.paths.repoRoot)]);
  let claimIdentity: ReconciliationEvidence["workspace"]["claimIdentity"];
  if (!candidateGit.ok || !sourceGit.ok) claimIdentity = "unavailable";
  else if (!sameWorktreePath(candidateGit.path, sourceGit.path)) claimIdentity = "foreign-repository";
  else if (!branch) claimIdentity = "branch-mismatch";
  else {
    try {
      const { stdout } = await run("git", ["-C", candidate, "symbolic-ref", "--quiet", "--short", "HEAD"], gitOptions(store.paths.repoRoot));
      claimIdentity = stdout.trim() === branch ? "matches-claim" : "branch-mismatch";
    } catch (error) {
      claimIdentity = runErrorCode(error) === 1 ? "detached" : "unavailable";
    }
  }
  return { state: status.trim() ? "dirty" : "clean", recordedWorktree: worktree, claimIdentity };
}

async function commitEvidence(commits: readonly string[], pullRequest: PullRequestEvidence, store: KanmerStore, run: ReconciliationRun): Promise<ReconciliationEvidence["commits"]> {
  const values = [...commits];
  if (values.length === 0 || pullRequest.state !== "merged" || !pullRequest.mergeSha) return { values, reachability: "not-applicable" };
  try {
    const results = await collectCommitReachabilityFromTarget({
      commits: values,
      targetSha: pullRequest.mergeSha,
      cwd: store.paths.repoRoot,
      run: (command: string, args: readonly string[]) => run(command, args, gitOptions(store.paths.repoRoot)),
    });
    if (results.some((result: { state: string }) => result.state === "unreachable")) return { values, reachability: "unreachable" };
    if (results.every((result: { state: string }) => result.state === "reachable")) return { values, reachability: "reachable" };
    return { values, reachability: "unavailable" };
  } catch {
    return { values, reachability: "unavailable" };
  }
}

export async function collectReconciliationEvidence(
  store: KanmerStore,
  id: string,
  run: ReconciliationRun = execFile,
  options: { now?: Date; resolveCommonDir?: CommonDirResolver } = {},
): Promise<ReconciliationEvidence> {
  const item = await store.getItem(id);
  if (!item || item.type !== "ticket") throw new Error(`No ticket with id "${id}"`);
  const board = await store.getBoard();
  const claimMinutes = board.claimExpiryMinutes ?? DEFAULT_CLAIM_EXPIRY_MINUTES;
  const now = options.now ?? new Date();
  const state = claimState(item, now, claimMinutes);
  const pullRequest = await collectPullRequestEvidence(store, item.prs ?? [], run);
  return {
    ticket: { id: item.id, status: item.status, updated: item.updated, taken: Boolean(item.taken_at || item.branch || item.worktree) },
    // Same derivation as get_execution_packet's claim block (CORE-121).
    claim: {
      state: state === "live" ? "current" : state,
      controller: item.claim_controller ?? (item.assignee || null),
      worker: item.assignee || null,
      takenAt: item.taken_at ?? null,
      expiresAt: item.claim_expires_at
        ?? (item.taken_at ? new Date(Date.parse(item.taken_at) + claimMinutes * 60_000).toISOString() : null),
      branch: item.branch ?? null,
      worktree: item.worktree ?? null,
      reviewRound: item.review_round ?? 0,
      remediationBudget: item.remediation_budget ?? 1,
    },
    commits: await commitEvidence(item.commits ?? [], pullRequest, store, run),
    pullRequest,
    proof: proofEvidence(await store.getDoc(id, "proof")),
    workspace: await workspaceEvidence(store, item.worktree, item.branch, run, fs.stat, options.resolveCommonDir),
    // CORE-116 owns persisted release attempts. This collector must never
    // manufacture a neutral observation for evidence it cannot inspect.
    release: { state: "not-applicable" },
  };
}

/** Read-only: collects evidence and classifies it. Never writes to the store. */
export async function reconcileTicket(
  store: KanmerStore,
  id: string,
  run?: ReconciliationRun,
  options?: { now?: Date; resolveCommonDir?: CommonDirResolver },
): Promise<ReconciliationResult> {
  return reconcileEvidence(await collectReconciliationEvidence(store, id, run, options));
}

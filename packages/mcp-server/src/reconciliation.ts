import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import matter from "gray-matter";
import {
  reconcileEvidence,
  type KanmerStore,
  type ReconciliationEvidence,
  type ReconciliationResult,
} from "@kanmer/core";

const execFile = promisify(execFileCallback);

export type ReconciliationRun = (
  command: string,
  args: readonly string[],
  options: { cwd: string; windowsHide: boolean },
) => Promise<{ stdout: string }>;

function normalPath(value: string): string {
  return path.resolve(value).replace(/[\\/]+$/, "").toLowerCase();
}

function prNumber(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const url = /\/pull\/(\d+)\/?$/.exec(trimmed);
  return url?.[1] ?? null;
}

export function proofEvidence(raw: string | null): ReconciliationEvidence["proof"] {
  if (!raw) return { state: "absent" };
  try {
    const parsed = matter(raw).data;
    if (parsed.kind !== "proof-record" || typeof parsed.result !== "string") return { state: "invalid" };
    const result = parsed.result.trim().toUpperCase();
    if (result === "PASS") return { state: "pass", ...(typeof parsed.merged_sha === "string" ? { mergedSha: parsed.merged_sha } : {}) };
    if (result === "FAIL") return { state: "fail", ...(typeof parsed.merged_sha === "string" ? { mergedSha: parsed.merged_sha } : {}) };
    return { state: "invalid" };
  } catch {
    return { state: "invalid" };
  }
}

export function pullRequestEvidence(raw: unknown): ReconciliationEvidence["pullRequest"] {
  if (!raw || typeof raw !== "object") return { state: "unavailable", requiredChecks: "unavailable" };
  const value = raw as { state?: unknown; headRefOid?: unknown; mergeCommit?: { oid?: unknown } | null; statusCheckRollup?: unknown };
  const state = value.state === "MERGED" ? "merged" : value.state === "CLOSED" ? "closed-unmerged" : value.state === "OPEN" ? "open" : "unavailable";
  const checks = Array.isArray(value.statusCheckRollup) ? value.statusCheckRollup : null;
  let requiredChecks: ReconciliationEvidence["pullRequest"]["requiredChecks"] = "unavailable";
  if (checks && checks.length > 0) {
    const conclusions = checks.map((check) => {
      const c = check as { status?: unknown; conclusion?: unknown };
      return { status: typeof c.status === "string" ? c.status.toUpperCase() : "", conclusion: typeof c.conclusion === "string" ? c.conclusion.toUpperCase() : "" };
    });
    if (conclusions.some((check) => ["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED"].includes(check.conclusion))) requiredChecks = "fail";
    else if (conclusions.every((check) => check.status === "COMPLETED" && ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(check.conclusion))) requiredChecks = "pass";
    else requiredChecks = "pending";
  }
  const mergeSha = typeof value.mergeCommit?.oid === "string" && value.mergeCommit.oid ? value.mergeCommit.oid : undefined;
  const headSha = typeof value.headRefOid === "string" && value.headRefOid ? value.headRefOid : undefined;
  return { state, requiredChecks, ...(headSha ? { headSha } : {}), ...(mergeSha ? { mergeSha } : {}) };
}

async function workspaceEvidence(store: KanmerStore, worktree: string | undefined, run: ReconciliationRun): Promise<ReconciliationEvidence["workspace"]> {
  if (!worktree) return { state: "not-recorded", recordedWorktree: null };
  const candidate = path.resolve(store.paths.repoRoot, worktree);
  if (normalPath(candidate) === normalPath(store.paths.projectRoot)) return { state: "unavailable", recordedWorktree: worktree, boardWorktree: true };
  try {
    await fs.stat(candidate);
  } catch {
    return { state: "missing", recordedWorktree: worktree };
  }
  try {
    const { stdout } = await run("git", ["-C", candidate, "status", "--porcelain"], { cwd: store.paths.repoRoot, windowsHide: true });
    return { state: stdout.trim() ? "dirty" : "clean", recordedWorktree: worktree };
  } catch {
    return { state: "unavailable", recordedWorktree: worktree };
  }
}

export async function collectReconciliationEvidence(
  store: KanmerStore,
  id: string,
  run: ReconciliationRun = execFile,
): Promise<ReconciliationEvidence> {
  const item = await store.getItem(id);
  if (!item || item.type !== "ticket") throw new Error(`No ticket with id "${id}"`);
  const firstPr = item.prs?.[0];
  let pullRequest: ReconciliationEvidence["pullRequest"];
  if (!firstPr) {
    pullRequest = { state: "absent", requiredChecks: "not-applicable" };
  } else {
    const number = prNumber(firstPr);
    if (!number) pullRequest = { state: "unavailable", requiredChecks: "unavailable" };
    else {
      try {
        const { stdout } = await run("gh", ["pr", "view", number, "--json", "state,headRefOid,mergeCommit,statusCheckRollup"], { cwd: store.paths.repoRoot, windowsHide: true });
        pullRequest = pullRequestEvidence(JSON.parse(stdout));
      } catch {
        pullRequest = { state: "unavailable", requiredChecks: "unavailable" };
      }
    }
  }
  return {
    ticket: { id: item.id, status: item.status, updated: item.updated, taken: Boolean(item.taken_at || item.branch || item.worktree) },
    claim: {
      state: item.taken_at || item.branch || item.worktree ? "legacy" : "unclaimed",
      controller: null,
      worker: item.assignee || null,
      takenAt: item.taken_at ?? null,
      branch: item.branch ?? null,
      worktree: item.worktree ?? null,
    },
    commits: [...(item.commits ?? [])],
    pullRequest,
    proof: proofEvidence(await store.getDoc(id, "proof")),
    workspace: await workspaceEvidence(store, item.worktree, run),
    // CORE-116 owns persisted release state. CORE-113 reports a stable neutral
    // value until that successor makes release evidence observable.
    release: { state: "none" },
  };
}

export async function reconcileTicket(store: KanmerStore, id: string, run?: ReconciliationRun): Promise<ReconciliationResult> {
  return reconcileEvidence(await collectReconciliationEvidence(store, id, run));
}

export async function applyReconciliation(
  store: KanmerStore,
  input: { id: string; expectedUpdated: string; proposalId: string },
  run?: ReconciliationRun,
) {
  const result = await reconcileTicket(store, input.id, run);
  if (!result.proposal || result.proposal.id !== input.proposalId) {
    throw new Error("Conflict: reconciliation evidence no longer matches the proposed action. Re-run reconcile_ticket before apply.");
  }
  if (result.proposal.ticketUpdated !== input.expectedUpdated) {
    throw new Error("Conflict: reconciliation ticket revision changed. Re-run reconcile_ticket before apply.");
  }
  const item = await store.applyReconciliation(input.id, { expectedUpdated: input.expectedUpdated, proposal: result.proposal });
  return { result, item };
}

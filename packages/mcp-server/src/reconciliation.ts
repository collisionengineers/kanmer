import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  classifyReleaseEvidence,
  leaseConfig,
  leaseState,
  parseProofDocument,
  reconcileEvidence,
  reconcileStepPacket,
  revisionCountsDocument,
  extractAtxSection,
  parsePlan,
  stepChecklistSnapshot,
  stepPacketAuthority,
  stepTicketAuthority,
  verifyStepPacket,
  type KanmerStore,
  type LeaseRecoveryEvidence,
  type ReconciliationApplyResult,
  type ReconciliationEvidence,
  type ReconciliationFailureClass,
  type ReconciliationResult,
  type StepPacketProject,
  type StepReconciliationResult,
} from "@kanmer/core";
import { KanmerError } from "./errors.js";
import { EXECUTION_STOP_FALLBACK, gitCommonDirectory, sameWorktreePath, type ResolvedPath } from "./execution-packet.js";
import { collectStepDocumentSnapshot, collectWorkspaceSnapshot, stepDocumentSnapshotAuthority, type StepGitRun } from "./step-reconciliation.js";
export {
  collectStepDocumentSnapshot,
  collectWorkspaceSnapshot,
  parseIndexFlagCensus,
  parseRawHistoryZ,
  parseNameStatusZ,
  parsePorcelainV1Z,
  physicalExecutableModeAgreesWithIndex,
  readBoundedWorkspaceFile,
  stepDocumentSnapshotAuthority,
} from "./step-reconciliation.js";
// This helper also serves the direct check-pr CLI tests. tsup bundles the
// fixed-argv implementation into this production collector.
// @ts-expect-error The executable source helper is JavaScript by design.
import { collectCommitReachabilityFromTarget } from "./git-reachability.mjs";

// Salvaged from PR #286 (CORE-113) and reduced to the read-only inspector
// (CORE-122): bounded subprocesses, common-dir identity, and the CORE-121
// bootstrap claim contract. CORE-131 added the apply half at the bottom of
// this file — it re-collects through the SAME reconcileTicket the dry run
// used, so re-collection cannot drift from what was reported, and it runs
// entirely OUTSIDE the board write lock because it spawns git/gh
// (AGENTS.md §8 item 17). The only mutation is store.applyReconciliation,
// whose verbs take the lock themselves.

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

const FAILURE_CLASSES: readonly ReconciliationFailureClass[] = ["implementation", "plan", "transient", "inconclusive"];

/**
 * Decode a non-PASS proof record's `failure_class` (SKILL-037). A record that
 * names no class, or one this build does not recognise, is `inconclusive` —
 * `kanmer-verify/SKILL.md` makes that the explicit default and states that a
 * proof naming no class is never treated as retryable.
 */
function failureClassOf(raw: unknown): ReconciliationFailureClass {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (FAILURE_CLASSES as readonly string[]).includes(value)
    ? (value as ReconciliationFailureClass)
    : "inconclusive";
}

/**
 * Decode a complete proof record for the reconciliation classifier.
 *
 * CORE-129 replaced this function's own frontmatter decoder with the shared
 * core parser (`parseProofDocument`). The point is not deduplication for its
 * own sake: while there were two decoders, the movement gate and this inspector
 * could — and did — disagree about whether the very same document was
 * acceptable, and disagreement between two readers of one document is exactly
 * the failure mode a single authority exists to remove.
 *
 * `legacy` maps to `invalid` here **regardless of the board's report/strict
 * policy**, and that is deliberate: this function feeds a *recommendation to
 * move a ticket to Done*, and a proof nothing has ever validated is not a basis
 * for a machine to recommend that. Report mode still lets a human make the move
 * themselves — it relaxes the gate, not the advice. The parsed state travels
 * along in `record` so the read-only inspector can say which kind of "no" it is.
 */
export function proofEvidence(raw: string | null): ReconciliationEvidence["proof"] {
  if (!raw) return { state: "absent" };
  const record = parseProofDocument(raw);
  const summary = { record: { state: record.state, diagnostics: record.diagnostics } };
  if (record.state === "legacy" || record.state === "invalid") return { state: "invalid", ...summary };

  // Receipts (MCP-057) travel with the evidence exactly as before. An empty
  // list is omitted, matching every proof written before MCP-057.
  const receipts = record.receipts.length > 0 ? record.receipts : undefined;

  // An operator waiver satisfies the *gate* — kanmer-verify has always said a
  // waiver permits the final move — but it is a decision a person took, so
  // reconciliation declines to recommend it on their behalf.
  if (record.waived) return { state: "invalid", ...summary };

  if (record.state === "valid-pass") {
    return { state: "pass", mergedSha: record.mergedSha, ...(receipts ? { receipts } : {}), ...summary };
  }
  if (record.state === "valid-fail") {
    // A PASS record carries no class; only a failure is routed by one, and the
    // parser has already refused any FAIL that names none.
    return {
      state: "fail",
      mergedSha: record.mergedSha,
      failureClass: failureClassOf(record.failureClass),
      ...(receipts ? { receipts } : {}),
      ...summary,
    };
  }
  // valid-inconclusive: a truthful record, and not a route. It is reported as
  // a `fail`/`inconclusive` pair rather than `invalid` so the classifier
  // reaches its existing `VERIFICATION_INCONCLUSIVE` finding — "the ticket
  // stays in Verifying until the proof names a class" — which says something
  // useful, where `invalid` would say only that the document is unreadable.
  // It still recommends no move, exactly as before.
  return {
    state: "fail",
    mergedSha: record.mergedSha,
    failureClass: "inconclusive",
    ...(receipts ? { receipts } : {}),
    ...summary,
  };
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
  const now = options.now ?? new Date();
  const lease = leaseState(item, now, leaseConfig(board));
  const state = lease.state;
  const pullRequest = await collectPullRequestEvidence(store, item.prs ?? [], run);
  return {
    ticket: { id: item.id, status: item.status, updated: item.updated, taken: Boolean(item.taken_at || item.branch || item.worktree) },
    // Same derivation as get_execution_packet's claim block (CORE-121).
    claim: {
      state: state === "live" ? "current" : state,
      controller: item.claim_controller ?? (item.assignee || null),
      worker: item.assignee || null,
      takenAt: item.taken_at ?? null,
      expiresAt: lease.expiresAt,
      branch: item.branch ?? null,
      worktree: item.worktree ?? null,
      reviewRound: item.review_round ?? 0,
      remediationBudget: item.remediation_budget ?? 1,
      // Lease record (CORE-115): null on a legacy claim.
      leaseId: item.lease_id ?? null,
      leaseRevision: item.lease_revision ?? null,
      heartbeatAt: item.lease_heartbeat_at ?? null,
      phase: item.lease_phase ?? null,
      legacy: lease.legacy,
    },
    commits: await commitEvidence(item.commits ?? [], pullRequest, store, run),
    pullRequest,
    proof: proofEvidence(await store.getDoc(id, "proof")),
    workspace: await workspaceEvidence(store, item.worktree, item.branch, run, fs.stat, options.resolveCommonDir),
    // Persisted release attempts (CORE-132, FRD-031). Read from
    // `.kanmer/releases/` with plain fs reads — outside every lock, like every
    // other evidence read here — and classified by the pure core function that
    // owns the mapping. `readReleaseSnapshot` never throws: a record it cannot
    // read sets `unreadable`, which classifies as `unavailable`, so this
    // collector still never manufactures a neutral observation for evidence it
    // cannot inspect.
    release: classifyReleaseEvidence(await store.releaseSnapshot(), id),
  };
}

/**
 * The FRD-030 reclaim re-read, reduced to what the store records on a
 * transfer: workspace state and identity, PR state, commit count and proof.
 * Pure — the caller collects the evidence; nothing here mutates anything.
 */
export function leaseRecoverySummary(evidence: ReconciliationEvidence): LeaseRecoveryEvidence {
  return {
    workspace: evidence.workspace.state,
    claimIdentity: evidence.workspace.claimIdentity,
    boardWorktree: evidence.workspace.boardWorktree === true,
    pullRequest: evidence.pullRequest.state,
    commits: evidence.commits.values.length,
    proof: evidence.proof.state,
  };
}

/**
 * Read-only: collects evidence, classifies it, and stamps the recommendation
 * with the ticket's document-inclusive revision. Never writes to the store.
 *
 * The stamp is what makes an apply bindable. Core's classifier cannot compute
 * a revision (it never touches a store), so the collector — the only place
 * that holds one — supplies it here. Because the revision covers every
 * pipeline document, a proof rewritten between this call and an apply changes
 * it, which is the direct fix for CORE-113's F-015.
 */
export type TicketReconciliationResult =
  | (ReconciliationResult & { step?: StepReconciliationResult })
  | { evidence: null; findings: []; recommendation: null; step: StepReconciliationResult };

// Only failures proving that the packet never had authority for this live
// request may stop before workspace inspection. Worker-result failures are
// deliberately absent: they still need the actual changed-path evidence so a
// controller cannot issue another packet on a partial or deviating result.
function preGitAuthorityFailure(findings: readonly { code: string }[]): boolean {
  const codes = new Set(findings.map((finding) => finding.code));
  return codes.has("STEP_IDENTITY_MISMATCH") ||
    codes.has("STEP_PLAN_AUTHORITY_MISMATCH");
}

export async function reconcileTicket(
  store: KanmerStore,
  id: string,
  run?: ReconciliationRun,
  options?: {
    now?: Date;
    resolveCommonDir?: CommonDirResolver;
    stepPacket?: unknown;
    stepProject?: StepPacketProject;
    stepRun?: StepGitRun;
  },
): Promise<TicketReconciliationResult> {
  const packetVerification = options?.stepPacket === undefined ? null : verifyStepPacket(options.stepPacket);
  const invalidStep = packetVerification && !packetVerification.ok
    ? { status: "inconclusive" as const, packetId: null, changedPaths: [], findings: [{ code: "STEP_PACKET_INVALID", message: packetVerification.reason }] }
    : null;
  const stable = packetVerification?.ok ? await collectStepDocumentSnapshot(store, id) : null;
  const currentDocuments = stable?.ok
    ? stable.snapshot.inventory
      .filter((document) => revisionCountsDocument(document.doc))
      .map((document) => ({ path: document.doc, version: document.version! }))
      .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    : [];
  let preflight: StepReconciliationResult | null = null;
  let planDoc: Awaited<ReturnType<KanmerStore["getDocsWithVersions"]>>[number] | undefined;
  let checklistDoc: Awaited<ReturnType<KanmerStore["getDocsWithVersions"]>>[number] | undefined;
  let parsed = parsePlan("");
  let stopCondition = EXECUTION_STOP_FALLBACK;
  let provenanceBlocksStepObservation = false;
  if (packetVerification?.ok && stable?.ok) {
    planDoc = stable.snapshot.fixed.find((doc) => doc.doc === "plan");
    checklistDoc = stable.snapshot.fixed.find((doc) => doc.doc === "checklist");
    parsed = parsePlan(planDoc?.content ?? "");
    stopCondition = (planDoc?.content && extractAtxSection(planDoc.content, "Stop condition")) || EXECUTION_STOP_FALLBACK;
    preflight = reconcileStepPacket(packetVerification.packet, {
      project: options?.stepProject ?? packetVerification.packet.project,
      ticket: { id: stable.snapshot.item.id, revision: stable.snapshot.revision, itemAuthority: stepTicketAuthority(stable.snapshot.item), documents: currentDocuments },
      batch: stable.snapshot.batchId,
      plan: {
        path: "plan/plan.md",
        version: planDoc?.version ?? null,
        authority: stepPacketAuthority(parsed, packetVerification.packet.step.index, stopCondition),
      },
      checklist: stepChecklistSnapshot(parsed, checklistDoc?.content ?? null, "checklist/checklist.md", checklistDoc?.version ?? null),
      evidence: stable.snapshot.evidence,
      workspace: null,
    });
    // Packet-provenance failures are conclusive without Git or GitHub. Worker
    // result failures (including checklist deviations) deliberately continue
    // so actual workspace changes are still classified before any successor.
    if (preGitAuthorityFailure(preflight.findings)) {
      provenanceBlocksStepObservation = true;
    }
  }
  const result = reconcileEvidence(await collectReconciliationEvidence(store, id, run, options));
  let withRevision: ReconciliationResult = result;
  if (result.recommendation) {
    const revision = await store.getRevision(id);
    withRevision = {
      ...result,
      recommendation: { ...result.recommendation, ticketId: id, revision: revision?.revision ?? null },
    };
  }
  if (packetVerification === null) return withRevision;
  if (!packetVerification.ok) return { ...withRevision, step: invalidStep! };
  if (provenanceBlocksStepObservation) return { ...withRevision, step: preflight! };

  if (!stable?.ok) {
    const reason = stable && !stable.ok ? stable.reason : "the bounded ticket/document authority snapshot is unavailable";
    return {
      ...withRevision,
      step: {
        status: "inconclusive",
        packetId: packetVerification.packet.packetId,
        changedPaths: [],
        findings: [{
          code: "STEP_AUTHORITY_UNAVAILABLE",
          message: `The bounded ticket, document, group and batch authority snapshot is unavailable. ${reason}`,
        }],
      },
    };
  }
  const workspace = stable.snapshot.item.worktree && stable.snapshot.item.branch
    ? await collectWorkspaceSnapshot({
        repoRoot: store.paths.repoRoot,
        boardRoot: store.paths.projectRoot,
        worktree: stable.snapshot.item.worktree,
        branch: stable.snapshot.item.branch,
        baseline: packetVerification.packet.workspace,
        ...(options?.stepRun ? { run: options.stepRun } : {}),
      })
    : null;
  const confirmedStable = await collectStepDocumentSnapshot(store, id);
  const confirmedWorkspace = stable.snapshot.item.worktree && stable.snapshot.item.branch
    ? await collectWorkspaceSnapshot({
        repoRoot: store.paths.repoRoot,
        boardRoot: store.paths.projectRoot,
        worktree: stable.snapshot.item.worktree,
        branch: stable.snapshot.item.branch,
        baseline: packetVerification.packet.workspace,
        ...(options?.stepRun ? { run: options.stepRun } : {}),
      })
    : null;
  if (!confirmedStable.ok ||
      JSON.stringify(stepDocumentSnapshotAuthority(confirmedStable.snapshot)) !== JSON.stringify(stepDocumentSnapshotAuthority(stable.snapshot)) ||
      JSON.stringify(confirmedWorkspace) !== JSON.stringify(workspace)) {
    return {
      ...withRevision,
      step: {
        status: "inconclusive",
        packetId: packetVerification.packet.packetId,
        changedPaths: [],
        findings: [{ code: "STEP_SNAPSHOT_UNSTABLE", message: "Ticket, document, group, batch or workspace facts changed during the bounded composite sample." }],
      },
    };
  }
  const reconciledStep = reconcileStepPacket(packetVerification.packet, {
    project: options?.stepProject ?? packetVerification.packet.project,
    ticket: { id: stable.snapshot.item.id, revision: stable.snapshot.revision, itemAuthority: stepTicketAuthority(stable.snapshot.item), documents: currentDocuments },
    batch: stable.snapshot.batchId,
    plan: {
      path: "plan/plan.md",
      version: planDoc?.version ?? null,
      authority: stepPacketAuthority(parsed, packetVerification.packet.step.index, stopCondition),
    },
    checklist: stepChecklistSnapshot(parsed, checklistDoc?.content ?? null, "checklist/checklist.md", checklistDoc?.version ?? null),
    evidence: stable.snapshot.evidence,
    workspace: workspace?.ok ? { snapshot: workspace.snapshot, headChanges: workspace.headChanges } : null,
  });
  const step = workspace && !workspace.ok
    ? {
        ...reconciledStep,
        findings: reconciledStep.findings.map((finding) => finding.code === "STEP_WORKSPACE_UNAVAILABLE"
          ? { ...finding, message: `${finding.message} ${workspace.reason}` }
          : finding),
      }
    : reconciledStep;
  return {
    ...withRevision,
    step,
  };
}

/** Everything an explicit apply needs beyond the freshly re-collected recommendation. */
export interface ApplyReconciliationInput {
  id: string;
  /** The `revision` from the recommendation being applied. Required. */
  expectedRevision: string;
  /** Passed through to the existing backward-move contract, which judges it. */
  reason?: string;
  /** Durable controller identity recorded by a claim recovery. */
  controller?: string;
  /** Who the audit line names; defaults to the store's activity actor. */
  actor?: string;
}

export interface ApplyReconciliationResult extends ReconciliationApplyResult {
  /** The re-collected dry run the apply acted on, returned in full. */
  result: ReconciliationResult;
}

/**
 * Apply the recommendation a ticket's CURRENT evidence supports, and only
 * while it is still current (FRD-028 acceptance 2). The order is fixed:
 *
 * 1. Finish at most one already-authorised, bounded release transaction under
 *    the board write lock. This is crash recovery, not new release authority;
 *    the read-only inspector remains mutation-free.
 * 2. Re-collect and re-classify through the same `reconcileTicket` the dry run
 *    used, so re-collection cannot drift from what was reported. This spawns
 *    git/gh and therefore runs outside every lock.
 * 3. Refuse RECONCILIATION_INCONCLUSIVE when there is no recommendation. That
 *    is a normal refusal — `transient` and `inconclusive` verification
 *    failures deliberately recommend nothing.
 * 4. Refuse REVISION_CONFLICT when the freshly-collected revision is not the
 *    one the caller is applying, quoting both. A legacy-layout ticket has no
 *    revision and cannot be reconciled safely at all.
 * 5. Refuse RECONCILIATION_DRIFT when the board moved under the collection
 *    itself — the recorded revision or stage is no longer what was classified,
 *    so the fresh action no longer describes the ticket. Belt and braces: a
 *    revision match should already make this unreachable, and the verb's own
 *    CAS would refuse it regardless.
 * 6. Delegate to `store.applyReconciliation`, which brackets the lock-free
 *    release snapshot with its constant-size transaction epoch, rechecks that
 *    epoch under the board write lock, then re-checks ticket preconditions and
 *    passes `expectedRevision` into the re-entrant locked verb.
 *
 * A refusal never changes the ticket or writes a reconciliation audit line.
 * Step 1 may still finish evidence already authorised by a prior release verb;
 * that durable crash recovery is intentionally independent of the ticket CAS.
 */
export async function applyReconciliation(
  store: KanmerStore,
  input: ApplyReconciliationInput,
  run?: ReconciliationRun,
  options?: { now?: Date; resolveCommonDir?: CommonDirResolver },
): Promise<ApplyReconciliationResult> {
  // A prior release writer may have crashed after publishing its recoverable
  // epoch. Complete that already-authorised write set before the fresh inspector
  // classifies it; otherwise apply would stop at "no recommendation" and no
  // release verb might ever arrive to recover the journal.
  await store.recoverPendingReleaseForWrite();
  const result = await reconcileTicket(store, input.id, run, options);
  const recommendation = result.recommendation;
  if (!recommendation) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RECONCILIATION_INCONCLUSIVE: "${input.id}" has no current reconciliation recommendation ` +
        `(${result.findings.map((entry) => entry.code).join(", ") || "no findings"}); there is nothing to apply.`,
    );
  }
  if (recommendation.revision === null) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RECONCILIATION_INCONCLUSIVE: "${input.id}" is a legacy-layout ticket with no document-inclusive revision; ` +
        `it cannot be reconciled safely. Migrate the board first.`,
    );
  }
  if (recommendation.revision !== input.expectedRevision) {
    // The `Conflict:` prefix is the classified REVISION_CONFLICT wording every
    // other CAS refusal in this server uses.
    throw new KanmerError(
      "REVISION_CONFLICT",
      `Conflict: "${input.id}" revision changed since the recommendation was read ` +
        `(revision is now ${recommendation.revision}, you expected ${input.expectedRevision}). ` +
        `Re-run reconcile_ticket and apply the recommendation it returns.`,
    );
  }
  const current = await store.getRevision(input.id);
  const item = await store.getItem(input.id);
  if (current?.revision !== recommendation.revision || item?.status !== result.evidence.ticket.status) {
    throw new KanmerError(
      "RECONCILIATION_DRIFT",
      `RECONCILIATION_DRIFT: "${input.id}" changed while its evidence was being collected ` +
        `(revision ${recommendation.revision} → ${current?.revision ?? "(none)"}, ` +
        `stage ${result.evidence.ticket.status} → ${item?.status ?? "(none)"}); ` +
        `the ${recommendation.action} recommendation no longer describes it. Re-run reconcile_ticket.`,
    );
  }
  const applied = await store.applyReconciliation(input.id, {
    action: recommendation.action,
    ...(recommendation.targetStatus !== undefined ? { targetStatus: recommendation.targetStatus } : {}),
    expectedRevision: input.expectedRevision,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.controller !== undefined ? { controller: input.controller } : {}),
    ...(input.actor !== undefined ? { actor: input.actor } : {}),
    recovery: leaseRecoverySummary(result.evidence),
  });
  return { ...applied, result };
}

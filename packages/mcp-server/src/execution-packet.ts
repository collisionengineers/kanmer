import type {
  ClaimState,
  DeliveryPolicy,
  DeliveryPolicySource,
  DeliveryState,
  GateReport,
  Item,
  KanmerStore,
  PlanValidation,
  StepPacket,
  StepPacketEvidence,
  TicketDocumentWithVersion,
} from "@kanmer/core";
import {
  CAPTURE_PROFILE_ID,
  compileStepPacket,
  contentVersion,
  deliveryPolicySource,
  deliveryTargets,
  extractAtxSection,
  isCaptureItem,
  leaseConfig,
  leaseState,
  parsePlan,
  resolveDelivery,
  validatePlan,
} from "@kanmer/core";
import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ProjectIdentity } from "./project-identity.js";
import { canonicalProjectPath } from "./project-identity.js";
import { readTicketDocuments } from "./ticket-docs.js";

const execFileAsync = promisify(execFile);

export const EXECUTION_STOP_FALLBACK = "Stop at the checklist; do not merge; do not start another ticket.";
export const EXECUTION_COMMANDS_FALLBACK =
  "Use only the commands named in the plan/checklist, record exact exit codes, and stop on a failure.";

export interface ExecutionPacketDocument {
  exists: boolean;
  content: string | null;
  version: string | null;
}

export interface ExecutionPacketExtraDoc {
  path: string;
  version: string;
}

export interface ExecutionPacketGroupContext {
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  context: string | null;
  /**
   * Content version of `context.md` — the shared-research evidence layer
   * FRD-033 keeps distinct from this ticket's own impact research. Null when
   * the group has no context document.
   */
  version: string | null;
  warning?: string;
}

export interface ExecutionPacketTicket {
  id: string;
  title: string;
  status: string;
  profile: string;
  area: string | null;
  groups: string[] | null;
  refs: string[] | null;
  body: string;
  /**
   * The document-inclusive revision (FRD-029/CORE-114) this packet was built
   * from: the CAS token a worker's first write names, and the anchor a
   * controller compares before dispatching another step.
   */
  revision: string | null;
  /**
   * Workspace this packet authorises. An untaken frozen batch member receives
   * the immutable manifest branch/worktree here before it acquires its own
   * lease; `taken` remains null until that acquisition actually happens.
   */
  workspace: { branch: string | null; worktree: string | null };
  taken: {
    taken_at: string;
    assignee: string | null;
    branch: string | null;
    worktree: string | null;
  } | null;
}

export interface ExecutionPacketCompactTicket {
  id: string;
  title: string;
  status: string;
  profile: string;
  area: string | null;
  groups: string[] | null;
  refs: string[] | null;
  taken: ExecutionPacketTicket["taken"];
}

/** Bootstrap claim facts (CORE-121) so a resumed remediation knows its owner and budget. */
export interface ExecutionPacketClaim {
  state: ClaimState;
  expiresAt: string | null;
  controller: string | null;
  reviewRound: number;
  remediationBudget: number;
  /** Lease record (CORE-115, FRD-030): what a worker names on every renew. Null on a legacy claim. */
  leaseId: string | null;
  leaseRevision: number | null;
  phase: string | null;
  workspace: string | null;
  heartbeatAt: string | null;
  /** True for a CORE-121 / v0.3.12 claim not yet migrated to a lease. */
  legacy: boolean;
  /** Explicit timing (FRD-030): renew at least every heartbeatMinutes; the lease expires after expiryMinutes. */
  heartbeatMinutes: number;
  expiryMinutes: number;
  commandMaxMinutes: number;
  /**
   * Batch workspace (CORE-124, FRD-030): null in isolated mode. Members share
   * one worktree, branch and PR/head attestation; each keeps its own proof.
   * `pending` are the members not yet Done or archived — cleanup waits for them.
   */
  batch: {
    id: string;
    frozenAt: string | null;
    /** Immutable manifest branch shared by every member. */
    branch: string | null;
    workspace: string | null;
    members: string[];
    pending: string[];
  } | null;
}

/**
 * Where this ticket's work comes from and goes to (CORE-116, FRD-031).
 *
 * FRD-031 requires execution material to name the exact base SHA, base branch,
 * PR target and verification target rather than leaving a worker to assume
 * `origin/main`. All four are derived from the project's declared delivery
 * policy, so a main-only project sees exactly what it saw before and a
 * dev-to-main project sees `dev` without the worker needing special
 * instructions.
 */
export interface ExecutionPacketDelivery {
  integrationBranch: string;
  releaseBranch: string;
  releaseCandidatePattern: string | null;
  hotfixBackport: boolean;
  /** `board` when the project declared a policy; `default` when it is the shipped main-only one. */
  policySource: DeliveryPolicySource;
  /** Branch this ticket's work is based on. */
  baseBranch: string;
  /** Exact SHA of `baseBranch` at packet time; null when Git could not answer. */
  baseSha: string | null;
  baseShaState: "resolved" | "unavailable";
  /** The branch the pull request targets. */
  prTarget: string;
  /** The branch whose exact merge SHA verification must prove. */
  verificationTarget: string;
  /** The ticket's recorded delivery state — never a gate input (ADR-0005). */
  state: DeliveryState;
  /** Recorded integration branch and exact merged SHA, when there is one. */
  branch: string | null;
  sha: string | null;
  /** Integration branch a release-branch hotfix still owes a backport to. */
  backportRequired: string | null;
}

/**
 * Resolve the base SHA of a branch, bounded so a stalled host cannot hang the
 * packet.
 *
 * Tries the remote-tracking ref first, because that — not the local branch — is
 * what a fresh worktree is actually cut from. A failure is reported as
 * `unavailable`, never guessed: a wrong base SHA in execution material is worse
 * than an absent one.
 */
async function resolveBaseSha(cwd: string, branch: string): Promise<string | null> {
  for (const ref of [`origin/${branch}`, branch]) {
    try {
      const { stdout } = await execFileAsync("git", ["-C", cwd, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
        encoding: "utf8",
        windowsHide: true,
        timeout: DELIVERY_GIT_TIMEOUT_MS,
        maxBuffer: DELIVERY_GIT_MAX_BUFFER,
      });
      const sha = stdout.trim();
      if (/^[0-9a-f]{40}$/iu.test(sha)) return sha;
    } catch {
      // Try the next ref; an unresolvable branch is `unavailable`, not an error.
    }
  }
  return null;
}

/** Bounds for the one extra Git call the delivery block makes. */
const DELIVERY_GIT_TIMEOUT_MS = 15_000;
const DELIVERY_GIT_MAX_BUFFER = 32 * 1024;

/**
 * Build the packet's delivery block.
 *
 * A ticket whose delivery record already names the release branch is a hotfix,
 * and its base, PR target and verification target are that release branch — the
 * one case where an ordinary ticket does not aim at the integration branch.
 */
export async function deliveryPacket(
  policy: DeliveryPolicy,
  policySource: DeliveryPolicySource,
  item: Item,
  repoRoot: string,
): Promise<ExecutionPacketDelivery> {
  const { baseBranch, prTarget, verificationTarget } = deliveryTargets(policy, item);
  const baseSha = await resolveBaseSha(repoRoot, baseBranch);
  return {
    ...policy,
    policySource,
    baseBranch,
    baseSha,
    baseShaState: baseSha ? "resolved" : "unavailable",
    prTarget,
    verificationTarget,
    state: (item.delivery_state as DeliveryState | undefined) ?? "not-integrated",
    branch: item.delivery_branch ?? null,
    sha: item.delivery_sha ?? null,
    backportRequired: item.delivery_backport_required ?? null,
  };
}

export interface ExecutionPacketReady {
  ready: true;
  project: ProjectIdentity;
  ticket: ExecutionPacketTicket;
  claim: ExecutionPacketClaim;
  /** Base SHA, base branch, PR target and verification target (FRD-031). */
  delivery: ExecutionPacketDelivery;
  groupContexts: ExecutionPacketGroupContext[];
  documents: {
    plan: ExecutionPacketDocument;
    checklist: ExecutionPacketDocument;
    files: ExecutionPacketDocument;
  };
  extraDocs: ExecutionPacketExtraDoc[];
  gates: GateReport;
  /** Non-blocking board hygiene issues outside this ticket's execution location. */
  warnings: string[];
  stopCondition: string;
  commandsHint: string;
  /**
   * FRD-033 plan validation. On a whole-ticket packet every finding is
   * advisory: this report tells a planner what is still unresolved, and it
   * never refuses work that was previously allowed.
   */
  validation: PlanValidation;
  /**
   * Present only when the caller asked for one bounded ordered step. The
   * worker executes this step and nothing else, then returns.
   */
  step?: StepPacket;
}

export interface ExecutionPacketRefusal {
  ready: false;
  code: "GATE_BLOCKED";
  reason: string;
  missing: string[];
  project: ProjectIdentity;
  ticket?: ExecutionPacketCompactTicket;
  gates?: GateReport;
  /** Present only for a step-compilation refusal: why the plan is not compilable. */
  validation?: PlanValidation;
}

export type ExecutionPacket = ExecutionPacketReady | ExecutionPacketRefusal;

function compactTicket(item: Item, profile: string): ExecutionPacketCompactTicket {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    profile,
    area: item.area ?? null,
    groups: item.groups ?? null,
    refs: item.refs ?? null,
    taken: takenDetails(item),
  };
}

function fullTicket(
  item: Item,
  profile: string,
  revision: string | null,
  workspace: ExecutionPacketTicket["workspace"],
): ExecutionPacketTicket {
  return { ...compactTicket(item, profile), body: item.body, revision, workspace };
}

function takenDetails(item: Item): ExecutionPacketTicket["taken"] {
  return item.taken_at
    ? {
        taken_at: item.taken_at,
        assignee: item.assignee ?? null,
        branch: item.branch ?? null,
        worktree: item.worktree ?? null,
      }
    : null;
}

function packetWorkspace(
  item: Item,
  batch: Awaited<ReturnType<KanmerStore["batchState"]>>,
): ExecutionPacketTicket["workspace"] {
  if (item.taken_at || !batch) {
    return { branch: item.branch ?? null, worktree: item.worktree ?? null };
  }
  const prefix = "worktree:";
  const worktree = batch.workspace?.startsWith(prefix)
    ? batch.workspace.slice(prefix.length) || null
    : null;
  return { branch: batch.branch, worktree };
}

function isWindowsAbsolute(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input) || /^\\\\/.test(input);
}

function canonicalPathFrom(base: string, input: string): string {
  const absolute = path.isAbsolute(input) || isWindowsAbsolute(input) ? input : path.join(base, input);
  return canonicalProjectPath(absolute);
}

function canonicalWorktreePath(project: ProjectIdentity, worktree: string): string {
  return canonicalPathFrom(project.repoRoot, worktree);
}

export function sameWorktreePath(left: string, right: string): boolean {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

export type ResolvedPath = { ok: true; path: string } | { ok: false; detail: string };

interface ExecutionWorktreeSafety {
  refusal: string | null;
  warnings: string[];
}

async function physicalExistingPath(input: string): Promise<ResolvedPath> {
  try {
    return { ok: true, path: canonicalProjectPath(await realpath(input)) };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function gitWorktreeRoot(directory: string): Promise<ResolvedPath> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", directory, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const output = stdout.trim();
    if (!output) return { ok: false, detail: "Git returned an empty worktree-root path." };
    return physicalExistingPath(canonicalPathFrom(directory, output));
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

export async function gitCommonDirectory(directory: string): Promise<ResolvedPath> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", directory, "rev-parse", "--git-common-dir"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const output = stdout.trim();
    if (!output) return { ok: false, detail: "Git returned an empty common-directory path." };
    // Git can spell the same Windows directory through an 8.3 alias in one
    // worktree and its long name in another (for example RUNNER~1 versus
    // runneradmin). Comparing those strings would reject a real worktree
    // before its resume metadata is even considered. Resolve the existing
    // common directory through the filesystem, then compare that physical
    // identity instead. A failed resolution is a refusal: resume must never
    // fall back to an unverified lexical path.
    return physicalExistingPath(canonicalPathFrom(directory, output));
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function checkedOutBranch(directory: string): Promise<{ ok: true; branch: string } | { ok: false; detail: string }> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", directory, "branch", "--show-current"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const branch = stdout.trim();
    return branch
      ? { ok: true, branch }
      : { ok: false, detail: "HEAD is detached." };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function unsafeExecutionWorktree(
  store: KanmerStore,
  project: ProjectIdentity,
  item: Item,
  workspace: ExecutionPacketTicket["workspace"],
  batchId: string | null,
): Promise<ExecutionWorktreeSafety> {
  if (!item.taken_at && !batchId) return { refusal: null, warnings: [] };
  if (!workspace.branch || !workspace.worktree) {
    return {
      refusal: `Ticket "${item.id}" has incomplete execution-workspace evidence; both branch and worktree are required before issuing an execution packet.`,
      warnings: [],
    };
  }
  const candidateLocation = await physicalExistingPath(canonicalWorktreePath(project, workspace.worktree));
  if (!candidateLocation.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree that cannot be resolved on disk: ${candidateLocation.detail}`,
      warnings: [],
    };
  }
  const candidate = await gitWorktreeRoot(candidateLocation.path);
  if (!candidate.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree that cannot be verified as a Git checkout: ${candidate.detail}`,
      warnings: [],
    };
  }
  if (!sameWorktreePath(candidateLocation.path, candidate.path)) {
    return {
      refusal: `Ticket "${item.id}" records a path inside a Git worktree instead of that worktree's root; this is not a resumable ticket worktree.`,
      warnings: [],
    };
  }
  const boardWorktree = await gitWorktreeRoot(project.boardRoot);
  if (!boardWorktree.ok) {
    return {
      refusal: `The Kanmer board worktree cannot be resolved before resuming "${item.id}": ${boardWorktree.detail}`,
      warnings: [],
    };
  }
  if (sameWorktreePath(candidate.path, boardWorktree.path)) {
    return {
      refusal: `Ticket "${item.id}" records the board worktree as its execution worktree; this is not a resumable ticket worktree.`,
      warnings: [],
    };
  }
  const sourceCheckout = await gitWorktreeRoot(project.repoRoot);
  if (!sourceCheckout.ok) {
    return {
      refusal: `The source repository checkout cannot be resolved before resuming "${item.id}": ${sourceCheckout.detail}`,
      warnings: [],
    };
  }
  if (sameWorktreePath(candidate.path, sourceCheckout.path)) {
    return {
      refusal: `Ticket "${item.id}" records the shared source checkout as its execution worktree; this is not a resumable ticket worktree.`,
      warnings: [],
    };
  }
  const warnings: string[] = [];
  for (const other of await store.listItems()) {
    if (other.id === item.id || !other.taken_at || !other.worktree) continue;
    // A frozen member of the same batch shares this worktree by design
    // (CORE-124); every other active ticket's worktree remains a refusal.
    if (batchId !== null && other.lease_batch === batchId) continue;
    const otherLocation = await physicalExistingPath(canonicalWorktreePath(project, other.worktree));
    if (!otherLocation.ok) {
      warnings.push(`Active ticket "${other.id}" has an unresolved recorded worktree: ${otherLocation.detail}`);
      continue;
    }
    const otherWorktree = await gitWorktreeRoot(otherLocation.path);
    if (!otherWorktree.ok) {
      warnings.push(`Active ticket "${other.id}" has a recorded worktree that is not a resolvable Git checkout: ${otherWorktree.detail}`);
      continue;
    }
    if (sameWorktreePath(candidate.path, otherWorktree.path)) {
      return {
        refusal: `Ticket "${item.id}" records the same worktree as active ticket "${other.id}"; this is not a resumable ticket worktree.`,
        warnings,
      };
    }
  }
  const [candidateGit, sourceGit] = await Promise.all([
    gitCommonDirectory(candidate.path),
    gitCommonDirectory(project.repoRoot),
  ]);
  if (!candidateGit.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree that cannot be verified as a Git checkout: ${candidateGit.detail}`,
      warnings,
    };
  }
  if (!sourceGit.ok) {
    return {
      refusal: `The source repository cannot be verified before resuming "${item.id}": ${sourceGit.detail}`,
      warnings,
    };
  }
  if (!sameWorktreePath(candidateGit.path, sourceGit.path)) {
    return {
      refusal: `Ticket "${item.id}" records a worktree from a different Git repository; this is not a resumable ticket worktree.`,
      warnings,
    };
  }
  const branch = await checkedOutBranch(candidate.path);
  if (!branch.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree without a checked-out branch: ${branch.detail}`,
      warnings,
    };
  }
  if (branch.branch !== workspace.branch) {
    return {
      refusal: `Ticket "${item.id}" records branch "${workspace.branch}", but its worktree currently has "${branch.branch}" checked out; this is not a resumable ticket worktree.`,
      warnings,
    };
  }
  return { refusal: null, warnings };
}

function refuse(
  project: ProjectIdentity,
  reason: string,
  missing: string[],
  item?: Item,
  gates?: GateReport,
): ExecutionPacketRefusal {
  return {
    ready: false,
    code: "GATE_BLOCKED",
    reason,
    missing,
    project,
    ...(item && gates ? { ticket: compactTicket(item, gates.profile), gates } : {}),
  };
}

function leavePreparing(gates: GateReport) {
  return gates.boundaries.find((boundary) => boundary.boundary === "leave-preparing");
}

function missingRequirements(gates: GateReport): string[] {
  return (leavePreparing(gates)?.requirements ?? [])
    .filter((requirement) => !requirement.satisfied && requirement.type !== "questions-resolved")
    .map((requirement) => requirement.requirement);
}

function unresolvedQuestion(gates: GateReport): boolean {
  const requirements = gates.boundaries.flatMap((boundary) => boundary.requirements);
  return requirements.some((requirement) => requirement.type === "questions-resolved" && !requirement.satisfied);
}

async function groupContexts(store: KanmerStore, item: Item): Promise<ExecutionPacketGroupContext[]> {
  const groups = item.groups ?? [];
  return Promise.all(
    groups.map(async (id) => {
      const group = await store.getGroup(id);
      if (!group) {
        return {
          id,
          kind: null,
          title: null,
          body: null,
          context: null,
          version: null,
          warning: `Group "${id}" is missing from the board.`,
        };
      }
      const context = await store.getGroupDoc(id, "context.md");
      return {
        id,
        kind: group.kind,
        title: group.title,
        body: group.body,
        context,
        version: context === null ? null : contentVersion(context),
        ...(context === null ? { warning: `Group "${id}" has no context.md.` } : {}),
      };
    }),
  );
}

function indexDocuments(results: TicketDocumentWithVersion[]): Record<"plan" | "checklist" | "files", ExecutionPacketDocument> {
  const byDoc = new Map(results.map((result) => [result.doc, result]));
  const entry = (doc: "plan" | "checklist" | "files"): ExecutionPacketDocument => {
    const result = byDoc.get(doc)!;
    return { exists: result.exists, content: result.content, version: result.version };
  };
  return { plan: entry("plan"), checklist: entry("checklist"), files: entry("files") };
}

function sectionFromPlan(plan: string | null, titles: string[], fallback: string): string {
  if (plan) {
    for (const title of titles) {
      const content = extractAtxSection(plan, title);
      if (content) return content;
    }
  }
  return fallback;
}

export async function getExecutionPacket(input: {
  store: KanmerStore;
  id: string;
  actor: string;
  /** Durable run identity required to exercise a batch controller's authority. */
  controllerRun?: string;
  project: ProjectIdentity;
  resume?: { branch: string; worktree: string };
  /** Logical project identity (FRD-029), carried into a compiled step packet. */
  logical?: { project_id: string | null; board_id: string | null };
  /**
   * A 1-based ordered-step index, or `"next"`. Its presence is what asks for a
   * bounded step packet — and what makes the FRD-033 structural findings
   * blocking. Absent, the response is the established whole-ticket packet.
   */
  step?: number | "next";
}): Promise<ExecutionPacket> {
  const { store, id, actor, controllerRun, project, resume, logical, step } = input;
  const item = await store.getItem(id);
  if (!item) return refuse(project, `No ticket with id "${id}" exists.`, []);
  if (item.type !== "ticket") {
    return refuse(project, `"${id}" is a ${item.type}, not a ticket; execution packets are ticket-only.`, []);
  }

  const gates = await store.getDocGates(id);
  if (!gates) {
    return refuse(project, `"${id}" uses a legacy layout without a format-3 ticket folder.`, [], item);
  }
  if (gates.profile === "spike") {
    return refuse(project, `Profile "spike" is research-first; execution packets are not available for spikes.`, [], item, gates);
  }
  // FRD-032. A capture owes no document, so `missingRequirements` below would
  // report nothing missing and hand a worker a "ready" packet for an
  // observation nobody has decided to deliver. Refused here, beside the spike
  // refusal, for the same reason: the profile says this is not implementation
  // work yet.
  if (isCaptureItem(item) || gates.profile === CAPTURE_PROFILE_ID) {
    return refuse(project, `"${id}" is a quick capture, not planned work. Promote it first with update_item capture_disposition ("promoted" or "batch") and the profile it should carry; a capture is never selected for autonomous delivery.`, [], item, gates);
  }

  const missing = missingRequirements(gates);
  if (missing.length) {
    return refuse(project, `Execution is blocked by unmet leave-preparing requirements: ${missing.join(", ")}.`, missing, item, gates);
  }
  if (unresolvedQuestion(gates)) {
    return refuse(project, "Execution is blocked by unresolved questions.", ["questions-resolved"], item, gates);
  }

  if (item.taken_at && (!item.branch || !item.worktree)) {
    return refuse(
      project,
      `Ticket "${id}" has incomplete taken-ticket metadata; a resumable ticket requires both branch and worktree. Restore the recorded execution location before retrying.`,
      [],
      item,
      gates,
    );
  }
  if (item.taken_at && item.status !== "implementing") {
    return refuse(
      project,
      `Ticket "${id}" is in ${item.status}, not implementing; execution resumption is available only while a ticket is implementing.`,
      [],
      item,
      gates,
    );
  }
  let batch: Awaited<ReturnType<KanmerStore["batchState"]>>;
  try {
    batch = await store.batchState(id);
  } catch (error) {
    return refuse(
      project,
      `Ticket "${id}" has unreadable batch ownership evidence: ${error instanceof Error ? error.message : String(error)}`,
      [],
      item,
      gates,
    );
  }
  if (batch && batch.declaration !== "consistent") {
    return refuse(
      project,
      `Ticket "${id}" belongs to batch ${batch.id}, whose declaration is ${batch.declaration}; recover or reconcile the complete manifest before execution.`,
      [],
      item,
      gates,
    );
  }
  if (batch && batch.state !== "active") {
    return refuse(
      project,
      `Ticket "${id}" belongs to batch ${batch.id}, whose authoritative manifest is ${batch.state ?? "missing"}; ` +
        `only an active batch may issue an execution packet, and releasing must finish first.`,
      [],
      item,
      gates,
    );
  }
  const selectedBatchMember = batch?.members.find((member) => member.id === id);
  if (batch && (!selectedBatchMember?.exists || selectedBatchMember.archived || selectedBatchMember.terminal)) {
    const disposition = !selectedBatchMember?.exists
      ? "missing from its authoritative roster"
      : selectedBatchMember.archived
        ? `archived in ${selectedBatchMember.status}`
        : `terminal in ${selectedBatchMember.status}`;
    return refuse(
      project,
      `Ticket "${id}" is ${disposition} for batch ${batch.id}; terminal or archived members cannot receive another execution packet.`,
      [],
      item,
      gates,
    );
  }
  if (batch && !controllerRun?.trim()) {
    return refuse(
      project,
      `Ticket "${id}" belongs to batch ${batch.id}; controller_run is required to obtain its execution packet.`,
      [],
      item,
      gates,
    );
  }
  if (batch && batch.controller !== actor) {
    return refuse(
      project,
      `Ticket "${id}" belongs to batch ${batch.id}, controlled by ${batch.controller ?? "an unknown actor"}; ` +
        `${actor} cannot obtain its execution packet even with an exact branch/worktree resume.`,
      [],
      item,
      gates,
    );
  }
  if (batch && batch.controllerRun !== controllerRun?.trim()) {
    return refuse(
      project,
      `Ticket "${id}" belongs to batch ${batch.id}, controlled by run ${batch.controllerRun ?? "an unknown run"}; ` +
        `${controllerRun?.trim() ?? "an unknown run"} cannot obtain its execution packet even with an exact branch/worktree resume.`,
      [],
      item,
      gates,
    );
  }
  const workspace = packetWorkspace(item, batch);
  const worktreeSafety = await unsafeExecutionWorktree(store, project, item, workspace, batch?.id ?? null);
  if (worktreeSafety.refusal) return refuse(project, worktreeSafety.refusal, [], item, gates);

  // MCP client names are not durable agent identities. A later session must
  // deliberately name the exact branch and worktree already recorded before
  // it may resume; every other occupied-ticket request remains refused.
  const exactRecordedResume = resume !== undefined &&
    item.branch !== undefined && resume.branch === item.branch &&
    item.worktree !== undefined && resume.worktree === item.worktree;
  const board = await store.getBoard();
  const timing = leaseConfig(board);
  const lease = leaseState(item, new Date(), timing);
  const claim: ExecutionPacketClaim = {
    state: lease.state,
    expiresAt: lease.expiresAt,
    controller: item.claim_controller ?? (item.assignee || null),
    reviewRound: item.review_round ?? 0,
    remediationBudget: item.remediation_budget ?? 1,
    leaseId: item.lease_id ?? null,
    leaseRevision: item.lease_revision ?? null,
    phase: item.lease_phase ?? null,
    workspace: item.lease_workspace ?? batch?.workspace ?? null,
    heartbeatAt: item.lease_heartbeat_at ?? null,
    legacy: lease.legacy,
    heartbeatMinutes: timing.heartbeatMinutes,
    expiryMinutes: timing.expiryMinutes,
    commandMaxMinutes: timing.commandMaxMinutes,
    batch: null,
  };
  if (batch) {
    claim.batch = {
      id: batch.id,
      frozenAt: batch.frozenAt,
      branch: batch.branch,
      workspace: batch.workspace,
      members: batch.members.map((m) => m.id),
      pending: batch.members.filter((m) => !m.terminal).map((m) => m.id),
    };
  }
  // A consistent batch manifest's actor/controller-run pair is the authority;
  // assignee and claim_controller remain display projections only. All batch
  // actor/run and physical-worktree checks have already passed above. The
  // ordinary isolated occupancy contract remains unchanged.
  if (!batch && item.taken_at && item.assignee !== actor && item.claim_controller !== actor && !exactRecordedResume) {
    const owner = item.assignee || "an unknown actor";
    const location = [item.branch && `branch ${item.branch}`, item.worktree && `worktree ${item.worktree}`]
      .filter(Boolean)
      .join(", ");
    // A dead controller's claim is refused differently from a live one: the
    // remedy is a transfer, never a force retake (CORE-121, FRD-030).
    if (claim.state === "expired") {
      return refuse(
        project,
        `Ticket "${id}" is taken by ${owner}${location ? ` (${location})` : ""} but its claim expired at ${claim.expiresAt}; ` +
          `transfer it with take_ticket action "transfer", or resume with the exact recorded branch and worktree.`,
        [],
        item,
        gates,
      );
    }
    return refuse(
      project,
      `Ticket "${id}" is already taken by ${owner}${location ? ` (${location})` : ""}.`,
      [],
      item,
      gates,
    );
  }

  const [fixed, inventory] = await Promise.all([
    readTicketDocuments(store, id, ["plan", "checklist", "files"]),
    store.listTicketDocsWithVersions(id),
  ]);
  const planDoc = fixed.find((doc) => doc.doc === "plan");
  const plan = planDoc?.content ?? null;
  const checklist = fixed.find((doc) => doc.doc === "checklist")?.content ?? null;
  const extraDocs = (inventory ?? [])
    .filter((doc) => !["plan/plan.md", "checklist/checklist.md", "files/files.md"].includes(doc.doc))
    .map((doc) => ({ path: doc.doc, version: doc.version! }));

  const contexts = await groupContexts(store, item);
  // FRD-033's two evidence layers: shared group research, and this ticket's own
  // impact research. Both carry the exact content version they were read at, so
  // a later reconciliation can tell whether the packet went stale.
  const evidence: StepPacketEvidence[] = [
    ...contexts
      .filter((context): context is ExecutionPacketGroupContext & { version: string } => context.version !== null)
      .map((context) => ({
        layer: "group" as const,
        group: context.id,
        path: `${context.id}/context.md`,
        version: context.version,
      })),
    ...(inventory ?? [])
      .filter((doc) => /^(?:research|files)\//.test(doc.doc))
      .map((doc) => ({ layer: "ticket" as const, group: null, path: doc.doc, version: doc.version! })),
  ];
  const liveEvidence = evidence.map((entry) => ({ path: entry.path, version: entry.version }));
  const requireEvidencePin = evidence.some((entry) => entry.layer === "ticket");
  const parsedPlan = parsePlan(plan ?? "");
  const stopCondition = sectionFromPlan(plan, ["Stop condition"], EXECUTION_STOP_FALLBACK);
  const revision = (await store.getRevision(id))?.revision ?? null;

  let validation = validatePlan(parsedPlan, { liveEvidence, requireEvidencePin });
  let compiled: StepPacket | undefined;
  if (step !== undefined) {
    const result = compileStepPacket({
      plan: parsedPlan,
      planPath: "plan/plan.md",
      planVersion: planDoc?.version ?? null,
      project: {
        project_id: logical?.project_id ?? null,
        board_id: logical?.board_id ?? null,
        fingerprint: project.fingerprint,
      },
      ticket: { id: item.id, revision },
      batch: claim.batch?.id ?? null,
      workspace,
      evidence,
      checklist,
      select: step,
      stopCondition,
    });
    validation = result.validation;
    // Last in the refusal order, and still a normal read-only value: nothing
    // above this point wrote to the board, and nothing here does either.
    if (!result.ok) return { ...refuse(project, result.reason, [], item, gates), validation };
    compiled = result.packet;
  }

  // FRD-031: resolved from the board the packet was built from, and from the
  // repo checkout the refs live in — never from a constant.
  const delivery = await deliveryPacket(resolveDelivery(board), deliveryPolicySource(board), item, store.paths.repoRoot);

  return {
    ready: true,
    project,
    ticket: fullTicket(item, gates.profile, revision, workspace),
    claim,
    delivery,
    groupContexts: contexts,
    documents: indexDocuments(fixed),
    extraDocs,
    gates,
    warnings: worktreeSafety.warnings,
    stopCondition,
    commandsHint: sectionFromPlan(plan, ["Commands", "Verification commands", "Verification"], EXECUTION_COMMANDS_FALLBACK),
    validation,
    ...(compiled ? { step: compiled } : {}),
  };
}

import { deliveryTargets, resolveDelivery } from "./board.js";
import type { BatchState, DeliveryPolicy, Item } from "./types.js";
import type { KanmerStore, OpenQuestionCount } from "./index.js";

export type MergeGateFindingCode =
  | "NO_TICKET"
  | "BATCH_ROSTER"
  | "OPEN_QUESTIONS"
  | "WRONG_STAGE"
  | "DEPENDENCY_BLOCKED"
  | "WRONG_TARGET"
  | "NO_REVIEW_RECORD"
  | "STALE_REVIEW"
  | "COMMITS_UNREACHABLE"
  | "SYNC_REQUIRED";
export type MergeGateFindingLevel = "error" | "warning";
export type MergeGateTicketSource = "footer" | "branch" | null;
export type MergeGateCheckOutcome = "pass" | "fail" | "warn" | "skipped";

export interface MergeGatePrInput {
  number: number;
  headSha: string;
  branch: string;
  body?: string | null;
  /**
   * The branch the pull request targets (`pull_request.base.ref`).
   *
   * Optional because older callers do not supply it, and an absent value
   * **skips** the target check rather than inventing a default — a gate that
   * guessed `main` would be exactly the hardcoding FRD-031 removes.
   */
  baseRef?: string;
  /** Canonical GitHub PR URL when the event supplies it. */
  url?: string;
  /** Canonical owner/repository identity when the event supplies it. */
  repository?: string;
}

/** A result that is useful to operators as well as the annotation adapter. */
export interface MergeGateCheck {
  code: MergeGateFindingCode;
  level: MergeGateFindingLevel;
  outcome: MergeGateCheckOutcome;
  message: string;
  details?: Record<string, unknown>;
}

/** Adverse checks retain the phase-1 code/level/message fields. */
export interface MergeGateFinding extends MergeGateCheck {
  outcome: "fail" | "warn";
}

export interface MergeGateReviewAbsent { state: "absent"; }
export interface MergeGateReviewInvalid { state: "invalid"; reason: string; }
export interface MergeGateReviewValid {
  state: "valid";
  headSha: string;
  verdict?: string;
  pr?: string;
  independent?: boolean;
  /** Ticket timestamp the reviewer bound this verdict to. */
  ticketUpdated?: string;
  /** Exact content version of the reviewed ticket's plan document. */
  planHash?: string;
  /** Board branch tip the reviewer attested to (CORE-123); absent on older records. */
  boardSha?: string;
  details?: Record<string, unknown>;
}

/**
 * How the attested board tip relates to the board the gate actually fetched.
 * `current`: attested SHA is an ancestor of (or equal to) the fetched tip.
 * `stale`: attested SHA exists but is not an ancestor — the reviewer read a
 * board that diverged from what was pushed. `unknown`: the attested SHA is not
 * on the fetched board at all (typically never pushed) or the board is not a
 * Git checkout. `unrecorded`: the attestation carries no `board_sha`.
 */
export type MergeGateBoardState = "current" | "stale" | "unknown" | "unrecorded";

export interface MergeGateBoardEvidence {
  /** Tip of the fetched board branch, or null when it could not be read. */
  sha: string | null;
  attestedSha?: string;
  state: MergeGateBoardState;
  diagnostic?: string;
}
export type MergeGateReviewEvidence = MergeGateReviewAbsent | MergeGateReviewInvalid | MergeGateReviewValid;

export interface MergeGateCommitEvidence {
  sha: string;
  state: "reachable" | "unreachable" | "indeterminate";
  diagnostic?: string;
}

export interface MergeGateBlockerEvidence {
  id: string;
  status?: string;
  archived?: boolean;
  /** false means a dangling blocker reference, which is conservatively live. */
  exists?: boolean;
}

/** Inputs gathered by the CLI boundary; core never spawns Git or calls GitHub. */
export interface MergeGatePhase2Evidence {
  reviewStageId: string;
  finalStageId: string;
  blockers: readonly MergeGateBlockerEvidence[];
  review: MergeGateReviewEvidence;
  commits: readonly MergeGateCommitEvidence[];
  /**
   * `KANMER_GATE_STRICT`: promote the compatibility-period warnings
   * (NO_REVIEW_RECORD, STALE_REVIEW, COMMITS_UNREACHABLE, SYNC_REQUIRED) to
   * blocking errors. Defaults to false so existing singular repos keep today's
   * levels; an explicit plural roster always requires exact independent PASS
   * evidence for every member.
   */
  strict?: boolean;
  /** Board-tip evidence gathered by the CLI; omitted means the check is skipped. */
  board?: MergeGateBoardEvidence;
}

export interface MergeGateBatchMemberEvidence {
  ticketId: string;
  /** Ticket bytes from the CLI's one warning-free, archived-inclusive census. */
  item: Item | null;
  /** Exact content version of this member's current plan document. */
  planVersion: string | null;
  /** Question count gathered for this exact member; null is inconclusive. */
  questions: OpenQuestionCount | null;
  evidence: MergeGatePhase2Evidence;
}

/** Roster evidence gathered from one warning-free board snapshot by the CLI. */
export interface MergeGateBatchEvidence {
  kind: "batch";
  reviewStageId: string;
  finalStageId: string;
  strict?: boolean;
  /** Delivery policy resolved from the same captured board.yml. */
  policy: DeliveryPolicy;
  /** Authoritative manifest state classified against that same item census. */
  batch: BatchState | null;
  /** Fail-closed manifest read/validation error captured by the CLI boundary. */
  batchError?: string;
  members: readonly MergeGateBatchMemberEvidence[];
}

export interface MergeGateResult {
  ok: boolean;
  ticketId: string | null;
  /** Normalised explicit roster; one id for the ordinary singular path. */
  ticketIds?: string[];
  /** Frozen batch identity for a valid multi-ticket roster, otherwise null. */
  batchId?: string | null;
  source: MergeGateTicketSource;
  pr: MergeGatePrInput;
  findings: MergeGateFinding[];
  questions: OpenQuestionCount | null;
  /** Complete ordered phase-1 + phase-2 verdict; omitted for legacy callers. */
  checks?: MergeGateCheck[];
  /** The board tip the verdict was evaluated against; null when unknown or not supplied. */
  boardSha?: string | null;
  /** Whether attestation/commit/sync checks were evaluated as errors. */
  strict?: boolean;
}

/** Keep future warning-level findings non-blocking while errors remain blocking. */
export function mergeGateOk(findings: readonly Pick<MergeGateFinding, "level">[]): boolean {
  return findings.every((finding) => finding.level !== "error");
}

const FOOTER_LINE_RE = /^\s*Kanmer:\s*(.*?)\s*$/i;
const TICKET_ID_RE = /^[A-Z0-9]{2,6}-\d+$/i;
const BRANCH_ID_RE = /^([A-Z0-9]{2,6}-\d+)/i;
const FULL_SHA_RE = /^[0-9a-f]{40}$/i;

function normalizeTicketId(value: string): string | null {
  const id = value.trim();
  return TICKET_ID_RE.test(id) ? id.toUpperCase() : null;
}

function normalizeSha(value: string): string { return value.trim().toLowerCase(); }

function reviewPrMatches(value: string, pr: MergeGatePrInput): boolean {
  const identity = value.trim();
  if (identity === String(pr.number)) return true;
  const repository = pr.repository?.trim();
  const canonicalUrl = pr.url?.trim() ?? (
    repository && /^[^/\s]+\/[^/\s]+$/.test(repository)
      ? `https://github.com/${repository}/pull/${pr.number}`
      : null
  );
  return Boolean(canonicalUrl && identity === canonicalUrl);
}

/** Resolve a PR to a ticket, with an explicit footer taking precedence. */
export function resolveMergeGateTicket(
  body: string | null | undefined,
  branch: string,
): { ticketId: string | null; ticketIds?: string[]; source: MergeGateTicketSource; error?: string } {
  const lines = (body ?? "").split(/\r?\n/);
  const footerLines = lines
    .map((line, index) => ({ line, index, match: FOOTER_LINE_RE.exec(line) }))
    .filter((entry) => entry.match)
    .reverse();

  if (footerLines.length > 0) {
    const ids = footerLines.map((entry) => normalizeTicketId(entry.match?.[1] ?? ""));
    if (ids.some((id) => id === null)) return { ticketId: null, source: null, error: "explicit Kanmer footer is invalid" };
    const distinct = [...new Set(ids as string[])].sort((a, b) => a.localeCompare(b));
    return distinct.length === 1
      ? { ticketId: distinct[0]!, source: "footer" }
      : { ticketId: null, ticketIds: distinct, source: "footer" };
  }

  const branchId = normalizeTicketId(BRANCH_ID_RE.exec(branch)?.[1] ?? "");
  return branchId
    ? { ticketId: branchId, source: "branch" }
    : { ticketId: null, source: null };
}

function noTicket(pr: MergeGatePrInput, message: string): MergeGateResult {
  return {
    ok: false,
    ticketId: null,
    source: null,
    pr,
    questions: null,
    findings: [{ code: "NO_TICKET", level: "error", outcome: "fail", message }],
  };
}

/** The compatibility-period checks whose level follows the strict switch. */
const SOFT_CODES: ReadonlySet<MergeGateFindingCode> = new Set(["WRONG_TARGET", "NO_REVIEW_RECORD", "STALE_REVIEW", "COMMITS_UNREACHABLE", "SYNC_REQUIRED"]);

function levelFor(code: MergeGateFindingCode, strict: boolean): MergeGateFindingLevel {
  return SOFT_CODES.has(code) && !strict ? "warning" : "error";
}

function skipped(code: MergeGateFindingCode, message: string, strict = false): MergeGateCheck {
  return { code, level: levelFor(code, strict), outcome: "skipped", message };
}

function phase2NoTicket(
  pr: MergeGatePrInput,
  message: string,
  source: MergeGateTicketSource,
  ticketId: string | null,
  evidence: MergeGatePhase2Evidence,
): MergeGateResult {
  const base = noTicket(pr, message);
  const strict = evidence.strict === true;
  const why = "skipped because no Kanmer ticket was resolved";
  const checks: MergeGateCheck[] = [
    { code: "NO_TICKET", level: "error", outcome: "fail", message },
    skipped("OPEN_QUESTIONS", why, strict),
    skipped("WRONG_STAGE", why, strict),
    skipped("DEPENDENCY_BLOCKED", why, strict),
    skipped("WRONG_TARGET", why, strict),
    skipped("NO_REVIEW_RECORD", why, strict),
    skipped("STALE_REVIEW", why, strict),
    skipped("COMMITS_UNREACHABLE", why, strict),
    skipped("SYNC_REQUIRED", why, strict),
  ];
  return { ...base, ticketId, source, checks, boardSha: evidence.board?.sha ?? null, strict };
}

function pass(code: MergeGateFindingCode, level: MergeGateFindingLevel, message: string, details?: Record<string, unknown>): MergeGateCheck {
  return { code, level, outcome: "pass", message, ...(details ? { details } : {}) };
}

function fail(code: MergeGateFindingCode, level: MergeGateFindingLevel, message: string, details?: Record<string, unknown>): MergeGateFinding {
  return { code, level, outcome: level === "warning" ? "warn" : "fail", message, ...(details ? { details } : {}) };
}

function reviewChecks(
  pr: MergeGatePrInput,
  evidence: MergeGatePhase2Evidence,
  requireRosterIdentity = false,
  current?: { ticketUpdated: string; planVersion: string | null },
): { checks: MergeGateCheck[]; findings: MergeGateFinding[] } {
  const checks: MergeGateCheck[] = [];
  const findings: MergeGateFinding[] = [];
  const review = evidence.review;
  const strict = evidence.strict === true;
  const soft = levelFor("STALE_REVIEW", strict);
  // A plural footer is an explicit protected-merge declaration, not a
  // compatibility observation. Every member must own an independent PASS
  // attestation for this exact PR/head even when the repository has not opted
  // into strict handling for the older singular evidence checks.
  const reviewLevel: MergeGateFindingLevel = requireRosterIdentity ? "error" : soft;

  if (review.state === "absent") {
    const finding = fail("NO_REVIEW_RECORD", reviewLevel, "no scratch/review.md review attestation was recorded");
    checks.push(finding);
    findings.push(finding);
    checks.push({ code: "STALE_REVIEW", level: reviewLevel, outcome: "skipped", message: "skipped because no review attestation was recorded" });
  } else if (review.state === "invalid") {
    checks.push(pass("NO_REVIEW_RECORD", reviewLevel, "a review record is present"));
    const finding = fail("STALE_REVIEW", reviewLevel, `review attestation is invalid: ${review.reason}`, { reason: review.reason });
    checks.push(finding);
    findings.push(finding);
  } else {
    const actual = normalizeSha(review.headSha);
    const expected = normalizeSha(pr.headSha);
    const attestedPr = review.pr?.trim() ?? (typeof review.details?.pr === "string" ? review.details.pr.trim() : "");
    const independent = review.independent ?? review.details?.independent === true;
    // Review bindings are byte-identity tokens, unlike PR labels and SHAs.
    // Normalising whitespace here would let a record name evidence other than
    // the exact item timestamp/document version it claims to have reviewed.
    const attestedTicketUpdated = review.ticketUpdated ??
      (typeof review.details?.ticketUpdated === "string" ? review.details.ticketUpdated : "");
    const attestedPlanHash = review.planHash ??
      (typeof review.details?.planHash === "string" ? review.details.planHash : "");
    checks.push(pass("NO_REVIEW_RECORD", reviewLevel, "review attestation is present"));
    if (!FULL_SHA_RE.test(actual) || !FULL_SHA_RE.test(expected) || actual !== expected) {
      const finding = fail("STALE_REVIEW", reviewLevel, `review attestation head ${actual || "(missing)"} does not match PR head ${expected || "(missing)"}`, { attestedHeadSha: actual, prHeadSha: expected, verdict: review.verdict });
      checks.push(finding);
      findings.push(finding);
    } else if (requireRosterIdentity && !reviewPrMatches(attestedPr, pr)) {
      const finding = fail("STALE_REVIEW", reviewLevel, `review attestation names PR ${attestedPr || "(missing)"}, not current PR ${pr.number}`, {
        attestedHeadSha: actual,
        attestedPr: attestedPr || null,
        pr: pr.number,
        verdict: review.verdict,
        independent,
      });
      checks.push(finding);
      findings.push(finding);
    } else if (requireRosterIdentity && !independent) {
      const finding = fail("STALE_REVIEW", reviewLevel, "review attestation is not an independent review", {
        attestedHeadSha: actual,
        attestedPr,
        pr: pr.number,
        verdict: review.verdict,
        independent,
      });
      checks.push(finding);
      findings.push(finding);
    } else if (review.verdict?.toLowerCase() === "needs-changes" || (requireRosterIdentity && review.verdict?.toLowerCase() !== "pass")) {
      const finding = fail("STALE_REVIEW", reviewLevel, `review attestation has verdict ${review.verdict ?? "(missing)"}; batch members require pass`, { attestedHeadSha: actual, prHeadSha: expected, verdict: review.verdict });
      checks.push(finding);
      findings.push(finding);
    } else if (requireRosterIdentity && current && (
      attestedTicketUpdated !== current.ticketUpdated ||
      attestedPlanHash !== (current.planVersion ?? "")
    )) {
      const finding = fail(
        "STALE_REVIEW",
        reviewLevel,
        "review attestation does not match this batch member's current ticket and plan evidence",
        {
          attestedTicketUpdated: attestedTicketUpdated || null,
          ticketUpdated: current.ticketUpdated,
          attestedPlanHash: attestedPlanHash || null,
          planVersion: current.planVersion,
        },
      );
      checks.push(finding);
      findings.push(finding);
    } else {
      checks.push(pass("STALE_REVIEW", reviewLevel, "review attestation head matches the PR head", { attestedHeadSha: actual, verdict: review.verdict }));
    }
  }

  const commits = [...evidence.commits]
    .map((entry) => ({ ...entry, sha: normalizeSha(entry.sha) }))
    .sort((a, b) => a.sha.localeCompare(b.sha));
  const unreachable = commits.filter((entry) => entry.state === "unreachable").map((entry) => entry.sha);
  const indeterminate = commits.filter((entry) => entry.state === "indeterminate").map((entry) => entry.sha);
  if (commits.length === 0) {
    checks.push(pass("COMMITS_UNREACHABLE", soft, "no ticket commits were recorded", { commits: [] }));
  } else if (unreachable.length > 0 || indeterminate.length > 0) {
    const finding = fail("COMMITS_UNREACHABLE", soft, `ticket commit reachability is incomplete (${unreachable.length} unreachable, ${indeterminate.length} indeterminate)`, {
      unreachable: [...new Set(unreachable)],
      indeterminate: [...new Set(indeterminate)],
      evidence: commits.map(({ sha, state, diagnostic }) => ({ sha, state, ...(diagnostic ? { diagnostic } : {}) })),
    });
    checks.push(finding);
    findings.push(finding);
  } else {
    checks.push(pass("COMMITS_UNREACHABLE", soft, "all recorded ticket commits are reachable", { commits: commits.map((entry) => entry.sha) }));
  }

  const sync = syncCheck(evidence, strict);
  checks.push(sync);
  if (sync.outcome === "fail" || sync.outcome === "warn") findings.push(sync as MergeGateFinding);
  return { checks, findings };
}

/**
 * SYNC_REQUIRED: the attestation's `board_sha` must be on the board the gate
 * fetched. A reviewer who read an unpushed local board produced a verdict the
 * remote cannot corroborate (the PR #286/#287 failure), so `stale`/`unknown`
 * fail; older attestations without `board_sha` are `unrecorded` and pass.
 */
function syncCheck(evidence: MergeGatePhase2Evidence, strict: boolean): MergeGateCheck {
  const level = levelFor("SYNC_REQUIRED", strict);
  const board = evidence.board;
  if (!board) return { code: "SYNC_REQUIRED", level, outcome: "skipped", message: "skipped because no board evidence was supplied" };
  const boardSha = board.sha ? normalizeSha(board.sha) : null;
  const attested = board.attestedSha ? normalizeSha(board.attestedSha) : undefined;
  const details = { state: board.state, boardSha, ...(attested ? { attestedBoardSha: attested } : {}), ...(board.diagnostic ? { diagnostic: board.diagnostic } : {}) };
  switch (board.state) {
    case "current":
      return pass("SYNC_REQUIRED", level, `review attestation board ${attested ?? "(unknown)"} is on the fetched board tip ${boardSha ?? "(unknown)"}`, details);
    case "unrecorded":
      return pass("SYNC_REQUIRED", level, "review attestation records no board_sha; board sync was not verified", details);
    case "stale":
      return fail("SYNC_REQUIRED", level, `review attestation board ${attested ?? "(missing)"} is not an ancestor of the fetched board tip ${boardSha ?? "(unknown)"}; push the board branch and re-run the gate`, details);
    default:
      return fail("SYNC_REQUIRED", level, `review attestation board ${attested ?? "(missing)"} is not present on the fetched board; push the board branch and re-run the gate`, details);
  }
}

/**
 * WRONG_TARGET: a normal implementation PR targets the project's **configured
 * integration branch** (FRD-031), not a hardcoded `main`.
 *
 * A ticket that has already recorded delivery on the release branch is a
 * hotfix, and its PR legitimately targets that branch instead — which is why
 * this reads the ticket's delivery record rather than guessing from the branch
 * name. An event with no `base.ref` is skipped, never assumed.
 *
 * Soft by default like the other CORE-123 compatibility checks: a repository
 * that has never declared a policy resolves to main-only, so its existing PRs
 * pass unchanged, and `KANMER_GATE_STRICT` is what makes a wrong target block.
 */
function targetCheck(
  item: { delivery_branch?: string },
  pr: MergeGatePrInput,
  policy: DeliveryPolicy,
  strict: boolean,
): MergeGateCheck {
  const level = levelFor("WRONG_TARGET", strict);
  if (!pr.baseRef) {
    return { code: "WRONG_TARGET", level, outcome: "skipped", message: "the pull-request event carried no base branch" };
  }
  const { hotfix, prTarget: expected } = deliveryTargets(policy, item);
  const details = {
    baseRef: pr.baseRef,
    expected,
    integrationBranch: policy.integrationBranch,
    releaseBranch: policy.releaseBranch,
    hotfix,
  };
  if (pr.baseRef === expected) {
    return pass(
      "WRONG_TARGET",
      level,
      `pull request targets the ${hotfix ? "release" : "integration"} branch "${expected}"`,
      details,
    );
  }
  return fail(
    "WRONG_TARGET",
    level,
    `pull request targets "${pr.baseRef}"; this project's ${hotfix ? "release" : "integration"} branch is "${expected}"`,
    details,
  );
}

function evaluatePhase2(
  item: { id: string; status: string; archived?: boolean; delivery_branch?: string },
  pr: MergeGatePrInput,
  questions: OpenQuestionCount,
  evidence: MergeGatePhase2Evidence,
  policy: DeliveryPolicy,
  requireRosterIdentity = false,
  batchRoster: ReadonlySet<string> | null = null,
  currentReviewEvidence?: { ticketUpdated: string; planVersion: string | null },
): MergeGateResult {
  const checks: MergeGateCheck[] = [pass("NO_TICKET", "error", `Kanmer ticket ${item.id} resolved`)];
  const findings: MergeGateFinding[] = [];
  const questionCheck = questions.open > 0
    ? fail("OPEN_QUESTIONS", "error", `Kanmer ticket ${item.id} has ${questions.open} open question${questions.open === 1 ? "" : "s"} (${questions.checked}/${questions.total} checked)`, { checked: questions.checked, total: questions.total, open: questions.open })
    : pass("OPEN_QUESTIONS", "error", "ticket has no open questions", { checked: questions.checked, total: questions.total, open: questions.open });
  checks.push(questionCheck);
  if (questionCheck.outcome === "fail") findings.push(questionCheck as MergeGateFinding);

  const stageDetails = { expected: evidence.reviewStageId, actual: item.status, archived: item.archived === true };
  if (item.archived || item.status !== evidence.reviewStageId) {
    const finding = fail("WRONG_STAGE", "error", `Kanmer ticket ${item.id} is in stage ${item.archived ? "archived" : `"${item.status}"`}; expected review stage "${evidence.reviewStageId}"`, stageDetails);
    checks.push(finding);
    findings.push(finding);
  } else {
    checks.push(pass("WRONG_STAGE", "error", `Kanmer ticket ${item.id} is in review`, stageDetails));
  }

  const liveBlockers = evidence.blockers
    // A frozen batch is one implementation/PR unit. Its own dependency edges
    // still order work inside that unit, but cannot require one Review member
    // to reach Done before the shared PR is allowed to merge. Only the plural
    // path supplies this exact immutable roster; singular tickets and every
    // external or dangling dependency retain the ordinary blocking rule.
    .filter((blocker) => !batchRoster?.has(blocker.id))
    .filter((blocker) => blocker.exists === false || (!blocker.archived && blocker.status !== evidence.finalStageId))
    .map((blocker) => blocker.id)
    .sort();
  if (liveBlockers.length > 0) {
    const finding = fail("DEPENDENCY_BLOCKED", "error", `Kanmer ticket ${item.id} has live blockers: ${liveBlockers.join(", ")}`, { blockers: liveBlockers });
    checks.push(finding);
    findings.push(finding);
  } else {
    checks.push(pass("DEPENDENCY_BLOCKED", "error", `Kanmer ticket ${item.id} has no live blockers`, { blockers: [] }));
  }

  const target = targetCheck(item, pr, policy, evidence.strict === true);
  checks.push(target);
  if (target.outcome === "fail" || target.outcome === "warn") findings.push(target as MergeGateFinding);

  const review = reviewChecks(pr, evidence, requireRosterIdentity, currentReviewEvidence);
  checks.push(...review.checks);
  findings.push(...review.findings);

  return { ok: mergeGateOk(findings), ticketId: item.id, source: null, pr, questions, findings, checks, boardSha: evidence.board?.sha ?? null, strict: evidence.strict === true };
}

function batchRosterFailure(
  pr: MergeGatePrInput,
  ticketIds: string[],
  source: MergeGateTicketSource,
  message: string,
  details: Record<string, unknown> = {},
  evidence?: MergeGateBatchEvidence,
): MergeGateResult {
  const finding = fail("BATCH_ROSTER", "error", message, { ticketIds, ...details });
  return {
    ok: false,
    ticketId: null,
    ticketIds,
    batchId: typeof details.batchId === "string" ? details.batchId : null,
    source,
    pr,
    questions: null,
    findings: [finding],
    checks: [finding],
    boardSha: evidence?.members[0]?.evidence.board?.sha ?? null,
    strict: evidence?.strict === true,
  };
}

async function evaluateBatch(
  store: KanmerStore,
  pr: MergeGatePrInput,
  ticketIds: string[],
  source: MergeGateTicketSource,
  evidence?: MergeGateBatchEvidence,
): Promise<MergeGateResult> {
  let items: Array<Item | null | undefined>;
  let census: Item[] | undefined;
  let state: BatchState | null;
  let questions: Array<OpenQuestionCount | null>;
  let policy: DeliveryPolicy | undefined;

  if (evidence) {
    const evidenceById = new Map(evidence.members.map((member) => [member.ticketId, member]));
    const evidenceIds = [...evidenceById.keys()].sort((a, b) => a.localeCompare(b));
    const boardShas = new Set(evidence.members.map((member) => member.evidence.board?.sha ?? null));
    if (
      evidenceIds.length !== evidence.members.length || evidenceIds.join("\0") !== ticketIds.join("\0") ||
      evidence.members.some((member) =>
        member.evidence.reviewStageId !== evidence.reviewStageId ||
        member.evidence.finalStageId !== evidence.finalStageId ||
        (member.evidence.strict === true) !== (evidence.strict === true)
      ) ||
      boardShas.size > 1
    ) {
      return batchRosterFailure(
        pr,
        ticketIds,
        source,
        "phase-2 evidence does not cover one coherent snapshot of the exact batch roster",
        { evidenceTicketIds: evidenceIds, boardShas: [...boardShas] },
        evidence,
      );
    }
    items = ticketIds.map((id) => evidenceById.get(id)?.item);
    questions = ticketIds.map((id) => evidenceById.get(id)?.questions ?? null);
    state = evidence.batch;
    policy = evidence.policy;
    if (evidence.batchError) {
      return batchRosterFailure(pr, ticketIds, source, evidence.batchError, {}, evidence);
    }
  } else {
    const listed = await store.listItemsWithWarnings({ includeArchived: true });
    if (listed.warnings.length > 0) {
      return batchRosterFailure(
        pr,
        ticketIds,
        source,
        "the complete Kanmer ticket census is unreadable; batch membership cannot be proven",
        { warnings: listed.warnings.map((warning) => ({ file: warning.file, message: warning.message })) },
      );
    }
    census = listed.items;
    const byId = new Map(listed.items.map((item) => [item.id, item]));
    items = ticketIds.map((id) => byId.get(id));
    questions = await Promise.all(ticketIds.map((id) => store.getOpenQuestionCount(id)));
    state = null;
    policy = resolveDelivery(await store.getBoard());
  }

  const missing = ticketIds.filter((_, index) => !items[index] || items[index]?.type !== "ticket");
  if (missing.length > 0) {
    return batchRosterFailure(pr, ticketIds, source, `explicit Kanmer batch roster names missing or non-ticket members: ${missing.join(", ")}`, { missing }, evidence);
  }
  const batchIds = [...new Set(items.map((item) => item?.lease_batch).filter((id): id is string => Boolean(id)))];
  if (batchIds.length !== 1 || items.some((item) => !item?.lease_batch)) {
    return batchRosterFailure(
      pr,
      ticketIds,
      source,
      "multiple Kanmer footers are accepted only when every referenced ticket belongs to one frozen batch",
      { recordedBatchIds: batchIds },
      evidence,
    );
  }
  const batchId = batchIds[0]!;
  if (!evidence) {
    try {
      state = await store.batchStateFromSnapshot(ticketIds[0]!, census!);
    } catch (error) {
      return batchRosterFailure(pr, ticketIds, source, error instanceof Error ? error.message : `batch ${batchId} could not be read`, { batchId });
    }
  }
  const recordedIds = state?.members.map((member) => member.id).sort((a, b) => a.localeCompare(b)) ?? [];
  if (
    !state || state.id !== batchId || state.declaration !== "consistent" || !state.controller || !state.frozenAt ||
    recordedIds.join("\0") !== ticketIds.join("\0")
  ) {
    return batchRosterFailure(
      pr,
      ticketIds,
      source,
      `explicit Kanmer footer roster does not exactly match the complete consistent frozen batch ${batchId}`,
      {
        batchId,
        recordedTicketIds: recordedIds,
        declaration: state?.declaration ?? null,
        controller: state?.controller ?? null,
        frozenAt: state?.frozenAt ?? null,
      },
      evidence,
    );
  }
  if (!state.branch || state.branch !== pr.branch) {
    return batchRosterFailure(
      pr,
      ticketIds,
      source,
      `pull request branch "${pr.branch}" does not match frozen batch ${batchId} branch "${state.branch ?? "(missing)"}"`,
      { batchId, batchBranch: state.branch, prBranch: pr.branch },
      evidence,
    );
  }

  const memberStateById = new Map(state.members.map((member) => [member.id, member]));
  const untaken = ticketIds.filter((id) => memberStateById.get(id)?.taken !== true);
  const missingPrTrace = ticketIds.filter((_, index) =>
    !(items[index]?.prs ?? []).some((recorded) => reviewPrMatches(recorded, pr))
  );
  if (untaken.length > 0 || missingPrTrace.length > 0) {
    return batchRosterFailure(
      pr,
      ticketIds,
      source,
      `frozen batch ${batchId} lacks complete member workspace or PR evidence`,
      {
        batchId,
        untaken,
        missingPrTrace,
        recordedPrs: ticketIds.map((ticketId, index) => ({
          ticketId,
          prs: items[index]?.prs ?? [],
        })),
      },
      evidence,
    );
  }

  const targets = ticketIds.map((ticketId, index) => ({
    ticketId,
    prTarget: deliveryTargets(policy!, items[index]!).prTarget,
  }));
  if (new Set(targets.map((target) => target.prTarget)).size !== 1) {
    return batchRosterFailure(
      pr,
      ticketIds,
      source,
      `frozen batch ${batchId} resolves to incompatible PR targets; one batch cannot be merged by one PR`,
      { batchId, targets },
      evidence,
    );
  }

  if (questions.some((count) => count === null)) {
    return batchRosterFailure(pr, ticketIds, source, `one or more members of batch ${batchId} are unreadable in the current board layout`, { batchId }, evidence);
  }

  // The legacy phase-1 library call still validates the complete roster and
  // each member's questions. The production CLI always supplies phase 2.
  if (!evidence) {
    const checks: MergeGateCheck[] = [pass("BATCH_ROSTER", "error", `explicit roster exactly matches frozen batch ${batchId}`, {
      batchId,
      ticketIds,
      controller: state.controller,
      frozenAt: state.frozenAt,
    })];
    const findings: MergeGateFinding[] = [];
    for (const [index, id] of ticketIds.entries()) {
      const count = questions[index]!;
      if (count!.open > 0) {
        const finding = fail("OPEN_QUESTIONS", "error", `Kanmer ticket ${id} has ${count!.open} open question${count!.open === 1 ? "" : "s"} (${count!.checked}/${count!.total} checked)`, {
          ticketId: id,
          ...count,
        });
        checks.push(finding);
        findings.push(finding);
      } else {
        checks.push(pass("OPEN_QUESTIONS", "error", `Kanmer ticket ${id} has no open questions`, { ticketId: id, ...count! }));
      }
    }
    return { ok: mergeGateOk(findings), ticketId: null, ticketIds, batchId, source, pr, questions: null, findings, checks };
  }

  const evidenceById = new Map(evidence.members.map((member) => [member.ticketId, member]));
  const batchRoster = new Set(ticketIds);
  const checks: MergeGateCheck[] = [pass("BATCH_ROSTER", "error", `explicit roster exactly matches frozen batch ${batchId}`, {
    batchId,
    ticketIds,
    controller: state.controller,
    frozenAt: state.frozenAt,
  })];
  const findings: MergeGateFinding[] = [];
  let boardSha: string | null = null;
  for (const [index, id] of ticketIds.entries()) {
    const memberPacket = evidenceById.get(id)!;
    const memberEvidence = memberPacket.evidence;
    const member = items[index]!;
    const result = evaluatePhase2(
      member!,
      pr,
      questions[index]!,
      memberEvidence,
      policy!,
      true,
      batchRoster,
      { ticketUpdated: member!.updated, planVersion: memberPacket.planVersion },
    );
    if (boardSha === null) boardSha = memberEvidence.board?.sha ?? null;
    for (const check of result.checks ?? []) {
      const decorated = {
        ...check,
        message: `[${id}] ${check.message}`,
        details: { ticketId: id, ...(check.details ?? {}) },
      };
      checks.push(decorated);
      if (decorated.outcome === "fail" || decorated.outcome === "warn") findings.push(decorated as MergeGateFinding);
    }
  }
  return {
    ok: mergeGateOk(findings),
    ticketId: null,
    ticketIds,
    batchId,
    source,
    pr,
    questions: null,
    findings,
    checks,
    boardSha,
    strict: evidence.strict === true,
  };
}

/**
 * Evaluate the read-only merge checks. With no phase-2 evidence this retains
 * phase-1's result shape for older callers; the production CLI passes the
 * complete phase-2 evidence packet.
 */
export async function evaluateMergeGate(
  store: KanmerStore,
  pr: MergeGatePrInput,
  phase2?: MergeGatePhase2Evidence | MergeGateBatchEvidence,
): Promise<MergeGateResult> {
  const resolved = resolveMergeGateTicket(pr.body, pr.branch);
  if (resolved.ticketIds && resolved.ticketIds.length > 1) {
    return evaluateBatch(store, pr, resolved.ticketIds, resolved.source, phase2 && "kind" in phase2 ? phase2 : undefined);
  }
  if (!resolved.ticketId) {
    const singular = phase2 && !("kind" in phase2) ? phase2 : undefined;
    return singular ? phase2NoTicket(pr, resolved.error ?? "pull request has no Kanmer ticket reference", null, null, singular) : noTicket(pr, resolved.error ?? "pull request has no Kanmer ticket reference");
  }

  if (phase2 && "kind" in phase2) {
    const item = phase2.members.find((member) => member.ticketId === resolved.ticketId)?.item ?? null;
    const batchId = phase2.batch?.id ?? item?.lease_batch ?? null;
    if (phase2.batchError) {
      return batchRosterFailure(pr, [resolved.ticketId], resolved.source, phase2.batchError, {
        ...(batchId ? { batchId } : {}),
      }, phase2);
    }
    const state = phase2.batch;
    return batchRosterFailure(
      pr,
      [resolved.ticketId],
      resolved.source,
      state
        ? `Kanmer ticket ${resolved.ticketId} is one member of batch ${state.id}; the PR must name the complete manifest roster`
        : `Kanmer ticket ${resolved.ticketId} has incomplete batch evidence; the PR roster cannot be proven`,
      {
        ...(batchId ? { batchId } : {}),
        recordedTicketIds: state?.members.map((member) => member.id) ?? [],
        declaration: state?.declaration ?? null,
      },
      phase2,
    );
  }

  const item = await store.getItem(resolved.ticketId);
  if (!item || item.type !== "ticket") {
    const base = noTicket(pr, `Kanmer ticket ${resolved.ticketId} was not found on the fetched board`);
    if (!phase2 || "kind" in phase2) return { ...base, ticketId: resolved.ticketId, source: resolved.source };
    return phase2NoTicket(pr, `Kanmer ticket ${resolved.ticketId} was not found on the fetched board`, resolved.source, resolved.ticketId, phase2);
  }

  let singularBatch;
  try {
    singularBatch = await store.batchState(resolved.ticketId);
  } catch (error) {
    return batchRosterFailure(
      pr,
      [resolved.ticketId],
      resolved.source,
      error instanceof Error ? error.message : `batch ownership for ${resolved.ticketId} could not be read`,
    );
  }
  if (singularBatch) {
    return batchRosterFailure(
      pr,
      [resolved.ticketId],
      resolved.source,
      `Kanmer ticket ${resolved.ticketId} is one member of batch ${singularBatch.id}; the PR must name the complete manifest roster`,
      {
        batchId: singularBatch.id,
        recordedTicketIds: singularBatch.members.map((member) => member.id),
        declaration: singularBatch.declaration,
      },
    );
  }

  const questions = await store.getOpenQuestionCount(resolved.ticketId);
  if (!questions) throw new Error(`Kanmer ticket ${resolved.ticketId} is not readable in the current board layout`);

  if (!phase2 || "kind" in phase2) {
    const findings: MergeGateFinding[] = [];
    if (questions.open > 0) findings.push({ code: "OPEN_QUESTIONS", level: "error", outcome: "fail", message: `Kanmer ticket ${resolved.ticketId} has ${questions.open} open question${questions.open === 1 ? "" : "s"} (${questions.checked}/${questions.total} checked)` });
    return { ok: mergeGateOk(findings), ticketId: resolved.ticketId, source: resolved.source, pr, questions, findings };
  }

  // FRD-031: the target the gate expects is the project's own, read from the
  // board the gate fetched — never a constant.
  const policy = resolveDelivery(await store.getBoard());
  const result = evaluatePhase2(item, pr, questions, phase2, policy);
  return { ...result, source: resolved.source };
}

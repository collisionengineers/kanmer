import type { KanmerStore, OpenQuestionCount } from "./index.js";

export type MergeGateFindingCode =
  | "NO_TICKET"
  | "OPEN_QUESTIONS"
  | "WRONG_STAGE"
  | "DEPENDENCY_BLOCKED"
  | "NO_REVIEW_RECORD"
  | "STALE_REVIEW"
  | "COMMITS_UNREACHABLE";
export type MergeGateFindingLevel = "error" | "warning";
export type MergeGateTicketSource = "footer" | "branch" | null;
export type MergeGateCheckOutcome = "pass" | "fail" | "warn" | "skipped";

export interface MergeGatePrInput {
  number: number;
  headSha: string;
  branch: string;
  body?: string | null;
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
  details?: Record<string, unknown>;
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
}

export interface MergeGateResult {
  ok: boolean;
  ticketId: string | null;
  source: MergeGateTicketSource;
  pr: MergeGatePrInput;
  findings: MergeGateFinding[];
  questions: OpenQuestionCount | null;
  /** Complete ordered phase-1 + phase-2 verdict; omitted for legacy callers. */
  checks?: MergeGateCheck[];
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

/** Resolve a PR to a ticket, with an explicit footer taking precedence. */
export function resolveMergeGateTicket(
  body: string | null | undefined,
  branch: string,
): { ticketId: string | null; source: MergeGateTicketSource; error?: string } {
  const lines = (body ?? "").split(/\r?\n/);
  const footerLines = lines
    .map((line, index) => ({ line, index, match: FOOTER_LINE_RE.exec(line) }))
    .filter((entry) => entry.match)
    .reverse();

  if (footerLines.length > 0) {
    const ids = footerLines.map((entry) => normalizeTicketId(entry.match?.[1] ?? ""));
    if (ids.some((id) => id === null)) return { ticketId: null, source: null, error: "explicit Kanmer footer is invalid" };
    const distinct = [...new Set(ids as string[])];
    if (distinct.length > 1) return { ticketId: null, source: null, error: "multiple distinct Kanmer footers are ambiguous" };
    return { ticketId: distinct[0] ?? null, source: "footer" };
  }

  const branchId = normalizeTicketId(BRANCH_ID_RE.exec(branch)?.[1] ?? "");
  return branchId ? { ticketId: branchId, source: "branch" } : { ticketId: null, source: null };
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

function skipped(code: MergeGateFindingCode, message: string): MergeGateCheck {
  const level: MergeGateFindingLevel = code === "WRONG_STAGE" || code === "DEPENDENCY_BLOCKED" ? "error" : "warning";
  return { code, level, outcome: "skipped", message };
}

function phase2NoTicket(
  pr: MergeGatePrInput,
  message: string,
  source: MergeGateTicketSource,
  ticketId: string | null,
): MergeGateResult {
  const base = noTicket(pr, message);
  const checks: MergeGateCheck[] = [
    { code: "NO_TICKET", level: "error", outcome: "fail", message },
    skipped("OPEN_QUESTIONS", "skipped because no Kanmer ticket was resolved"),
    skipped("WRONG_STAGE", "skipped because no Kanmer ticket was resolved"),
    skipped("DEPENDENCY_BLOCKED", "skipped because no Kanmer ticket was resolved"),
    skipped("NO_REVIEW_RECORD", "skipped because no Kanmer ticket was resolved"),
    skipped("STALE_REVIEW", "skipped because no Kanmer ticket was resolved"),
    skipped("COMMITS_UNREACHABLE", "skipped because no Kanmer ticket was resolved"),
  ];
  return { ...base, ticketId, source, checks };
}

function pass(code: MergeGateFindingCode, level: MergeGateFindingLevel, message: string, details?: Record<string, unknown>): MergeGateCheck {
  return { code, level, outcome: "pass", message, ...(details ? { details } : {}) };
}

function fail(code: MergeGateFindingCode, level: MergeGateFindingLevel, message: string, details?: Record<string, unknown>): MergeGateFinding {
  return { code, level, outcome: level === "warning" ? "warn" : "fail", message, ...(details ? { details } : {}) };
}

function reviewChecks(pr: MergeGatePrInput, evidence: MergeGatePhase2Evidence): { checks: MergeGateCheck[]; findings: MergeGateFinding[] } {
  const checks: MergeGateCheck[] = [];
  const findings: MergeGateFinding[] = [];
  const review = evidence.review;

  if (review.state === "absent") {
    const finding = fail("NO_REVIEW_RECORD", "warning", "no scratch/review.md review attestation was recorded");
    checks.push(finding);
    findings.push(finding);
    checks.push({ code: "STALE_REVIEW", level: "warning", outcome: "skipped", message: "skipped because no review attestation was recorded" });
  } else if (review.state === "invalid") {
    checks.push(pass("NO_REVIEW_RECORD", "warning", "a review record is present"));
    const finding = fail("STALE_REVIEW", "warning", `review attestation is invalid: ${review.reason}`, { reason: review.reason });
    checks.push(finding);
    findings.push(finding);
  } else {
    const actual = normalizeSha(review.headSha);
    const expected = normalizeSha(pr.headSha);
    checks.push(pass("NO_REVIEW_RECORD", "warning", "review attestation is present"));
    if (!FULL_SHA_RE.test(actual) || !FULL_SHA_RE.test(expected) || actual !== expected) {
      const finding = fail("STALE_REVIEW", "warning", `review attestation head ${actual || "(missing)"} does not match PR head ${expected || "(missing)"}`, { attestedHeadSha: actual, prHeadSha: expected, verdict: review.verdict });
      checks.push(finding);
      findings.push(finding);
    } else if (review.verdict?.toLowerCase() === "needs-changes") {
      const finding = fail("STALE_REVIEW", "warning", "review attestation has verdict needs-changes; it is not an approval", { attestedHeadSha: actual, prHeadSha: expected, verdict: review.verdict });
      checks.push(finding);
      findings.push(finding);
    } else {
      checks.push(pass("STALE_REVIEW", "warning", "review attestation head matches the PR head", { attestedHeadSha: actual, verdict: review.verdict }));
    }
  }

  const commits = [...evidence.commits]
    .map((entry) => ({ ...entry, sha: normalizeSha(entry.sha) }))
    .sort((a, b) => a.sha.localeCompare(b.sha));
  const unreachable = commits.filter((entry) => entry.state === "unreachable").map((entry) => entry.sha);
  const indeterminate = commits.filter((entry) => entry.state === "indeterminate").map((entry) => entry.sha);
  if (commits.length === 0) {
    checks.push(pass("COMMITS_UNREACHABLE", "warning", "no ticket commits were recorded", { commits: [] }));
  } else if (unreachable.length > 0 || indeterminate.length > 0) {
    const finding = fail("COMMITS_UNREACHABLE", "warning", `ticket commit reachability is incomplete (${unreachable.length} unreachable, ${indeterminate.length} indeterminate)`, {
      unreachable: [...new Set(unreachable)],
      indeterminate: [...new Set(indeterminate)],
      evidence: commits.map(({ sha, state, diagnostic }) => ({ sha, state, ...(diagnostic ? { diagnostic } : {}) })),
    });
    checks.push(finding);
    findings.push(finding);
  } else {
    checks.push(pass("COMMITS_UNREACHABLE", "warning", "all recorded ticket commits are reachable", { commits: commits.map((entry) => entry.sha) }));
  }
  return { checks, findings };
}

function evaluatePhase2(
  item: { id: string; status: string; archived?: boolean },
  pr: MergeGatePrInput,
  questions: OpenQuestionCount,
  evidence: MergeGatePhase2Evidence,
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

  const review = reviewChecks(pr, evidence);
  checks.push(...review.checks);
  findings.push(...review.findings);

  return { ok: mergeGateOk(findings), ticketId: item.id, source: null, pr, questions, findings, checks };
}

/**
 * Evaluate the read-only merge checks. With no phase-2 evidence this retains
 * phase-1's result shape for older callers; the production CLI passes the
 * complete phase-2 evidence packet.
 */
export async function evaluateMergeGate(store: KanmerStore, pr: MergeGatePrInput, phase2?: MergeGatePhase2Evidence): Promise<MergeGateResult> {
  const resolved = resolveMergeGateTicket(pr.body, pr.branch);
  if (!resolved.ticketId) {
    return phase2 ? phase2NoTicket(pr, resolved.error ?? "pull request has no Kanmer ticket reference", null, null) : noTicket(pr, resolved.error ?? "pull request has no Kanmer ticket reference");
  }

  const item = await store.getItem(resolved.ticketId);
  if (!item || item.type !== "ticket") {
    const base = noTicket(pr, `Kanmer ticket ${resolved.ticketId} was not found on the fetched board`);
    if (!phase2) return { ...base, ticketId: resolved.ticketId, source: resolved.source };
    return phase2NoTicket(pr, `Kanmer ticket ${resolved.ticketId} was not found on the fetched board`, resolved.source, resolved.ticketId);
  }

  const questions = await store.getOpenQuestionCount(resolved.ticketId);
  if (!questions) throw new Error(`Kanmer ticket ${resolved.ticketId} is not readable in the current board layout`);

  if (!phase2) {
    const findings: MergeGateFinding[] = [];
    if (questions.open > 0) findings.push({ code: "OPEN_QUESTIONS", level: "error", outcome: "fail", message: `Kanmer ticket ${resolved.ticketId} has ${questions.open} open question${questions.open === 1 ? "" : "s"} (${questions.checked}/${questions.total} checked)` });
    return { ok: mergeGateOk(findings), ticketId: resolved.ticketId, source: resolved.source, pr, questions, findings };
  }

  const result = evaluatePhase2(item, pr, questions, phase2);
  return { ...result, source: resolved.source };
}

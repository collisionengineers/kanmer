import type { KanmerStore, OpenQuestionCount } from "./index.js";

export type MergeGateFindingCode = "NO_TICKET" | "OPEN_QUESTIONS";
export type MergeGateFindingLevel = "error" | "warning";
export type MergeGateTicketSource = "footer" | "branch" | null;

export interface MergeGatePrInput {
  number: number;
  headSha: string;
  branch: string;
  body?: string | null;
}

export interface MergeGateFinding {
  code: MergeGateFindingCode;
  level: MergeGateFindingLevel;
  message: string;
}

export interface MergeGateResult {
  ok: boolean;
  ticketId: string | null;
  source: MergeGateTicketSource;
  pr: MergeGatePrInput;
  findings: MergeGateFinding[];
  questions: OpenQuestionCount | null;
}

/** Keep future warning-level findings visible without making them blocking. */
export function mergeGateOk(findings: readonly MergeGateFinding[]): boolean {
  return findings.every((finding) => finding.level !== "error");
}

const FOOTER_LINE_RE = /^\s*Kanmer:\s*(.*?)\s*$/i;
const TICKET_ID_RE = /^[A-Z0-9]{2,6}-\d+$/i;
const BRANCH_ID_RE = /^([A-Z0-9]{2,6}-\d+)/i;

function normalizeTicketId(value: string): string | null {
  const id = value.trim();
  return TICKET_ID_RE.test(id) ? id.toUpperCase() : null;
}

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
    if (ids.some((id) => id === null)) {
      return { ticketId: null, source: null, error: "explicit Kanmer footer is invalid" };
    }
    const distinct = [...new Set(ids as string[])];
    if (distinct.length > 1) {
      return { ticketId: null, source: null, error: "multiple distinct Kanmer footers are ambiguous" };
    }
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
    findings: [{ code: "NO_TICKET", level: "error", message }],
  };
}

/**
 * Evaluate phase 1's merge checks. This function only reads through the
 * supplied store; it never initializes a board, prints, exits, reads process
 * environment, calls GitHub, or writes files.
 */
export async function evaluateMergeGate(store: KanmerStore, pr: MergeGatePrInput): Promise<MergeGateResult> {
  const resolved = resolveMergeGateTicket(pr.body, pr.branch);
  if (!resolved.ticketId) {
    return noTicket(pr, resolved.error ?? "pull request has no Kanmer ticket reference");
  }

  const item = await store.getItem(resolved.ticketId);
  if (!item || item.type !== "ticket") {
    return {
      ...noTicket(pr, `Kanmer ticket ${resolved.ticketId} was not found on the fetched board`),
      ticketId: resolved.ticketId,
      source: resolved.source,
    };
  }

  const questions = await store.getOpenQuestionCount(resolved.ticketId);
  if (!questions) {
    throw new Error(`Kanmer ticket ${resolved.ticketId} is not readable in the current board layout`);
  }

  const findings: MergeGateFinding[] = [];
  if (questions.open > 0) {
    findings.push({
      code: "OPEN_QUESTIONS",
      level: "error",
      message: `Kanmer ticket ${resolved.ticketId} has ${questions.open} open question${questions.open === 1 ? "" : "s"} (${questions.checked}/${questions.total} checked)`,
    });
  }

  return {
    ok: mergeGateOk(findings),
    ticketId: resolved.ticketId,
    source: resolved.source,
    pr,
    questions,
    findings,
  };
}

/**
 * Typed post-merge verification receipts (MCP-057). A receipt records that a
 * hosted CI run — the push-to-`main` `verify` job `pr.yml` already ran for
 * the exact PR merge SHA — already discharged some or all of a verification
 * packet's obligations, so `kanmer-verify` does not have to re-run them in a
 * fresh detached worktree.
 *
 * This module is pure: no IO, no `node:` imports, and it is deliberately not
 * exported from `browser.ts` (see `packages/core/scripts/check-browser.mjs`)
 * because nothing in the browser bundle consumes it. `parseProofReceipts` is
 * tolerant of an absent `receipts` key (existing proofs have none) and
 * preserves unknown fields on every parsed receipt, mirroring
 * `review-attestation.ts`'s style for the sibling `scratch/review.md`
 * contract. `assessReceipt` performs no IO either: it is handed the exact PR
 * merge SHA by its caller and reports why a receipt does or does not
 * discharge an obligation.
 */

/**
 * A single typed receipt, written into proof frontmatter beside `attempts[]`.
 * Only `github-actions-run` is a known `kind` today; unrecognised keys are
 * preserved on the parsed object rather than dropped, so a later reader (or a
 * future receipt kind) never silently loses data this module does not know
 * about.
 */
export interface ProofReceipt {
  kind: string;
  provider?: unknown;
  repo?: unknown;
  workflow?: unknown;
  event?: unknown;
  run_id?: unknown;
  attempt?: unknown;
  head_sha?: unknown;
  job?: unknown;
  conclusion?: unknown;
  url?: unknown;
  covers?: unknown;
  observed_by?: unknown;
  [key: string]: unknown;
}

export type ParseProofReceiptsResult = ProofReceipt[] | { invalid: string[] };

/**
 * Decode the `receipts[]` list from an already-parsed proof frontmatter
 * object (the caller runs `gray-matter` or equivalent; this function never
 * touches raw Markdown bytes). Absence of a `frontmatter` object, or of its
 * `receipts` key, is not an error — it is the normal shape of every proof
 * written before MCP-057 — and returns `[]`. A present `receipts` value that
 * is not an array, or an entry that is not a plain object with a non-empty
 * string `kind`, is reported in `invalid` rather than silently dropped or
 * guessed at.
 */
export function parseProofReceipts(frontmatter: unknown): ParseProofReceiptsResult {
  if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) return [];
  const raw = (frontmatter as Record<string, unknown>).receipts;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return { invalid: ["receipts must be an array when present"] };

  const receipts: ProofReceipt[] = [];
  const invalid: string[] = [];
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      invalid.push(`receipts[${index}] must be an object`);
      return;
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.kind !== "string" || record.kind.trim().length === 0) {
      invalid.push(`receipts[${index}].kind must be a non-empty string`);
      return;
    }
    // Preserve every field verbatim, including ones this module does not
    // otherwise interpret.
    receipts.push({ ...record, kind: record.kind } as ProofReceipt);
  });

  if (invalid.length > 0) return { invalid };
  return receipts;
}

export type ReceiptAssessment = { kind: "satisfied" } | { kind: "rejected"; reasons: string[] };

const FULL_SHA = /^[0-9a-f]{40}$/;
const KNOWN_RECEIPT_KINDS = new Set(["github-actions-run"]);

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Whether one receipt actually discharges an obligation bound to `mergedSha`
 * — the PR's exact merge commit SHA. Every reason below is deliberately
 * distinct so a caller (or a human reading the proof) can see exactly which
 * of the receipt's assertions failed, rather than a single opaque rejection.
 *
 * `head_sha` matching is exact and case-sensitive: a receipt is evidence
 * about one specific commit, and normalising case would let a receipt for a
 * differently-cased (but git-equal) SHA silently pass — this module never
 * assumes the two are the same object id without the caller having already
 * normalised them identically.
 */
export function assessReceipt(receipt: ProofReceipt, opts: { mergedSha: string }): ReceiptAssessment {
  const reasons: string[] = [];

  if (!nonEmptyString(receipt.kind) || !KNOWN_RECEIPT_KINDS.has(receipt.kind)) {
    reasons.push(`unknown receipt kind: ${String(receipt.kind)}`);
  }
  if (!nonEmptyString(receipt.job)) {
    reasons.push("receipt is missing job");
  }
  if (receipt.run_id === undefined || receipt.run_id === null || receipt.run_id === "") {
    reasons.push("receipt is missing run_id");
  }
  if (!nonEmptyString(receipt.url)) {
    reasons.push("receipt is missing url");
  }
  if (receipt.event !== "push") {
    reasons.push(`receipt event must be "push", got ${JSON.stringify(receipt.event)}`);
  }
  if (receipt.conclusion !== "success") {
    reasons.push(`receipt conclusion must be "success", got ${JSON.stringify(receipt.conclusion)}`);
  }
  if (!nonEmptyString(receipt.head_sha) || !FULL_SHA.test(receipt.head_sha)) {
    reasons.push("receipt head_sha must be a full 40-hex Git object id");
  } else if (receipt.head_sha !== opts.mergedSha) {
    reasons.push("receipt head_sha does not match the PR merge SHA");
  }

  return reasons.length > 0 ? { kind: "rejected", reasons } : { kind: "satisfied" };
}

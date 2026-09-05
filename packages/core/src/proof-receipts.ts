/**
 * Typed post-merge verification receipts (MCP-057), made project-declared by
 * CORE-147. A receipt records that a hosted CI run — the run the project's
 * **verification contract** names, for the exact PR merge SHA — already
 * discharged some or all of a verification packet's obligations, so
 * `kanmer-verify` does not have to re-run them in a fresh detached worktree.
 *
 * Which run that is comes from the board (`delivery.verification`, resolved by
 * `resolveDelivery`), never from a literal here: `pr.yml` / `verify` / `push`
 * is Kanmer's own contract and ships only as `DEFAULT_VERIFICATION_CONTRACT`,
 * the fallback for a board that declares none.
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

import { DEFAULT_VERIFICATION_CONTRACT, type VerificationContract } from "./types.js";

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
 * A real run id or attempt number. `typeof value === "number"` alone would
 * accept `0`, `-1`, `1.5` and `NaN`; a digit string is rejected outright
 * rather than coerced, because a receipt that could not record the id in the
 * shape GitHub reports it is not evidence this module should repair.
 */
function positiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** `"build", "test"` — the shape every contract-naming reason uses. */
function quoteList(values: readonly string[]): string {
  return values.map((value) => JSON.stringify(value)).join(", ");
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
 * normalised them identically. `conclusion` matching is exact-string, not
 * case-insensitive, for the same reason.
 *
 * `job`, `workflow` and `event` are matched against `opts.contract` — the
 * project's declared verification contract — rather than against literals. A
 * receipt naming any other job or workflow (for example `kanmer-gate`, which
 * runs on the same push as Kanmer's own `verify` job and can be green while
 * `verify` fails or has not finished) never satisfies an obligation this
 * function is asked about, however successful that other job was. Every reason
 * names the expected contract value, so a consuming repository reading a
 * rejection learns which run it should have looked up instead.
 *
 * `run_id` must be a positive integer (MCP-057 review F-002): the earlier
 * presence-only check let `run_id: 0`, `run_id: "abc"` and `run_id: false`
 * through, and a receipt whose run id cannot address a real run is not
 * evidence about anything. `attempt`, `provider` and `repo` are validated only
 * when present — MCP-057 never required them, so validating their absence
 * would retroactively invalidate a proof written under the older shape.
 *
 * `opts.contract` defaults to `DEFAULT_VERIFICATION_CONTRACT` so a caller that
 * predates the contract keeps exactly its previous meaning.
 */
export function assessReceipt(
  receipt: ProofReceipt,
  opts: { mergedSha: string; contract?: VerificationContract },
): ReceiptAssessment {
  const contract = opts.contract ?? DEFAULT_VERIFICATION_CONTRACT;
  const reasons: string[] = [];

  if (!nonEmptyString(receipt.kind) || !KNOWN_RECEIPT_KINDS.has(receipt.kind)) {
    reasons.push(`unknown receipt kind: ${String(receipt.kind)}`);
  }
  if (!nonEmptyString(receipt.job)) {
    reasons.push("receipt is missing job");
  } else if (!contract.jobs.includes(receipt.job)) {
    reasons.push(`receipt job must be one of ${quoteList(contract.jobs)}, got ${JSON.stringify(receipt.job)}`);
  }
  if (receipt.workflow !== contract.workflow) {
    reasons.push(`receipt workflow must be ${JSON.stringify(contract.workflow)}, got ${JSON.stringify(receipt.workflow)}`);
  }
  if (receipt.run_id === undefined || receipt.run_id === null || receipt.run_id === "") {
    reasons.push("receipt is missing run_id");
  } else if (!positiveInteger(receipt.run_id)) {
    reasons.push(`receipt run_id must be a positive integer, got ${JSON.stringify(receipt.run_id)}`);
  }
  if (receipt.attempt !== undefined && receipt.attempt !== null && !positiveInteger(receipt.attempt)) {
    reasons.push(`receipt attempt must be a positive integer, got ${JSON.stringify(receipt.attempt)}`);
  }
  if (receipt.provider !== undefined && !nonEmptyString(receipt.provider)) {
    reasons.push(`receipt provider must be a non-empty string, got ${JSON.stringify(receipt.provider)}`);
  }
  if (receipt.repo !== undefined && !nonEmptyString(receipt.repo)) {
    reasons.push(`receipt repo must be a non-empty string, got ${JSON.stringify(receipt.repo)}`);
  }
  if (!nonEmptyString(receipt.url)) {
    reasons.push("receipt is missing url");
  }
  if (receipt.event !== contract.event) {
    reasons.push(`receipt event must be ${JSON.stringify(contract.event)}, got ${JSON.stringify(receipt.event)}`);
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

/**
 * Whether a proof's whole `receipts` list discharges the contract — the
 * assessment reconciliation actually uses.
 *
 * Assessing receipts one at a time cannot see the hole this closes: under a
 * two-job contract, a single flawless receipt for `build` is individually
 * `satisfied`, and a caller looping over receipts would conclude the merge was
 * verified while `test` never ran at all. The set assessment reports that as
 * incomplete, naming the required jobs no accepted receipt covers.
 *
 * An empty list is `satisfied`, not rejected: no receipts is the *fallback*
 * shape — the designated verifier ran every obligation itself in the detached
 * worktree — and there is nothing to reject. That is also what keeps every
 * proof written before MCP-057 valid.
 */
export function assessReceiptSet(
  receipts: readonly ProofReceipt[],
  opts: { mergedSha: string; contract?: VerificationContract },
): ReceiptAssessment {
  const contract = opts.contract ?? DEFAULT_VERIFICATION_CONTRACT;
  if (receipts.length === 0) return { kind: "satisfied" };

  const reasons: string[] = [];
  const covered = new Set<string>();
  for (const receipt of receipts) {
    const assessment = assessReceipt(receipt, { mergedSha: opts.mergedSha, contract });
    if (assessment.kind === "rejected") reasons.push(...assessment.reasons);
    else if (typeof receipt.job === "string") covered.add(receipt.job);
  }

  // Only meaningful once something was accepted: a list whose every receipt was
  // rejected already says why, and adding "and they do not cover the jobs"
  // would be noise about receipts that count for nothing either way.
  if (covered.size > 0) {
    const missing = contract.jobs.filter((job) => !covered.has(job));
    if (missing.length > 0) {
      reasons.push(
        `receipts do not cover every required job: missing ${quoteList(missing)} (contract jobs: ${quoteList(contract.jobs)})`,
      );
    }
  }

  return reasons.length > 0 ? { kind: "rejected", reasons } : { kind: "satisfied" };
}

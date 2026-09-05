import matter from "gray-matter";
import { parseProofReceipts, type ProofReceipt } from "./proof-receipts.js";

/**
 * The typed proof record written by kanmer-verify to `proof/proof.md`
 * (CORE-129, `proof-record/2`).
 *
 * This mirrors `review-attestation.ts`'s style for the sibling
 * `scratch/review.md` contract: one exported parser, a discriminated result,
 * and a deterministic reason for every refusal. It exists because `result:` in
 * the frontmatter used to be the *only* field the Done gate, the skills and
 * `packages/mcp-server/src/reconciliation.ts` read, while the body below it was
 * free prose anyone could append to — including a later rerun that contradicted
 * the verdict. CORE-042 sat looking finished for five days on exactly that gap,
 * and GUI-141 was moved to Done because of it.
 *
 * Two rules carry the whole design:
 *
 * 1. **Every rerun that can affect the verdict is a typed entry in
 *    `attempts[]`**, and the *final* entry must be `authoritative`. A later FAIL
 *    or INCONCLUSIVE therefore cannot sit behind an earlier PASS as merely
 *    "supporting" prose — it must become the final authority or the record is
 *    invalid.
 * 2. **The top-level verdict is bound to that final authoritative entry.**
 *    `result`, `failure_class` and `verified_at` are not independent
 *    assertions; they are a restatement of the last thing that actually
 *    happened, and a restatement that disagrees is invalid rather than
 *    believed.
 *
 * Nothing here reads body prose. A record that does not declare `schema: 2` —
 * which is every proof written before this ticket, including the ones written
 * this week whose `attempts` entries have no `authority` — is reported
 * `legacy`, never heuristically upgraded and never rewritten. That is the whole
 * compatibility story: history is *described*, not reinterpreted.
 *
 * `parseProofRecord` is pure (no IO, no `node:` imports); `parseProofDocument`
 * is the thin `gray-matter` wrapper for callers holding raw bytes. Like
 * `proof-receipts.ts` this module is deliberately not exported from
 * `browser.ts` — nothing in the browser bundle consumes it.
 */

/** Where a parsed proof record stands. */
export type ProofRecordState =
  | "valid-pass"
  | "valid-fail"
  | "valid-inconclusive"
  /** No `schema: 2` — a pre-CORE-129 record, described but never validated. */
  | "legacy"
  /** Declares `schema: 2` and breaks it, or its frontmatter cannot be read. */
  | "invalid";

/** The three results an attempt may record. */
export type ProofAttemptResult = "PASS" | "FAIL" | "INCONCLUSIVE";

/** The top-level verdict, which adds the operator's human disposition. */
export type ProofRecordResult = ProofAttemptResult | "WAIVED_BY_OPERATOR";

/** Failure classes, matching `ReconciliationFailureClass` and kanmer-verify. */
export type ProofFailureClass = "implementation" | "plan" | "transient" | "inconclusive";

/** One typed entry in the attempt ledger. */
export interface ProofAttempt {
  attempted_at: string;
  result: ProofAttemptResult;
  authority: "authoritative" | "supporting";
  summary: string;
  failure_class?: ProofFailureClass;
  /** Present together with `cwd` and an integer `exit_code`, or all absent. */
  command?: string;
  cwd?: string;
  /** `null` is the explicit manual / no-process form. */
  exit_code: number | null;
}

/** A parsed `proof-record/2` document. */
export type ProofRecord =
  | { state: "legacy"; diagnostics: string[] }
  | { state: "invalid"; diagnostics: string[] }
  | {
      state: "valid-pass" | "valid-fail" | "valid-inconclusive";
      result: ProofRecordResult;
      /**
       * True only for a top-level `WAIVED_BY_OPERATOR`. A waiver is a human
       * disposition over a FAIL/INCONCLUSIVE ledger, so it reaches
       * `valid-pass` — kanmer-verify has always said a waiver permits the
       * final move — but it is flagged so an *automated* recommender can
       * decline to act on a decision only a person may take.
       */
      waived: boolean;
      mergedSha: string;
      environment: string;
      verifiedAt: string;
      failureClass?: ProofFailureClass;
      attempts: ProofAttempt[];
      receipts: ProofReceipt[];
      /** Top-level keys this build does not interpret — preserved, not dropped. */
      unknown: Record<string, unknown>;
      /** Non-fatal observations, deterministic and ordered. */
      diagnostics: string[];
    };

/**
 * Identifies the exact validation contract a census digest was computed under
 * (CORE-129 change 3). Bump it whenever a change here could move a record
 * between buckets, so a digest taken by an older build can never be replayed
 * against a newer parser to authorise a strict cutover.
 */
export const PROOF_RECORD_PARSER_VERSION = "proof-record/2#1";

/** The schema number this build validates. Anything else is not `legacy`. */
export const PROOF_RECORD_SCHEMA = 2;

const FULL_SHA = /^[0-9a-f]{40}$/u;
const ATTEMPT_RESULTS = new Set<string>(["PASS", "FAIL", "INCONCLUSIVE"]);
const AUTHORITIES = new Set<string>(["authoritative", "supporting"]);
const FAILURE_CLASSES = new Set<string>(["implementation", "plan", "transient", "inconclusive"]);
/** Classes a FAIL may carry. `inconclusive` is reserved for INCONCLUSIVE. */
const FAIL_CLASSES = new Set<string>(["implementation", "plan", "transient"]);

const KNOWN_TOP_LEVEL = new Set([
  "kind",
  "schema",
  "merged_sha",
  "environment",
  "verified_at",
  "result",
  "failure_class",
  "attempts",
  "receipts",
  "waived_by",
  "waiver_reason",
]);

const KNOWN_ATTEMPT_KEYS = new Set([
  "attempted_at",
  "result",
  "authority",
  "summary",
  "failure_class",
  "command",
  "cwd",
  "exit_code",
]);

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * An ISO-8601 instant, as a millisecond epoch, or `null`.
 *
 * A YAML `2026-09-05T04:00:00Z` scalar is loaded by `js-yaml` as a `Date`, so
 * both shapes have to be accepted here; refusing the `Date` would make the
 * record's validity depend on whether its author happened to quote the value.
 */
function instantOf(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isoOf(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/**
 * Validate one attempt. Errors are pushed with the entry's index so a record
 * with several problems names all of them in a stable order rather than only
 * the first — a census of hundreds of historical records is far more useful
 * when each entry's diagnostics are complete.
 */
function parseAttempt(raw: unknown, index: number, into: string[]): ProofAttempt | null {
  const at = `attempts[${index}]`;
  // Deliberately a *local* list, appended to the caller's at the end: sharing
  // the caller's array would make `errors.length > 0` below mean "anything
  // anywhere in the document failed", so a single bad top-level field would
  // discard every otherwise-valid attempt.
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    into.push(`${at} must be an object`);
    return null;
  }
  const entry = raw as Record<string, unknown>;

  // Attempt objects are strict, unlike the top level. The top level is a
  // document header that a future release may extend, so an unknown key there
  // is preserved and reported; an attempt is the unit the verdict is computed
  // from, and an unrecognised key on it could be an authority claim this build
  // silently ignores. Refusing is the only safe reading.
  const unknownKeys = Object.keys(entry).filter((key) => !KNOWN_ATTEMPT_KEYS.has(key)).sort();
  for (const key of unknownKeys) errors.push(`${at} has unknown key "${key}"`);

  const attemptedAt = instantOf(entry.attempted_at);
  if (attemptedAt === null) errors.push(`${at}.attempted_at must be an ISO-8601 timestamp`);

  const result = entry.result;
  if (typeof result !== "string" || !ATTEMPT_RESULTS.has(result)) {
    errors.push(`${at}.result must be one of PASS, FAIL, INCONCLUSIVE`);
  }

  const authority = entry.authority;
  if (typeof authority !== "string" || !AUTHORITIES.has(authority)) {
    errors.push(`${at}.authority must be "authoritative" or "supporting"`);
  }

  if (!nonEmpty(entry.summary)) errors.push(`${at}.summary must be a non-empty string`);

  // Evidence is all-or-none. A `command` with a null exit code cannot be told
  // apart from a manual check someone typed a command into, and a null exit
  // code beside a `cwd` is not a record of anything that ran — both are
  // ambiguous, and an ambiguous attempt must not be able to carry authority.
  const hasCommand = entry.command !== undefined;
  const hasCwd = entry.cwd !== undefined;
  const exit = entry.exit_code;
  const hasExitKey = "exit_code" in entry;
  if (!hasExitKey) {
    errors.push(`${at}.exit_code is required (an integer, or null for a manual check)`);
  } else if (exit === null) {
    if (hasCommand || hasCwd) {
      errors.push(`${at} has exit_code: null but also names command/cwd; a manual attempt records its procedure in summary`);
    }
  } else if (typeof exit !== "number" || !Number.isInteger(exit)) {
    errors.push(`${at}.exit_code must be an integer or null`);
  } else {
    if (!nonEmpty(entry.command)) errors.push(`${at}.command must be a non-empty string beside an integer exit_code`);
    if (!nonEmpty(entry.cwd)) errors.push(`${at}.cwd must be a non-empty string beside an integer exit_code`);
  }

  // Exit/result consistency is checked only when a process actually ran: a
  // manual attempt has no exit code to agree or disagree with.
  if (typeof exit === "number" && Number.isInteger(exit)) {
    if (result === "PASS" && exit !== 0) errors.push(`${at} records PASS with a non-zero exit code`);
    if (result === "FAIL" && exit === 0) errors.push(`${at} records FAIL with exit code 0`);
  }

  const failureClass = entry.failure_class;
  if (failureClass !== undefined && (typeof failureClass !== "string" || !FAILURE_CLASSES.has(failureClass))) {
    errors.push(`${at}.failure_class must be one of implementation, plan, transient, inconclusive`);
  } else if (result === "PASS" && failureClass !== undefined) {
    errors.push(`${at} records PASS and must not carry a failure_class`);
  } else if (result === "FAIL" && (typeof failureClass !== "string" || !FAIL_CLASSES.has(failureClass))) {
    errors.push(`${at} records FAIL and must carry failure_class implementation, plan or transient`);
  } else if (result === "INCONCLUSIVE" && failureClass !== "inconclusive") {
    errors.push(`${at} records INCONCLUSIVE and must carry failure_class "inconclusive"`);
  }

  if (errors.length > 0) {
    into.push(...errors);
    return null;
  }
  return {
    attempted_at: isoOf(entry.attempted_at),
    result: result as ProofAttemptResult,
    authority: authority as "authoritative" | "supporting",
    summary: entry.summary as string,
    ...(failureClass !== undefined ? { failure_class: failureClass as ProofFailureClass } : {}),
    ...(hasCommand ? { command: entry.command as string } : {}),
    ...(hasCwd ? { cwd: entry.cwd as string } : {}),
    exit_code: exit === null ? null : (exit as number),
  };
}

/**
 * Parse already-decoded proof frontmatter.
 *
 * Pure: the caller runs `gray-matter` (or `parseProofDocument` below). Callers
 * that hold only an object — the MCP reconciliation boundary, the migration
 * census — use this directly.
 */
export function parseProofRecord(frontmatter: unknown): ProofRecord {
  if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    return { state: "legacy", diagnostics: ["proof has no frontmatter record"] };
  }
  const data = frontmatter as Record<string, unknown>;

  // The one branch that decides whether this record is *validated at all*.
  // Absent `schema` is the shape of every proof written before CORE-129, and
  // saying so is the entire compatibility guarantee. A `schema` this build does
  // not know is a different matter: the author asserted a contract, and
  // pretending it is legacy would let a future (or corrupted) record buy
  // silence with an unrecognised number.
  if (data.schema === undefined) {
    return {
      state: "legacy",
      diagnostics: [
        data.kind === "proof-record"
          ? "proof-record without schema: 2 — reported as legacy and never rewritten"
          : "proof is not a schema-2 proof-record — reported as legacy and never rewritten",
      ],
    };
  }
  if (data.schema !== PROOF_RECORD_SCHEMA) {
    return { state: "invalid", diagnostics: [`schema must be ${PROOF_RECORD_SCHEMA}, got ${JSON.stringify(data.schema)}`] };
  }

  const errors: string[] = [];
  const diagnostics: string[] = [];

  if (data.kind !== "proof-record") errors.push('kind must be "proof-record"');

  const mergedSha = typeof data.merged_sha === "string" ? data.merged_sha.trim() : "";
  if (!FULL_SHA.test(mergedSha)) errors.push("merged_sha must be a full 40-hex Git object id");

  if (!nonEmpty(data.environment)) errors.push("environment must be a non-empty string");

  const verifiedAt = instantOf(data.verified_at);
  if (verifiedAt === null) errors.push("verified_at must be an ISO-8601 timestamp");

  const result = data.result;
  const RESULTS = new Set<string>(["PASS", "FAIL", "INCONCLUSIVE", "WAIVED_BY_OPERATOR"]);
  if (typeof result !== "string" || !RESULTS.has(result)) {
    errors.push("result must be one of PASS, FAIL, INCONCLUSIVE, WAIVED_BY_OPERATOR");
  }

  // A waiver is the single documented exception to top-level/final-attempt
  // binding, and it is only an exception because a *person* is named in it.
  // Without the identity and the reason it is an unattributable override, which
  // is precisely the thing this record exists to make impossible.
  const waived = result === "WAIVED_BY_OPERATOR";
  if (waived) {
    if (!nonEmpty(data.waived_by)) errors.push("WAIVED_BY_OPERATOR requires waived_by naming the operator");
    if (!nonEmpty(data.waiver_reason)) errors.push("WAIVED_BY_OPERATOR requires waiver_reason");
  } else {
    if (data.waived_by !== undefined) errors.push("waived_by is only valid with result: WAIVED_BY_OPERATOR");
    if (data.waiver_reason !== undefined) errors.push("waiver_reason is only valid with result: WAIVED_BY_OPERATOR");
  }

  const rawAttempts = data.attempts;
  const declaredAttempts = Array.isArray(rawAttempts) ? rawAttempts.length : -1;
  const attempts: ProofAttempt[] = [];
  if (!Array.isArray(rawAttempts) || rawAttempts.length === 0) {
    errors.push("attempts must be a non-empty array");
  } else {
    for (const [index, entry] of rawAttempts.entries()) {
      const parsed = parseAttempt(entry, index, errors);
      if (parsed) attempts.push(parsed);
    }
  }

  // Chronology and authority, checked only once every entry is individually
  // well-formed: reporting "attempt 3 is out of order" about an entry whose
  // timestamp did not parse would be noise.
  if (attempts.length === declaredAttempts && attempts.length > 0) {
    for (let index = 1; index < attempts.length; index += 1) {
      const previous = instantOf(attempts[index - 1].attempted_at) as number;
      const current = instantOf(attempts[index].attempted_at) as number;
      if (current === previous) {
        errors.push(`attempts[${index}].attempted_at ties attempts[${index - 1}]; attempt timestamps must strictly increase`);
      } else if (current < previous) {
        errors.push(`attempts[${index}].attempted_at precedes attempts[${index - 1}]; attempt timestamps must strictly increase`);
      }
    }

    const final = attempts[attempts.length - 1];
    if (final.authority !== "authoritative") {
      errors.push("the final attempt must be authoritative; a supporting entry may only precede the verdict");
    } else {
      // The binding rule. `verified_at` is checked as an instant rather than a
      // string so an equivalent-but-differently-formatted timestamp is not
      // refused for its punctuation.
      const finalAt = instantOf(final.attempted_at) as number;
      if (verifiedAt !== null && verifiedAt !== finalAt) {
        errors.push("verified_at must equal the final authoritative attempt's attempted_at");
      }
      if (!waived && typeof result === "string" && RESULTS.has(result) && result !== final.result) {
        errors.push(`result "${result}" disagrees with the final authoritative attempt's "${final.result}"`);
      }
      const topClass = data.failure_class;
      if (final.result === "PASS") {
        if (topClass !== undefined) errors.push("a PASS record must not carry a top-level failure_class");
      } else if (topClass !== final.failure_class) {
        errors.push(`top-level failure_class must equal the final authoritative attempt's ${JSON.stringify(final.failure_class)}`);
      }
    }
  }

  // Receipts (MCP-057) are decoded by their own parser, never re-implemented
  // here. The extra rule this record adds is internal consistency: a receipt is
  // evidence about one commit, and a receipt naming a commit other than the one
  // this very document says it verified is a self-contradicting document.
  // (Whether a receipt matches the *live* PR merge SHA is reconciliation's
  // question, under its own findings, and is deliberately not duplicated here.)
  const parsedReceipts = parseProofReceipts(data);
  let receipts: ProofReceipt[] = [];
  if (Array.isArray(parsedReceipts)) {
    receipts = parsedReceipts;
    for (const [index, receipt] of receipts.entries()) {
      const head = receipt.head_sha;
      if (head === undefined) continue;
      if (typeof head !== "string" || !FULL_SHA.test(head.trim())) {
        errors.push(`receipts[${index}].head_sha must be a full 40-hex Git object id`);
      } else if (head.trim() !== mergedSha) {
        errors.push(`receipts[${index}].head_sha does not match this record's merged_sha`);
      }
    }
  } else {
    for (const reason of parsedReceipts.invalid) errors.push(reason);
  }

  const unknown: Record<string, unknown> = {};
  for (const key of Object.keys(data).sort()) {
    if (KNOWN_TOP_LEVEL.has(key)) continue;
    unknown[key] = data[key];
    diagnostics.push(`unknown top-level key "${key}" preserved but not interpreted`);
  }

  if (errors.length > 0) return { state: "invalid", diagnostics: errors.sort() };

  const finalResult = attempts[attempts.length - 1].result;
  const state: "valid-pass" | "valid-fail" | "valid-inconclusive" = waived
    ? "valid-pass"
    : finalResult === "PASS"
      ? "valid-pass"
      : finalResult === "FAIL"
        ? "valid-fail"
        : "valid-inconclusive";
  if (waived) diagnostics.push(`operator waiver by ${String(data.waived_by).trim()} over a ${finalResult} ledger`);

  return {
    state,
    result: result as ProofRecordResult,
    waived,
    mergedSha,
    environment: (data.environment as string).trim(),
    verifiedAt: isoOf(data.verified_at),
    ...(data.failure_class !== undefined ? { failureClass: data.failure_class as ProofFailureClass } : {}),
    attempts,
    receipts,
    unknown,
    diagnostics,
  };
}

/**
 * Parse raw proof Markdown. Frontmatter that cannot be read at all is
 * `invalid`, not `legacy`: a document whose header is unparseable makes no
 * claim this build can describe, and the census must be able to name it.
 */
export function parseProofDocument(raw: string): ProofRecord {
  try {
    return parseProofRecord(matter(raw).data);
  } catch (error) {
    const reason = String(error instanceof Error ? error.message : error).replace(/[\r\n]+/gu, " ").slice(0, 240);
    return { state: "invalid", diagnostics: [`frontmatter could not be parsed: ${reason}`] };
  }
}

/** The census bucket a state falls in (CORE-129 change 3). */
export function proofCensusBucket(state: ProofRecordState): "valid" | "legacy" | "invalid" {
  if (state === "legacy") return "legacy";
  if (state === "invalid") return "invalid";
  return "valid";
}

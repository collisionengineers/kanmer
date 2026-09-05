import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { ensureDir, pathExists, readText, removeFile, writeFileAtomic } from "./io.js";
import { isValidGitBranchName } from "./board.js";
import { assertSafeChannel } from "./paths.js";
import type { KanmerPaths } from "./paths.js";
import type { DeliveryPolicy } from "./types.js";

/**
 * Release serialization — FRD-031 AC2 (immutable-candidate clause), AC3, AC4
 * and the unavailable-release-service edge case (CORE-132, goal.md Phase 14).
 *
 * Five durable on-disk artefacts under `.kanmer/releases/`, deliberately NOT in
 * `board.yml`:
 *
 * - `channels/<channel>.json` — the **mutable** lease. At most one exists per
 *   channel, and its existence *is* the "one active release per channel" rule.
 * - `heads/<channel>.json` — the durable ordinal high-water mark. It survives
 *   lease clearing so a lost immutable attempt can never make its identity
 *   available for reuse.
 * - `attempts/<channel>@<ordinal>.json` — one record per release attempt. Its
 *   identity fields are frozen at mint and a terminal attempt is frozen whole,
 *   so a failed or superseded attempt keeps its proof forever.
 * - `state.json` — a tiny board-wide transaction epoch. A release transaction
 *   marks it pending before writing any record and stable only after the whole
 *   journal has landed, so a lock-free reader can prove its snapshot stayed
 *   current without scanning immutable history while holding the write lock.
 * - `transactions/<channel>.json` — the short-lived write-ahead intent whose
 *   closed legal transition is replayed after an interruption.
 *
 * Why a sidecar rather than board config: `BoardConfigSchema` is a plain
 * `z.object()`, so an older server drops unknown keys on the next whole-board
 * write, and ADR-0021 keeps a stable v0.3.12 server on the live board
 * throughout candidate work. The item scan walks `.kanmer/areas/` only, so this
 * folder is invisible to that server rather than stripped or warned about.
 *
 * This module is pure plus filesystem reads/writes. It never spawns a
 * subprocess, never contacts a release service and never takes a lock: the
 * store's verbs own the `withLeaseLock` critical section, and the MCP boundary
 * owns everything git-shaped (AGENTS.md §8 "nothing slow, networked or
 * git-shaped belongs inside it").
 */

/** Schema version of every release sidecar record. */
export const RELEASE_RECORD_SCHEMA = 1;

/** Prefix of an immutable candidate identity, mirroring `rev1:` in `project.ts`. */
export const CANDIDATE_ID_PREFIX = "cand1";

/** Separator between a channel and its attempt ordinal. Excluded from `SAFE_ID_RE` on purpose. */
export const ATTEMPT_ID_SEPARATOR = "@";

/** How a release attempt ended, or `active` while it still owns work. */
export type ReleaseOutcome = "active" | "released" | "failed" | "superseded";

/** The attempt's recorded verification state; advisory, never a stage gate (ADR-0005). */
export type ReleaseVerificationState = "pending" | "passed" | "failed";

/** Maximum recorded attempts before the retry schedule is exhausted. */
export const RELEASE_RETRY_MAX_ATTEMPTS = 5;
/** First backoff step; each further observation doubles it. */
export const RELEASE_RETRY_BASE_MS = 60_000;

/**
 * The bounded retry schedule recorded when the caller observes the release
 * service to be unavailable (FRD-031 edge case). It is deliberately *data*, not
 * a timer: nothing in Kanmer wakes up and retries. It bounds how long an
 * attempt may claim "still trying" before its evidence becomes inconclusive,
 * and it scopes that inconclusiveness to this attempt's tickets so every other
 * ticket on the board keeps reconciling normally.
 */
export interface ReleaseRetrySchedule {
  attempts: number;
  max_attempts: number;
  backoff_ms: number;
  first_at: string;
  last_at: string;
  /** When the caller may try again; frozen once `exhausted`. */
  next_at: string;
  last_error: string;
  exhausted: boolean;
}

/** One release attempt. Identity fields are frozen at mint; terminal records are frozen whole. */
export interface ReleaseAttemptRecord {
  schema: typeof RELEASE_RECORD_SCHEMA;
  // --- frozen at mint ---
  attempt_id: string;
  channel: string;
  ordinal: number;
  /** Immutable candidate identity; digested over the integration SHA (FRD-031 AC3). */
  candidate_id: string;
  /** The immutable candidate ref, or null when the policy enables no candidates. */
  candidate_ref: string | null;
  integration_sha: string;
  release_branch: string;
  /** Exact digest of the resolved delivery policy used to mint this attempt. */
  delivery_policy_version: string;
  created_at: string;
  owner: string;
  /** The attempt this one supersedes, when it was minted by a supersede. */
  supersedes: string | null;
  // --- recordable while active ---
  release_tag: string | null;
  included_prs: string[];
  included_tickets: string[];
  artifact_manifest: string[];
  verification_state: ReleaseVerificationState;
  retry: ReleaseRetrySchedule | null;
  // --- terminal ---
  outcome: ReleaseOutcome;
  terminal_at: string | null;
  successor: string | null;
  failure_reason: string | null;
}

/** The channel lease. Its existence is the "one active release per channel" rule. */
export interface ReleaseChannelRecord {
  schema: typeof RELEASE_RECORD_SCHEMA;
  channel: string;
  attempt_id: string;
  lease_id: string;
  lease_revision: number;
  owner: string;
  acquired_at: string;
  expires_at: string;
  heartbeat_at: string;
}

/** Durable channel history head. It is not a lease and survives completion. */
export interface ReleaseChannelHeadRecord {
  schema: typeof RELEASE_RECORD_SCHEMA;
  channel: string;
  /** Highest identity ever minted on this channel. */
  latest_attempt_id: string;
  /** The only ordinal the next acquire or supersede may use. */
  next_ordinal: number;
}

/** Transaction epoch used to bind a lock-free snapshot to a later write lock. */
export interface ReleaseStateRecord {
  schema: typeof RELEASE_RECORD_SCHEMA;
  revision: number;
  phase: "pending" | "stable";
  transaction_id: string;
  channel: string;
}

/** Everything a read needs, collected in one pass and safe to classify from. */
export interface ReleaseSnapshot {
  channels: ReleaseChannelRecord[];
  heads: ReleaseChannelHeadRecord[];
  attempts: ReleaseAttemptRecord[];
  /** Interrupted, recoverable write-ahead transactions. */
  pending: ReleaseMutationJournal[];
  /**
   * True when a record exists that could not be read or parsed. Callers must
   * degrade to `unavailable` rather than reporting a neutral observation —
   * "this collector must never manufacture a neutral observation for evidence
   * it cannot inspect".
   */
  unreadable: boolean;
}

/** The fields that identify an attempt and can never change once minted. */
export const RELEASE_FROZEN_FIELDS = [
  "attempt_id",
  "channel",
  "ordinal",
  "candidate_id",
  "candidate_ref",
  "integration_sha",
  "release_branch",
  "delivery_policy_version",
  "created_at",
  "owner",
  "supersedes",
] as const satisfies readonly (keyof ReleaseAttemptRecord)[];

/** True for an attempt that has reached a terminal outcome and is frozen whole. */
export function isTerminalAttempt(attempt: Pick<ReleaseAttemptRecord, "outcome">): boolean {
  return attempt.outcome !== "active";
}

/**
 * One cross-record invariant for snapshot admission, journal recovery and
 * locked mutation authority. A cleared lease is coherent only at a released
 * head; every held endpoint names the same identity and immutable owner.
 */
export function releaseEndpointConsistent(
  head: ReleaseChannelHeadRecord | null,
  lease: ReleaseChannelRecord | null,
  attempt: ReleaseAttemptRecord | null,
): boolean {
  if (head === null) return lease === null && attempt === null;
  if (!releaseHeadMatchesAttempt(head, attempt)) return false;
  if (lease === null) return attempt.outcome === "released";
  return lease.channel === head.channel && lease.attempt_id === head.latest_attempt_id &&
    lease.owner === attempt.owner && attempt.outcome !== "released" && attempt.outcome !== "superseded";
}

/** The identity-only half of the head invariant, used by conservative reads. */
export function releaseHeadMatchesAttempt(
  head: ReleaseChannelHeadRecord,
  attempt: ReleaseAttemptRecord | null,
): attempt is ReleaseAttemptRecord {
  return Boolean(
    attempt && attempt.channel === head.channel && attempt.attempt_id === head.latest_attempt_id &&
      attempt.ordinal + 1 === head.next_ordinal,
  );
}

/** The attempt id for a channel and ordinal — `<channel>@<ordinal>`. */
export function attemptIdFor(channel: string, ordinal: number): string {
  return `${normalizeReleaseChannel(channel)}${ATTEMPT_ID_SEPARATOR}${ordinal}`;
}

/** Split an attempt id back into its channel and ordinal, or null when it is not one. */
export function parseAttemptId(attemptId: string): { channel: string; ordinal: number } | null {
  const at = attemptId.lastIndexOf(ATTEMPT_ID_SEPARATOR);
  if (at <= 0) return null;
  const channel = attemptId.slice(0, at);
  const ordinalText = attemptId.slice(at + 1);
  if (!/^[1-9]\d*$/.test(ordinalText)) return null;
  const ordinal = Number(ordinalText);
  if (!Number.isSafeInteger(ordinal)) return null;
  try {
    if (normalizeReleaseChannel(channel) !== channel) return null;
  } catch {
    return null;
  }
  if (attemptIdFor(channel, ordinal) !== attemptId) return null;
  return { channel, ordinal };
}

/**
 * Canonical release-channel identity. Git refs remain case-sensitive, but a
 * filesystem lease cannot safely be so on Windows. Every caller and persisted
 * record therefore uses one lower-case identity; `Main` and `main` contend for
 * the same channel instead of becoming two writers on different hosts.
 */
export function normalizeReleaseChannel(channel: string): string {
  const value = channel.trim();
  assertSafeChannel(value);
  return value.toLowerCase();
}

/** Stable version of the complete resolved delivery policy. */
export function deliveryPolicyVersion(policy: DeliveryPolicy): string {
  // Enumerated, never spread: the four fields below are the ones that decide
  // where a candidate integrates and releases from. `verification` (CORE-147)
  // is deliberately excluded — it says which run *proves* a merge, not where
  // the merge goes, so declaring a contract must not invalidate candidates or
  // shift the policy digests already recorded in `.kanmer/releases/`.
  return createHash("sha256")
    .update(JSON.stringify({
      integrationBranch: policy.integrationBranch,
      releaseBranch: policy.releaseBranch,
      releaseCandidatePattern: policy.releaseCandidatePattern,
      hotfixBackport: policy.hotfixBackport,
    }), "utf8")
    .digest("hex");
}

/**
 * The immutable candidate identity: a digest over the channel, the exact
 * integration SHA and the attempt ordinal.
 *
 * Digesting the SHA is what makes FRD-031 AC3 structural rather than a rule
 * somebody has to remember — remediation at a different SHA *cannot* produce
 * the same candidate identity, so old candidate evidence can never be passed
 * off as applying to a changed SHA.
 */
export function candidateIdentity(channel: string, integrationSha: string, ordinal: number): string {
  const canonicalChannel = normalizeReleaseChannel(channel);
  const digest = createHash("sha256")
    .update(`${canonicalChannel}\n${integrationSha}\n${ordinal}`, "utf8")
    .digest("hex")
    .slice(0, 16);
  return `${CANDIDATE_ID_PREFIX}:${digest}`;
}

/**
 * The immutable candidate ref, or null when the project enables no candidates.
 * `assertDeliveryPolicy` already guarantees the pattern contains `*`; every
 * occurrence receives the same immutable token so no wildcard can survive in
 * the Git ref handed to the release process.
 */
export function candidateRefFor(policy: Pick<DeliveryPolicy, "releaseCandidatePattern">, channel: string, ordinal: number): string | null {
  const pattern = policy.releaseCandidatePattern;
  if (!pattern) return null;
  const token = `${normalizeReleaseChannel(channel)}-${ordinal}`;
  const candidateRef = pattern.replaceAll("*", token);
  if (!isValidGitBranchName(candidateRef)) {
    throw new Error(
      `Invalid release candidate ref "${candidateRef}": delivery.releaseCandidatePattern produced a name Git cannot use as a branch.`,
    );
  }
  return candidateRef;
}

/** A fresh lease id. Its own uuid, exactly like a ticket lease's `lease_id`. */
export function newReleaseLeaseId(): string {
  return randomUUID();
}

/**
 * Fold one "the release service was unavailable" observation into the bounded
 * schedule. The backoff doubles from {@link RELEASE_RETRY_BASE_MS}; once
 * `max_attempts` observations are recorded the schedule is `exhausted` and
 * `next_at` stops advancing, so it can never grow without bound and can never
 * be used to claim indefinite progress.
 */
export function nextRetry(
  previous: ReleaseRetrySchedule | null,
  error: string,
  now: Date,
  maxAttempts: number = RELEASE_RETRY_MAX_ATTEMPTS,
): ReleaseRetrySchedule {
  if (previous?.exhausted) return previous;
  const at = now.toISOString();
  const attempts = Math.min((previous?.attempts ?? 0) + 1, maxAttempts);
  const exhausted = attempts >= maxAttempts;
  const backoffMs = RELEASE_RETRY_BASE_MS * 2 ** Math.min(attempts - 1, maxAttempts - 1);
  return {
    attempts,
    max_attempts: maxAttempts,
    backoff_ms: backoffMs,
    first_at: previous?.first_at ?? at,
    last_at: at,
    next_at: new Date(now.getTime() + backoffMs).toISOString(),
    last_error: error,
    exhausted,
  };
}

/** Whether a channel lease has passed its recorded expiry. Expiry never releases anything. */
export function releaseLeaseExpired(channel: Pick<ReleaseChannelRecord, "expires_at">, now: Date): boolean {
  const expires = Date.parse(channel.expires_at);
  // An unparseable expiry never expires silently — the same rule `leaseState` uses.
  if (Number.isNaN(expires)) return false;
  return expires < now.getTime();
}

/** What every release verb accepts: which channel and the injected test clock. */
export interface ReleaseChannelInput {
  /** Defaults to the board's resolved release branch. */
  channel?: string;
  /** Injected clock for deterministic tests. */
  now?: Date;
}

/** A verb that writes through an existing lease names it and its revision. */
export interface ReleaseChannelCasInput extends ReleaseChannelInput {
  leaseId: string;
  leaseRevision: number;
}

export interface AcquireReleaseChannelInput extends ReleaseChannelInput {
  /** Exact 40-hex integration SHA the candidate is minted from. */
  integrationSha: string;
  /** Policy digest collected with the SHA; a changed board is refused inside the lock. */
  expectedPolicyVersion: string;
  includedPrs?: readonly string[];
  includedTickets?: readonly string[];
}

export interface RecordReleaseProgressInput extends ReleaseChannelCasInput {
  verificationState?: ReleaseVerificationState;
  releaseTag?: string;
  includedPrs?: readonly string[];
  includedTickets?: readonly string[];
  artifactManifest?: readonly string[];
  /** One bounded observation that the release service could not be reached. */
  serviceUnavailable?: string;
  /** Clear a retry schedule once the caller has observed the service again. */
  serviceRecovered?: true;
}

export interface SupersedeReleaseAttemptInput extends ReleaseChannelCasInput {
  /** The successor's integration SHA; a different SHA mints a different candidate identity. */
  integrationSha: string;
  /** Policy digest collected with the SHA; a changed board is refused inside the lock. */
  expectedPolicyVersion: string;
  /** Required to supersede a live lease you do not own, and only as `operator: ...`. */
  reason?: string;
  includedPrs?: readonly string[];
  includedTickets?: readonly string[];
}

export interface CompleteReleaseAttemptInput extends ReleaseChannelCasInput {
  releaseTag?: string;
  artifactManifest?: readonly string[];
}

export interface FailReleaseAttemptInput extends ReleaseChannelCasInput {
  reason: string;
}

/** What every release verb returns: the channel, its lease (null once cleared) and the attempt. */
export interface ReleaseChannelResult {
  channel: string;
  lease: ReleaseChannelRecord | null;
  attempt: ReleaseAttemptRecord;
  leaseState: "current" | "expired" | "cleared";
}

// ---------------------------------------------------------------------------
// Record IO. Filesystem only: no lock, no subprocess, no network.
// ---------------------------------------------------------------------------

/** Absolute path of a channel's lease record. */
export function channelFile(paths: KanmerPaths, channel: string): string {
  const canonical = normalizeReleaseChannel(channel);
  return path.join(paths.releaseChannelsDir, `${canonical}.json`);
}

/** Absolute path of a channel's durable ordinal high-water head. */
export function channelHeadFile(paths: KanmerPaths, channel: string): string {
  const canonical = normalizeReleaseChannel(channel);
  return path.join(paths.releaseHeadsDir, `${canonical}.json`);
}

/** Absolute path of an attempt record. */
export function attemptFile(paths: KanmerPaths, attemptId: string): string {
  const parsed = parseAttemptId(attemptId);
  if (!parsed) throw new Error(`Invalid release attempt id "${attemptId}"`);
  assertSafeChannel(parsed.channel);
  return path.join(paths.releaseAttemptsDir, `${attemptId}.json`);
}

/** Absolute path of a channel's recoverable write-ahead transaction. */
export function releaseTransactionFile(paths: KanmerPaths, channel: string): string {
  const canonical = normalizeReleaseChannel(channel);
  return path.join(paths.releaseTransactionsDir, `${canonical}.json`);
}

interface ReleaseMutationValue<T> {
  /** Exact state observed while the board write lock was held. */
  before: T | null;
  /** Exact state the mutation commits; null means remove the mutable channel. */
  after: T | null;
}

export interface ReleaseMutationJournal {
  schema: typeof RELEASE_RECORD_SCHEMA;
  transaction_id: string;
  channel: string;
  created_at: string;
  attempts: ReleaseMutationValue<ReleaseAttemptRecord>[];
  head_record: ReleaseMutationValue<ReleaseChannelHeadRecord>;
  channel_record: ReleaseMutationValue<ReleaseChannelRecord>;
}

const RELEASE_RETRY_FIELDS = [
  "attempts",
  "max_attempts",
  "backoff_ms",
  "first_at",
  "last_at",
  "next_at",
  "last_error",
  "exhausted",
] as const satisfies readonly (keyof ReleaseRetrySchedule)[];

const RELEASE_CHANNEL_FIELDS = [
  "schema",
  "channel",
  "attempt_id",
  "lease_id",
  "lease_revision",
  "owner",
  "acquired_at",
  "expires_at",
  "heartbeat_at",
] as const satisfies readonly (keyof ReleaseChannelRecord)[];

const RELEASE_HEAD_FIELDS = [
  "schema",
  "channel",
  "latest_attempt_id",
  "next_ordinal",
] as const satisfies readonly (keyof ReleaseChannelHeadRecord)[];

const RELEASE_STATE_FIELDS = [
  "schema",
  "revision",
  "phase",
  "transaction_id",
  "channel",
] as const satisfies readonly (keyof ReleaseStateRecord)[];

const RELEASE_ATTEMPT_FIELDS = [
  "schema",
  "attempt_id",
  "channel",
  "ordinal",
  "candidate_id",
  "candidate_ref",
  "integration_sha",
  "release_branch",
  "delivery_policy_version",
  "created_at",
  "owner",
  "supersedes",
  "release_tag",
  "included_prs",
  "included_tickets",
  "artifact_manifest",
  "verification_state",
  "retry",
  "outcome",
  "terminal_at",
  "successor",
  "failure_reason",
] as const satisfies readonly (keyof ReleaseAttemptRecord)[];

const RELEASE_MUTATION_FIELDS = ["before", "after"] as const satisfies readonly (keyof ReleaseMutationValue<unknown>)[];

const RELEASE_JOURNAL_FIELDS = [
  "schema",
  "transaction_id",
  "channel",
  "created_at",
  "attempts",
  "head_record",
  "channel_record",
] as const satisfies readonly (keyof ReleaseMutationJournal)[];

function hasExactKeys(value: unknown, expected: readonly string[]): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isRetrySchedule(value: unknown): value is ReleaseRetrySchedule {
  if (!hasExactKeys(value, RELEASE_RETRY_FIELDS)) return false;
  const retry = value as Partial<ReleaseRetrySchedule> | null;
  if (!retry) return false;
  return Boolean(
    Number.isSafeInteger(retry.attempts) && retry.attempts! >= 1 &&
      Number.isSafeInteger(retry.max_attempts) && retry.max_attempts === RELEASE_RETRY_MAX_ATTEMPTS &&
      retry.attempts! <= retry.max_attempts! &&
      typeof retry.backoff_ms === "number" && Number.isFinite(retry.backoff_ms) && retry.backoff_ms >= 0 &&
      isIsoTimestamp(retry.first_at) &&
      isIsoTimestamp(retry.last_at) &&
      isIsoTimestamp(retry.next_at) &&
      isNonEmptyString(retry.last_error) &&
      typeof retry.exhausted === "boolean" &&
      retry.exhausted === (retry.attempts === retry.max_attempts),
  );
}

function isChannelRecord(value: unknown): value is ReleaseChannelRecord {
  if (!hasExactKeys(value, RELEASE_CHANNEL_FIELDS)) return false;
  const record = value as Partial<ReleaseChannelRecord> | null;
  if (!record || record.schema !== RELEASE_RECORD_SCHEMA || !isNonEmptyString(record.channel)) return false;
  let channel: string;
  try {
    channel = normalizeReleaseChannel(record.channel);
  } catch {
    return false;
  }
  const parsed = typeof record.attempt_id === "string" ? parseAttemptId(record.attempt_id) : null;
  return Boolean(
    channel === record.channel &&
      parsed?.channel === channel &&
      isNonEmptyString(record.lease_id) &&
      Number.isInteger(record.lease_revision) && record.lease_revision! >= 1 &&
      isNonEmptyString(record.owner) &&
      isIsoTimestamp(record.acquired_at) &&
      isIsoTimestamp(record.expires_at) &&
      isIsoTimestamp(record.heartbeat_at),
  );
}

function isChannelHeadRecord(value: unknown): value is ReleaseChannelHeadRecord {
  if (!hasExactKeys(value, RELEASE_HEAD_FIELDS)) return false;
  const record = value as Partial<ReleaseChannelHeadRecord> | null;
  if (!record || record.schema !== RELEASE_RECORD_SCHEMA || !isNonEmptyString(record.channel)) return false;
  let channel: string;
  try {
    channel = normalizeReleaseChannel(record.channel);
  } catch {
    return false;
  }
  const latest = typeof record.latest_attempt_id === "string" ? parseAttemptId(record.latest_attempt_id) : null;
  return Boolean(
    channel === record.channel &&
      latest?.channel === channel &&
      Number.isSafeInteger(record.next_ordinal) &&
      record.next_ordinal === latest.ordinal + 1,
  );
}

function isReleaseStateRecord(value: unknown): value is ReleaseStateRecord {
  if (!hasExactKeys(value, RELEASE_STATE_FIELDS)) return false;
  const record = value as Partial<ReleaseStateRecord> | null;
  if (!record || record.schema !== RELEASE_RECORD_SCHEMA || !isNonEmptyString(record.channel)) return false;
  let channel: string;
  try {
    channel = normalizeReleaseChannel(record.channel);
  } catch {
    return false;
  }
  return Boolean(
    channel === record.channel && Number.isSafeInteger(record.revision) && record.revision! >= 1 &&
      (record.phase === "pending" || record.phase === "stable") && isNonEmptyString(record.transaction_id),
  );
}

function isAttemptRecord(value: unknown): value is ReleaseAttemptRecord {
  if (!hasExactKeys(value, RELEASE_ATTEMPT_FIELDS)) return false;
  const record = value as Partial<ReleaseAttemptRecord> | null;
  if (!record || record.schema !== RELEASE_RECORD_SCHEMA || !isNonEmptyString(record.channel)) return false;
  let channel: string;
  try {
    channel = normalizeReleaseChannel(record.channel);
  } catch {
    return false;
  }
  const parsed = typeof record.attempt_id === "string" ? parseAttemptId(record.attempt_id) : null;
  const outcome = record.outcome;
  const terminal = outcome === "released" || outcome === "failed" || outcome === "superseded";
  const predecessor = record.supersedes === null
    ? null
    : typeof record.supersedes === "string" ? parseAttemptId(record.supersedes) : undefined;
  const successor = record.successor === null
    ? null
    : typeof record.successor === "string" ? parseAttemptId(record.successor) : undefined;
  return Boolean(
    channel === record.channel &&
      parsed?.channel === channel && parsed.ordinal === record.ordinal &&
      Number.isInteger(record.ordinal) && record.ordinal! >= 1 &&
      typeof record.integration_sha === "string" && /^[0-9a-f]{40}$/.test(record.integration_sha) &&
      record.candidate_id === candidateIdentity(channel, record.integration_sha, record.ordinal!) &&
      (record.candidate_ref === null || (typeof record.candidate_ref === "string" && isValidGitBranchName(record.candidate_ref))) &&
      isNonEmptyString(record.release_branch) && isValidGitBranchName(record.release_branch) &&
      typeof record.delivery_policy_version === "string" && /^[0-9a-f]{64}$/.test(record.delivery_policy_version) &&
      isIsoTimestamp(record.created_at) &&
      isNonEmptyString(record.owner) &&
      predecessor !== undefined && (predecessor === null || (predecessor.channel === channel && predecessor.ordinal < record.ordinal!)) &&
      (record.release_tag === null || typeof record.release_tag === "string") &&
      isStringArray(record.included_prs) &&
      isStringArray(record.included_tickets) &&
      isStringArray(record.artifact_manifest) &&
      (record.verification_state === "pending" || record.verification_state === "passed" || record.verification_state === "failed") &&
      (record.retry === null || isRetrySchedule(record.retry)) &&
      (outcome === "active" || terminal) &&
      (terminal ? isIsoTimestamp(record.terminal_at) : record.terminal_at === null) &&
      successor !== undefined &&
      (successor === null || (successor.channel === channel && successor.ordinal > record.ordinal!)) &&
      (record.failure_reason === null || typeof record.failure_reason === "string") &&
      (outcome !== "failed" || isNonEmptyString(record.failure_reason)) &&
      (outcome !== "superseded" || successor !== null) &&
      (outcome !== "active" || successor === null),
  );
}

function attemptEqualExcept(
  before: ReleaseAttemptRecord,
  after: ReleaseAttemptRecord,
  mutable: ReadonlySet<keyof ReleaseAttemptRecord>,
): boolean {
  return RELEASE_ATTEMPT_FIELDS.every((field) => mutable.has(field) || isDeepStrictEqual(before[field], after[field]));
}

function frozenAttemptFieldsMatch(before: ReleaseAttemptRecord, after: ReleaseAttemptRecord): boolean {
  return RELEASE_FROZEN_FIELDS.every((field) => isDeepStrictEqual(before[field], after[field]));
}

function retryTransitionIsLegal(
  before: ReleaseRetrySchedule | null,
  after: ReleaseRetrySchedule | null,
  createdAt: string,
): boolean {
  if (isDeepStrictEqual(before, after) || after === null) return true;
  return isDeepStrictEqual(nextRetry(before, after.last_error, new Date(createdAt)), after);
}

function freshAttemptIsLegal(
  attempt: ReleaseAttemptRecord,
  createdAt: string,
  supersedes: string | null,
): boolean {
  return attempt.created_at === createdAt && attempt.supersedes === supersedes &&
    attempt.release_tag === null && attempt.artifact_manifest.length === 0 &&
    attempt.verification_state === "pending" && attempt.retry === null &&
    attempt.outcome === "active" && attempt.terminal_at === null &&
    attempt.successor === null && attempt.failure_reason === null;
}

function freshLeaseIsLegal(
  lease: ReleaseChannelRecord,
  attempt: ReleaseAttemptRecord,
  createdAt: string,
): boolean {
  return lease.channel === attempt.channel && lease.attempt_id === attempt.attempt_id &&
    lease.owner === attempt.owner && lease.lease_revision === 1 &&
    lease.acquired_at === createdAt && lease.heartbeat_at === createdAt &&
    Date.parse(lease.expires_at) > Date.parse(createdAt);
}

function renewedLeaseIsLegal(
  before: ReleaseChannelRecord,
  after: ReleaseChannelRecord,
  createdAt: string,
): boolean {
  return before.schema === after.schema && before.channel === after.channel &&
    before.attempt_id === after.attempt_id && before.lease_id === after.lease_id &&
    before.owner === after.owner && before.acquired_at === after.acquired_at &&
    after.lease_revision === before.lease_revision + 1 &&
    after.heartbeat_at === createdAt && Date.parse(after.heartbeat_at) >= Date.parse(before.heartbeat_at) &&
    Date.parse(after.expires_at) > Date.parse(createdAt);
}

function activeProgressTransitionIsLegal(
  before: ReleaseAttemptRecord,
  after: ReleaseAttemptRecord,
  createdAt: string,
): boolean {
  const progress = new Set<keyof ReleaseAttemptRecord>([
    "release_tag",
    "included_prs",
    "included_tickets",
    "artifact_manifest",
    "verification_state",
    "retry",
  ]);
  return before.outcome === "active" && after.outcome === "active" &&
    attemptEqualExcept(before, after, progress) && retryTransitionIsLegal(before.retry, after.retry, createdAt);
}

function failedTransitionIsLegal(
  before: ReleaseAttemptRecord,
  after: ReleaseAttemptRecord,
  createdAt: string,
): boolean {
  const failure = new Set<keyof ReleaseAttemptRecord>(["verification_state", "outcome", "terminal_at", "failure_reason"]);
  return before.outcome === "active" && after.outcome === "failed" &&
    after.verification_state === "failed" && after.terminal_at === createdAt &&
    isNonEmptyString(after.failure_reason) && attemptEqualExcept(before, after, failure);
}

function completedTransitionIsLegal(
  before: ReleaseAttemptRecord,
  after: ReleaseAttemptRecord,
  createdAt: string,
): boolean {
  const completion = new Set<keyof ReleaseAttemptRecord>(["release_tag", "artifact_manifest", "outcome", "terminal_at"]);
  return before.outcome === "active" && after.outcome === "released" &&
    after.terminal_at === createdAt && attemptEqualExcept(before, after, completion);
}

function supersededTransitionIsLegal(
  before: ReleaseAttemptRecord,
  after: ReleaseAttemptRecord,
  successor: ReleaseAttemptRecord,
  createdAt: string,
): boolean {
  const supersession = new Set<keyof ReleaseAttemptRecord>(["outcome", "terminal_at", "successor", "failure_reason"]);
  const reasonPreservedOrAdded = after.failure_reason === before.failure_reason ||
    (before.failure_reason === null && typeof after.failure_reason === "string");
  return before.outcome === "active" && after.outcome === "superseded" &&
    after.terminal_at === createdAt && after.successor === successor.attempt_id &&
    reasonPreservedOrAdded && attemptEqualExcept(before, after, supersession);
}

/**
 * A journal is a closed union of the six release mutations, inferred from its
 * before/after endpoints. Recovery never accepts an arbitrary list of writes:
 * it may touch only the current head attempt and, when the head advances, one
 * freshly minted successor.
 */
function isReleaseMutationSemanticallyValid(journal: ReleaseMutationJournal): boolean {
  const attempts = journal.attempts;
  const beforeHead = journal.head_record.before;
  const afterHead = journal.head_record.after;
  const beforeLease = journal.channel_record.before;
  const afterLease = journal.channel_record.after;
  if (afterHead === null) return false;

  const afterIds = attempts.map((mutation) => mutation.after!.attempt_id);
  if (new Set(afterIds).size !== afterIds.length) return false;
  const existing = attempts.filter((mutation) => mutation.before !== null);
  const minted = attempts.filter((mutation) => mutation.before === null);
  if (beforeHead === null) {
    if (existing.length !== 0) return false;
  } else if (
    existing.length !== 1 || existing[0]!.before!.attempt_id !== beforeHead.latest_attempt_id
  ) {
    return false;
  }

  for (const mutation of existing) {
    const before = mutation.before!;
    const after = mutation.after!;
    if (!frozenAttemptFieldsMatch(before, after)) return false;
    if (isTerminalAttempt(before) && !isDeepStrictEqual(before, after)) return false;
  }

  const beforeAttempt = existing[0]?.before ?? null;
  const afterExisting = existing[0]?.after ?? null;
  if (!releaseEndpointConsistent(beforeHead, beforeLease, beforeAttempt)) return false;

  const headUnchanged = beforeHead !== null && isDeepStrictEqual(beforeHead, afterHead);
  if (headUnchanged) {
    if (attempts.length !== 1 || minted.length !== 0 || beforeAttempt === null || afterExisting === null) return false;
    if (afterExisting.attempt_id !== afterHead.latest_attempt_id) return false;
    if (!releaseEndpointConsistent(afterHead, afterLease, afterExisting) || beforeLease === null) return false;

    if (afterLease === null) {
      return completedTransitionIsLegal(beforeAttempt, afterExisting, journal.created_at);
    }
    if (!renewedLeaseIsLegal(beforeLease, afterLease, journal.created_at)) return false;
    return isDeepStrictEqual(beforeAttempt, afterExisting) ||
      activeProgressTransitionIsLegal(beforeAttempt, afterExisting, journal.created_at) ||
      failedTransitionIsLegal(beforeAttempt, afterExisting, journal.created_at);
  }

  if (minted.length !== 1 || attempts.length !== (beforeHead === null ? 1 : 2) || afterLease === null) return false;
  const successor = minted[0]!.after!;
  const expectedOrdinal = beforeHead?.next_ordinal ?? 1;
  if (
    successor.ordinal !== expectedOrdinal || afterHead.latest_attempt_id !== successor.attempt_id ||
    afterHead.next_ordinal !== expectedOrdinal + 1 || afterHead.channel !== successor.channel ||
    (beforeHead !== null && afterHead.channel !== beforeHead.channel) ||
    !freshLeaseIsLegal(afterLease, successor, journal.created_at) ||
    !releaseEndpointConsistent(afterHead, afterLease, successor)
  ) {
    return false;
  }

  if (beforeHead === null) {
    return beforeLease === null && successor.supersedes === null &&
      freshAttemptIsLegal(successor, journal.created_at, null);
  }
  if (beforeAttempt === null || afterExisting === null) return false;
  if (beforeLease === null) {
    return beforeAttempt.outcome === "released" && isDeepStrictEqual(beforeAttempt, afterExisting) &&
      freshAttemptIsLegal(successor, journal.created_at, null);
  }
  if (afterLease.lease_id === beforeLease.lease_id) return false;
  const predecessorValid = beforeAttempt.outcome === "failed"
    ? isDeepStrictEqual(beforeAttempt, afterExisting)
    : supersededTransitionIsLegal(beforeAttempt, afterExisting, successor, journal.created_at);
  return predecessorValid && freshAttemptIsLegal(successor, journal.created_at, beforeAttempt.attempt_id);
}

function isReleaseMutationValue<T>(value: unknown, accept: (candidate: unknown) => candidate is T): value is ReleaseMutationValue<T> {
  if (!hasExactKeys(value, RELEASE_MUTATION_FIELDS)) return false;
  const mutation = value as Partial<ReleaseMutationValue<T>> | null;
  return Boolean(
    mutation &&
      Object.prototype.hasOwnProperty.call(mutation, "before") &&
      Object.prototype.hasOwnProperty.call(mutation, "after") &&
      (mutation.before === null || accept(mutation.before)) &&
      (mutation.after === null || accept(mutation.after)),
  );
}

function isReleaseMutationJournal(value: unknown): value is ReleaseMutationJournal {
  if (!hasExactKeys(value, RELEASE_JOURNAL_FIELDS)) return false;
  const journal = value as Partial<ReleaseMutationJournal> | null;
  if (!journal || journal.schema !== RELEASE_RECORD_SCHEMA || !isNonEmptyString(journal.channel)) return false;
  let channel: string;
  try {
    channel = normalizeReleaseChannel(journal.channel);
  } catch {
    return false;
  }
  const structurallyValid = Boolean(
    channel === journal.channel &&
      isNonEmptyString(journal.transaction_id) &&
      isIsoTimestamp(journal.created_at) &&
      Array.isArray(journal.attempts) && journal.attempts.length >= 1 &&
      journal.attempts.every((mutation) =>
        isReleaseMutationValue(mutation, isAttemptRecord) &&
        mutation.after !== null &&
        mutation.after.channel === channel &&
        (mutation.before === null || mutation.before.attempt_id === mutation.after.attempt_id)) &&
      isReleaseMutationValue(journal.head_record, isChannelHeadRecord) &&
      journal.head_record.after !== null &&
      (journal.head_record.before === null || journal.head_record.before.channel === channel) &&
      journal.head_record.after.channel === channel &&
      (journal.head_record.before === null ||
        journal.head_record.after.next_ordinal >= journal.head_record.before.next_ordinal) &&
      isReleaseMutationValue(journal.channel_record, isChannelRecord) &&
      (journal.channel_record.before === null || journal.channel_record.before.channel === channel) &&
      (journal.channel_record.after === null || journal.channel_record.after.channel === channel),
  );
  if (!structurallyValid) return false;

  return isReleaseMutationSemanticallyValid(journal as ReleaseMutationJournal);
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

async function readOptionalRecord<T>(
  file: string,
  accept: (value: unknown) => value is T,
  kind: string,
): Promise<T | null> {
  let text: string;
  try {
    text = await readText(file);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return null;
    throw new Error(`RELEASE_RECORD_UNREADABLE: ${kind} at ${file} cannot be read (${error instanceof Error ? error.message : String(error)}).`);
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!accept(parsed)) throw new Error("record does not satisfy the complete schema");
    return parsed;
  } catch (error) {
    throw new Error(
      `RELEASE_RECORD_UNREADABLE: ${kind} at ${file} is malformed (${error instanceof Error ? error.message : String(error)}). ` +
        `Ownership evidence fails closed and will not be overwritten.`,
    );
  }
}

async function readJsonDir<T>(
  dir: string,
  accept: (value: unknown) => value is T,
  expectedName: (value: T) => string,
): Promise<{ values: T[]; unreadable: boolean }> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return { values: [], unreadable: false };
    return { values: [], unreadable: true };
  }
  const values: T[] = [];
  let unreadable = false;
  for (const name of names.sort()) {
    if (!name.toLowerCase().endsWith(".json")) continue;
    if (!name.endsWith(".json")) {
      unreadable = true;
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(await readText(path.join(dir, name)));
      if (accept(parsed) && expectedName(parsed) === name) values.push(parsed);
      else unreadable = true;
    } catch {
      unreadable = true;
    }
  }
  return { values, unreadable };
}

/** Collect one potentially concurrent view of every release-record directory. */
async function collectReleaseSnapshot(paths: KanmerPaths): Promise<ReleaseSnapshot> {
  const [channels, heads, attempts, transactions, state] = await Promise.all([
    readJsonDir(paths.releaseChannelsDir, isChannelRecord, (entry) => `${entry.channel}.json`),
    readJsonDir(paths.releaseHeadsDir, isChannelHeadRecord, (entry) => `${entry.channel}.json`),
    readJsonDir(paths.releaseAttemptsDir, isAttemptRecord, (entry) => `${entry.attempt_id}.json`),
    readJsonDir(paths.releaseTransactionsDir, isReleaseMutationJournal, (entry) => `${entry.channel}.json`),
    readOptionalRecord(paths.releaseStateFile, isReleaseStateRecord, "release transaction state")
      .then((value) => ({ value, unreadable: false }))
      .catch(() => ({ value: null, unreadable: true })),
  ]);
  const stateJournal = state.value === null
    ? null
    : transactions.values.find((entry) =>
        entry.channel === state.value!.channel && entry.transaction_id === state.value!.transaction_id) ?? null;
  const transactionStateInvalid = transactions.values.length > 1 ||
    (state.value?.phase === "pending" && stateJournal === null) ||
    (transactions.values.length === 1 && state.value !== null && stateJournal === null);
  return {
    channels: channels.values.sort((a, b) => a.channel.localeCompare(b.channel)),
    heads: heads.values.sort((a, b) => a.channel.localeCompare(b.channel)),
    attempts: attempts.values.sort(compareReleaseAttempts),
    pending: transactions.values.sort((a, b) => a.channel.localeCompare(b.channel)),
    unreadable: channels.unreadable || heads.unreadable || attempts.unreadable || transactions.unreadable ||
      state.unreadable || transactionStateInvalid,
  };
}

function releaseSnapshotSignature(snapshot: ReleaseSnapshot): string {
  return JSON.stringify(snapshot);
}

/** Mark cross-file states that cannot be a complete release transaction. */
function validateReleaseSnapshot(snapshot: ReleaseSnapshot): ReleaseSnapshot {
  const attempts = new Map(snapshot.attempts.map((attempt) => [attempt.attempt_id, attempt]));
  const heads = new Map(snapshot.heads.map((head) => [head.channel, head]));
  const channels = new Map(snapshot.channels.map((channel) => [channel.channel, channel]));
  const danglingChannel = snapshot.channels.some((channel) => !heads.has(channel.channel));
  const invalidHead = snapshot.heads.some((head) => {
    const latest = attempts.get(head.latest_attempt_id) ?? null;
    const lease = channels.get(head.channel) ?? null;
    if (lease) return !releaseEndpointConsistent(head, lease, latest);
    // A missing lease on an active head is the classifier's explicit
    // `contended` state, while a released head is the normal cleared channel.
    // Other terminal outcomes were required to retain or transfer ownership.
    return !releaseHeadMatchesAttempt(head, latest) ||
      (latest.outcome !== "active" && latest.outcome !== "released");
  });
  const missingHead = snapshot.attempts.some((attempt) => !heads.has(attempt.channel));
  const attemptBeyondHead = snapshot.attempts.some((attempt) => {
    const head = heads.get(attempt.channel);
    return head !== undefined && attempt.ordinal >= head.next_ordinal;
  });
  const ordinalsByChannel = new Map<string, number[]>();
  for (const attempt of snapshot.attempts) {
    const ordinals = ordinalsByChannel.get(attempt.channel) ?? [];
    ordinals.push(attempt.ordinal);
    ordinalsByChannel.set(attempt.channel, ordinals);
  }
  const incompleteHistory = snapshot.heads.some((head) => {
    const ordinals = (ordinalsByChannel.get(head.channel) ?? []).sort((a, b) => a - b);
    return ordinals.length !== head.next_ordinal - 1 ||
      ordinals.some((ordinal, index) => ordinal !== index + 1);
  });
  const nonHeadActiveAttempt = snapshot.attempts.some((attempt) =>
    attempt.outcome === "active" && heads.get(attempt.channel)?.latest_attempt_id !== attempt.attempt_id);
  let invalidAttemptGraph = false;
  const childrenPerPredecessor = new Map<string, number>();
  for (const attempt of snapshot.attempts) {
    if (attempt.successor !== null) {
      const successor = attempts.get(attempt.successor);
      if (!successor || attempt.outcome !== "superseded" || successor.supersedes !== attempt.attempt_id) {
        invalidAttemptGraph = true;
      }
    }
    if (attempt.supersedes !== null) {
      childrenPerPredecessor.set(attempt.supersedes, (childrenPerPredecessor.get(attempt.supersedes) ?? 0) + 1);
      const predecessor = attempts.get(attempt.supersedes);
      if (!predecessor) {
        invalidAttemptGraph = true;
      } else if (predecessor.outcome === "superseded") {
        if (predecessor.successor !== attempt.attempt_id) invalidAttemptGraph = true;
      } else if (predecessor.outcome === "failed") {
        // Failed terminal history is immutable: the child owns the only
        // persisted link and status derives the reverse relationship.
        if (predecessor.successor !== null) invalidAttemptGraph = true;
      } else {
        invalidAttemptGraph = true;
      }
    }
  }
  if ([...childrenPerPredecessor.values()].some((count) => count > 1)) invalidAttemptGraph = true;
  const unreadable = snapshot.unreadable || danglingChannel || invalidHead || missingHead || attemptBeyondHead ||
    incompleteHistory || nonHeadActiveAttempt || invalidAttemptGraph;
  return unreadable === snapshot.unreadable ? snapshot : { ...snapshot, unreadable };
}

/**
 * Read a coherent release snapshot without taking the write lock (a read-only
 * status call must not create lock files). Mutations are monotonic and
 * journalled, so two equal consecutive samples are one stable view. Three
 * bounded samples let a single in-flight transaction settle; continued churn
 * or an impossible channel-to-attempt relation fails closed as `unreadable`.
 */
export async function readReleaseSnapshot(paths: KanmerPaths): Promise<ReleaseSnapshot> {
  let previous = await collectReleaseSnapshot(paths);
  for (let sample = 1; sample < 3; sample += 1) {
    const current = await collectReleaseSnapshot(paths);
    if (releaseSnapshotSignature(previous) === releaseSnapshotSignature(current)) {
      return validateReleaseSnapshot(current);
    }
    previous = current;
  }
  const latest = validateReleaseSnapshot(previous);
  return latest.unreadable ? latest : { ...latest, unreadable: true };
}

/** Read one channel's lease. Absence is free; unreadable ownership throws and fails closed. */
export async function readChannelRecord(paths: KanmerPaths, channel: string): Promise<ReleaseChannelRecord | null> {
  const canonical = normalizeReleaseChannel(channel);
  const record = await readOptionalRecord(channelFile(paths, canonical), isChannelRecord, `release channel "${canonical}"`);
  if (record && record.channel !== canonical) {
    throw new Error(`RELEASE_RECORD_UNREADABLE: channel file "${canonical}" contains ownership for "${record.channel}".`);
  }
  return record;
}

/** Read one channel's durable high-water head. Absence is valid only before its first attempt. */
export async function readChannelHeadRecord(paths: KanmerPaths, channel: string): Promise<ReleaseChannelHeadRecord | null> {
  const canonical = normalizeReleaseChannel(channel);
  const record = await readOptionalRecord(
    channelHeadFile(paths, canonical),
    isChannelHeadRecord,
    `release channel head "${canonical}"`,
  );
  if (record && record.channel !== canonical) {
    throw new Error(`RELEASE_RECORD_UNREADABLE: channel head "${canonical}" contains history for "${record.channel}".`);
  }
  return record;
}

/** Read the constant-size release transaction epoch used by optimistic writers. */
export async function readReleaseStateRecord(paths: KanmerPaths): Promise<ReleaseStateRecord | null> {
  return readOptionalRecord(paths.releaseStateFile, isReleaseStateRecord, "release transaction state");
}

/** Read one attempt record. Absence returns null; malformed evidence throws. */
export async function readAttemptRecord(paths: KanmerPaths, attemptId: string): Promise<ReleaseAttemptRecord | null> {
  const record = await readOptionalRecord(attemptFile(paths, attemptId), isAttemptRecord, `release attempt "${attemptId}"`);
  if (record && record.attempt_id !== attemptId) {
    throw new Error(`RELEASE_RECORD_UNREADABLE: attempt file "${attemptId}" contains evidence for "${record.attempt_id}".`);
  }
  return record;
}

function serialise(record: unknown): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

/** Write an attempt record atomically. Callers hold the board write lock. */
export async function writeAttemptRecord(paths: KanmerPaths, record: ReleaseAttemptRecord): Promise<void> {
  await ensureDir(paths.releaseAttemptsDir);
  await writeFileAtomic(attemptFile(paths, record.attempt_id), serialise(record));
}

/** Write a channel lease atomically. Callers hold the board write lock. */
export async function writeChannelRecord(paths: KanmerPaths, record: ReleaseChannelRecord): Promise<void> {
  await ensureDir(paths.releaseChannelsDir);
  await writeFileAtomic(channelFile(paths, record.channel), serialise(record));
}

/** Write a channel high-water head atomically. Callers hold the board write lock. */
export async function writeChannelHeadRecord(paths: KanmerPaths, record: ReleaseChannelHeadRecord): Promise<void> {
  await ensureDir(paths.releaseHeadsDir);
  await writeFileAtomic(channelHeadFile(paths, record.channel), serialise(record));
}

/** Write the transaction epoch atomically. Callers hold the board write lock. */
async function writeReleaseStateRecord(paths: KanmerPaths, record: ReleaseStateRecord): Promise<void> {
  await ensureDir(paths.releasesRoot);
  await writeFileAtomic(paths.releaseStateFile, serialise(record));
}

/** Clear a channel lease. Attempt records are never removed — they are the evidence. */
export async function removeChannelRecord(paths: KanmerPaths, channel: string): Promise<void> {
  await removeFile(channelFile(paths, channel));
}

function inspectAttemptFilename(name: string, channel: string): number | null {
  if (!name.toLowerCase().endsWith(".json")) return null;
  const base = name.slice(0, -".json".length);
  const prefix = `${channel}${ATTEMPT_ID_SEPARATOR}`;
  if (!base.toLowerCase().startsWith(prefix)) return null;
  const at = base.lastIndexOf(ATTEMPT_ID_SEPARATOR);
  const rawChannel = at > 0 ? base.slice(0, at) : "";
  if (!name.endsWith(".json") || (rawChannel.toLowerCase() === channel && rawChannel !== channel)) {
    throw new Error(
      `RELEASE_CHANNEL_CASE_COLLISION: attempt file "${name}" collides with channel "${channel}" on Windows.`,
    );
  }
  const parsed = parseAttemptId(base);
  if (!parsed || parsed.channel !== channel) {
    throw new Error(
      `RELEASE_RECORD_UNREADABLE: immutable attempt filename "${name}" is attributable to channel "${channel}" ` +
        `but is not the canonical <channel>@<positive-safe-integer>.json form.`,
    );
  }
  return parsed.ordinal;
}

/**
 * Refuse pre-existing case variants before touching a channel. Linux can store
 * both while Windows aliases them; treating either situation as ownership
 * evidence prevents cross-host double writers.
 */
export async function assertNoReleaseChannelCollision(paths: KanmerPaths, channel: string): Promise<void> {
  const canonical = normalizeReleaseChannel(channel);
  for (const dir of [paths.releaseChannelsDir, paths.releaseHeadsDir, paths.releaseAttemptsDir, paths.releaseTransactionsDir]) {
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch (error) {
      if (errorCode(error) === "ENOENT") continue;
      throw new Error(`RELEASE_RECORD_UNREADABLE: cannot inspect ${dir} for release-channel collisions.`);
    }
    for (const name of names) {
      if (dir === paths.releaseAttemptsDir) {
        inspectAttemptFilename(name, canonical);
        continue;
      }
      if (!name.toLowerCase().endsWith(".json")) continue;
      const identity = name.slice(0, -".json".length);
      if (identity.toLowerCase() === canonical && (identity !== canonical || !name.endsWith(".json"))) {
        throw new Error(
          `RELEASE_CHANNEL_CASE_COLLISION: "${identity}" and "${canonical}" identify the same release channel on Windows. ` +
            `Inspect and reconcile the existing record before mutation.`,
        );
      }
    }
  }
}

function assertMutationState<T>(label: string, current: T | null, mutation: ReleaseMutationValue<T>): "before" | "after" {
  if (isDeepStrictEqual(current, mutation.after)) return "after";
  if (isDeepStrictEqual(current, mutation.before)) return "before";
  throw new Error(
    `RELEASE_TRANSACTION_CONFLICT: ${label} differs from both the journal's observed and intended state. ` +
      `The journal is retained and ownership evidence will not be overwritten.`,
  );
}

/** Finish one already-durable transaction idempotently. Callers hold the board write lock. */
export async function recoverReleaseMutation(paths: KanmerPaths, channel: string): Promise<boolean> {
  const canonical = normalizeReleaseChannel(channel);
  const file = releaseTransactionFile(paths, canonical);
  const initialState = await readReleaseStateRecord(paths);
  const journal = await readOptionalRecord(file, isReleaseMutationJournal, `release transaction "${canonical}"`);
  if (!journal) {
    // `commitReleaseMutation` publishes the pending epoch before the journal.
    // An interruption in that one-write gap changed no release record, so the
    // epoch itself is the complete rollback record.
    if (initialState?.phase === "pending" && initialState.channel === canonical) {
      await writeReleaseStateRecord(paths, { ...initialState, phase: "stable" });
      return true;
    }
    return false;
  }
  if (journal.channel !== canonical) {
    throw new Error(`RELEASE_TRANSACTION_CONFLICT: transaction ${journal.transaction_id} belongs to ${journal.channel}, not ${canonical}.`);
  }

  if (initialState !== null &&
      (initialState.channel !== canonical || initialState.transaction_id !== journal.transaction_id)) {
    throw new Error(
      `RELEASE_TRANSACTION_CONFLICT: transaction epoch ${initialState.transaction_id} for ${initialState.channel} ` +
        `does not authorise journal ${journal.transaction_id} for ${canonical}.`,
    );
  }

  // Preflight every compare-and-swap before the first write. A conflict in the
  // final lease or head must never leave an earlier immutable attempt changed.
  const attemptStates: Array<{
    mutation: ReleaseMutationValue<ReleaseAttemptRecord>;
    state: "before" | "after";
  }> = [];
  for (const mutation of journal.attempts) {
    const id = mutation.after!.attempt_id;
    const current = await readAttemptRecord(paths, id);
    attemptStates.push({ mutation, state: assertMutationState(`attempt ${id}`, current, mutation) });
  }
  const currentHead = await readChannelHeadRecord(paths, canonical);
  const headState = assertMutationState(`channel head ${canonical}`, currentHead, journal.head_record);
  const currentChannel = await readChannelRecord(paths, canonical);
  const channelState = assertMutationState(`channel ${canonical}`, currentChannel, journal.channel_record);
  if (initialState?.phase === "stable" &&
      (attemptStates.some((entry) => entry.state !== "after") || headState !== "after" || channelState !== "after")) {
    throw new Error(
      `RELEASE_TRANSACTION_CONFLICT: stable transaction epoch ${initialState.transaction_id} does not match ` +
        `the journal's fully applied state. The journal is retained for inspection.`,
    );
  }

  const state: ReleaseStateRecord = initialState ?? {
    schema: RELEASE_RECORD_SCHEMA,
    revision: 1,
    phase: "pending",
    transaction_id: journal.transaction_id,
    channel: canonical,
  };
  if (initialState === null) await writeReleaseStateRecord(paths, state);

  for (const entry of attemptStates) {
    if (entry.state === "before") await writeAttemptRecord(paths, entry.mutation.after!);
  }
  if (headState === "before") await writeChannelHeadRecord(paths, journal.head_record.after!);
  if (channelState === "before") {
    if (journal.channel_record.after === null) await removeChannelRecord(paths, canonical);
    else await writeChannelRecord(paths, journal.channel_record.after);
  }
  if (state.phase !== "stable") await writeReleaseStateRecord(paths, { ...state, phase: "stable" });
  await removeFile(file);
  return true;
}

/** Recover the one board-wide pending transaction before starting another. */
export async function recoverPendingReleaseMutation(paths: KanmerPaths): Promise<boolean> {
  const state = await readReleaseStateRecord(paths);
  if (!state) return false;
  const journalExists = await pathExists(releaseTransactionFile(paths, state.channel));
  if (state.phase === "pending" || journalExists) {
    return recoverReleaseMutation(paths, state.channel);
  }
  return false;
}

/** Persist then apply one recoverable release-record transaction. Callers hold the board write lock. */
export async function commitReleaseMutation(
  paths: KanmerPaths,
  input: Omit<ReleaseMutationJournal, "schema" | "transaction_id" | "created_at"> & { now: Date },
): Promise<void> {
  const channel = normalizeReleaseChannel(input.channel);
  await recoverPendingReleaseMutation(paths);
  const file = releaseTransactionFile(paths, channel);
  if (await pathExists(file)) {
    throw new Error(`RELEASE_TRANSACTION_PENDING: channel "${channel}" already has a recoverable transaction; recover it before starting another.`);
  }
  const journal: ReleaseMutationJournal = {
    schema: RELEASE_RECORD_SCHEMA,
    transaction_id: randomUUID(),
    channel,
    created_at: input.now.toISOString(),
    attempts: input.attempts,
    head_record: input.head_record,
    channel_record: input.channel_record,
  };
  if (!isReleaseMutationJournal(journal)) {
    throw new Error("RELEASE_TRANSACTION_INVALID: the intended release mutation does not satisfy the complete record schema.");
  }
  const previousState = await readReleaseStateRecord(paths);
  if (previousState?.phase === "pending") {
    throw new Error(
      `RELEASE_TRANSACTION_PENDING: transaction ${previousState.transaction_id} for ${previousState.channel} ` +
        `must be recovered before another mutation starts.`,
    );
  }
  const pendingState: ReleaseStateRecord = {
    schema: RELEASE_RECORD_SCHEMA,
    revision: (previousState?.revision ?? 0) + 1,
    phase: "pending",
    transaction_id: journal.transaction_id,
    channel,
  };
  await writeReleaseStateRecord(paths, pendingState);
  await ensureDir(paths.releaseTransactionsDir);
  await writeFileAtomic(file, serialise(journal));
  await recoverReleaseMutation(paths, channel);
}

/**
 * The next ordinal on a channel, read from its durable high-water head. The
 * steady-state path reads exactly one head and its referenced attempt; it never
 * scans immutable history while the board-wide write lock is held.
 */
export async function nextOrdinal(paths: KanmerPaths, channel: string): Promise<number> {
  const canonical = normalizeReleaseChannel(channel);
  const head = await readChannelHeadRecord(paths, canonical);
  if (head) {
    const latest = await readAttemptRecord(paths, head.latest_attempt_id);
    if (!latest || latest.channel !== canonical || latest.ordinal + 1 !== head.next_ordinal) {
      throw new Error(
        `RELEASE_RECORD_UNREADABLE: channel head "${canonical}" references missing or inconsistent attempt ` +
          `${head.latest_attempt_id}; its immutable identity will not be reused.`,
      );
    }
    return head.next_ordinal;
  }

  // A missing head is valid only before the first attempt. This bounded
  // corruption/bootstrap path enumerates names but reads no historical record;
  // every healthy channel takes the constant-size branch above.
  let names: string[];
  try {
    names = await fs.readdir(paths.releaseAttemptsDir);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return 1;
    throw new Error(`RELEASE_RECORD_UNREADABLE: cannot enumerate immutable attempts for channel "${canonical}".`);
  }
  for (const name of names) {
    const ordinal = inspectAttemptFilename(name, canonical);
    if (ordinal === null) continue;
    throw new Error(
      `RELEASE_RECORD_UNREADABLE: immutable attempt "${attemptIdFor(canonical, ordinal)}" exists without the ` +
        `channel's durable high-water head; inspect and restore the head before mutation.`,
    );
  }
  return 1;
}

/** Causal on one channel, deterministic across channels; never wall-clock ordered. */
export function compareReleaseAttempts(a: ReleaseAttemptRecord, b: ReleaseAttemptRecord): number {
  const byChannel = a.channel.localeCompare(b.channel);
  return byChannel !== 0 ? byChannel : a.ordinal - b.ordinal;
}

// ---------------------------------------------------------------------------
// Evidence classification (pure)
// ---------------------------------------------------------------------------

/** The release observation `ReconciliationEvidence.release` carries. */
export type ReleaseEvidenceState = "not-applicable" | "superseded" | "contended" | "unavailable";

/**
 * Map the persisted release records onto the four values
 * `packages/core/src/reconciliation.ts` already routes. The order is the
 * contract:
 *
 * 1. An unreadable record is `unavailable` — never a manufactured neutral.
 * 2. No attempt lists the ticket ⇒ `not-applicable`. This is the normal case
 *    and the one Kanmer's own board is always in.
 * 3. A matching **active** attempt with a live (non-exhausted) retry schedule
 *    is `unavailable`: the release service could not be reached, so this
 *    ticket's release evidence is inconclusive while every other ticket keeps
 *    reconciling normally.
 * 4. More than one matching active attempt, or a matching active attempt that
 *    is not its channel's current holder, is `contended`: ownership is
 *    genuinely ambiguous and reconciliation must preserve the evidence.
 * 5. Exactly one matching active attempt that IS the current holder is
 *    `not-applicable`: ownership is clean and there is nothing to preserve.
 * 6. Otherwise, the highest immutable ordinal on each channel decides. A
 *    superseded matching attempt is followed through its causal successor
 *    chain even when a successor deliberately has a fresh ticket roster; a
 *    ticket removed from that roster cannot remain frozen behind old evidence.
 *    Ordinals are channel-scoped, so disagreeing terminal results across
 *    channels are `contended` rather than ordered by channel name or clock.
 *    `superseded` reports `superseded`.
 * 7. `released` and `failed` report `not-applicable`. That is required, not
 *    incidental: goal.md Phase 14 says ordinary feature tickets must not sit in
 *    Verifying waiting for a release, so a finished release must never freeze a
 *    ticket's own reconciliation.
 */
export function classifyReleaseEvidence(snapshot: ReleaseSnapshot, ticketId: string): { state: ReleaseEvidenceState } {
  if (snapshot.unreadable) return { state: "unavailable" };
  if (snapshot.pending.some((journal) => journal.attempts.some((mutation) =>
    mutation.before?.included_tickets.includes(ticketId) || mutation.after?.included_tickets.includes(ticketId)))) {
    return { state: "unavailable" };
  }
  const matching = snapshot.attempts.filter((attempt) => attempt.included_tickets.includes(ticketId));
  if (matching.length === 0) return { state: "not-applicable" };

  const holders = new Map(snapshot.channels.map((channel) => [channel.channel, channel.attempt_id]));
  const active = matching.filter((attempt) => !isTerminalAttempt(attempt));

  if (active.some((attempt) => attempt.retry !== null && !attempt.retry.exhausted)) {
    return { state: "unavailable" };
  }
  if (active.length > 1 || active.some((attempt) => holders.get(attempt.channel) !== attempt.attempt_id)) {
    return { state: "contended" };
  }
  if (active.length === 1) return { state: "not-applicable" };

  const terminalByChannel = new Map<string, ReleaseAttemptRecord>();
  for (const attempt of matching) {
    const current = terminalByChannel.get(attempt.channel);
    if (!current || attempt.ordinal > current.ordinal) terminalByChannel.set(attempt.channel, attempt);
  }
  const attemptsById = new Map(snapshot.attempts.map((attempt) => [attempt.attempt_id, attempt]));
  const successorByPredecessor = new Map<string, string>();
  for (const attempt of snapshot.attempts) {
    if (attempt.supersedes !== null) successorByPredecessor.set(attempt.supersedes, attempt.attempt_id);
  }
  const causalTail = (start: ReleaseAttemptRecord): ReleaseAttemptRecord | null => {
    let current = start;
    const seen = new Set<string>();
    while (true) {
      if (seen.has(current.attempt_id)) return null;
      seen.add(current.attempt_id);
      const successorId = current.successor ?? successorByPredecessor.get(current.attempt_id);
      if (!successorId) return current;
      const successor = attemptsById.get(successorId);
      if (!successor || successor.channel !== current.channel || successor.ordinal <= current.ordinal) return null;
      current = successor;
    }
  };
  const terminalStates = new Set(
    [...terminalByChannel.values()].map((attempt) => {
      const tail = causalTail(attempt);
      if (!tail) return "unavailable";
      if (tail.attempt_id !== attempt.attempt_id && !tail.included_tickets.includes(ticketId)) return "not-applicable";
      return tail.outcome === "superseded" ? "superseded" : "not-applicable";
    }),
  );
  if (terminalStates.has("unavailable")) return { state: "unavailable" };
  if (terminalStates.size > 1) return { state: "contended" };
  return { state: terminalStates.has("superseded") ? "superseded" : "not-applicable" };
}

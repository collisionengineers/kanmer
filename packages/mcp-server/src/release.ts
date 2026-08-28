import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import {
  deliveryPolicyVersion,
  resolveDelivery,
  type KanmerStore,
  type ReleaseChannelResult,
  type ReleaseVerificationState,
} from "@kanmer/core";
import { KanmerError } from "./errors.js";
import { GIT_MAX_BUFFER, GIT_TIMEOUT_MS, type ReconciliationRun } from "./reconciliation.js";

const execFile = promisify(execFileCallback);

/**
 * The host half of release serialization (CORE-132, FRD-031).
 *
 * This is the collect side of the same seam CORE-131 draws for reconciliation:
 * everything git-shaped happens **here, outside every lock**, and the locked
 * store verb receives only resolved values. AGENTS.md §8 is explicit that
 * nothing slow, networked or git-shaped belongs inside the board write lock,
 * and a release attempt needs exactly one such fact — the integration SHA.
 *
 * No release *service* is ever contacted. FRD-031's unavailable-service edge
 * case is recorded from the caller's own bounded observation
 * (`service_unavailable`), because Kanmer does not know what a given project's
 * release service is and must not invent one.
 */

/** Every release action the tool exposes. One action-based tool, like `take_ticket`. */
export const RELEASE_ACTIONS = ["acquire", "renew", "record", "supersede", "complete", "fail"] as const;
export type ReleaseAction = (typeof RELEASE_ACTIONS)[number];

export interface ReleaseChannelRequest {
  action: ReleaseAction;
  channel?: string;
  /** Exact 40-hex SHA. When omitted on acquire/supersede, `integration_ref` is resolved instead. */
  integrationSha?: string;
  /** Git ref to resolve; defaults to the project's resolved integration branch. */
  integrationRef?: string;
  leaseId?: string;
  leaseRevision?: number;
  reason?: string;
  releaseTag?: string;
  verificationState?: ReleaseVerificationState;
  includedPrs?: string[];
  includedTickets?: string[];
  artifactManifest?: string[];
  serviceUnavailable?: string;
  serviceRecovered?: true;
}

const RELEASE_REQUEST_FIELDS = [
  "integrationSha",
  "integrationRef",
  "leaseId",
  "leaseRevision",
  "reason",
  "releaseTag",
  "verificationState",
  "includedPrs",
  "includedTickets",
  "artifactManifest",
  "serviceUnavailable",
  "serviceRecovered",
] as const satisfies readonly (keyof ReleaseChannelRequest)[];

type ReleaseRequestField = (typeof RELEASE_REQUEST_FIELDS)[number];

const RELEASE_ACTION_FIELDS = {
  acquire: ["integrationSha", "integrationRef", "includedPrs", "includedTickets"],
  renew: ["leaseId", "leaseRevision"],
  record: [
    "leaseId", "leaseRevision", "releaseTag", "verificationState", "includedPrs", "includedTickets",
    "artifactManifest", "serviceUnavailable", "serviceRecovered",
  ],
  supersede: ["integrationSha", "integrationRef", "leaseId", "leaseRevision", "reason", "includedPrs", "includedTickets"],
  complete: ["leaseId", "leaseRevision", "releaseTag", "artifactManifest"],
  fail: ["leaseId", "leaseRevision", "reason"],
} as const satisfies Record<ReleaseAction, readonly ReleaseRequestField[]>;

const RELEASE_FIELD_NAMES: Record<ReleaseRequestField, string> = {
  integrationSha: "integration_sha",
  integrationRef: "integration_ref",
  leaseId: "lease_id",
  leaseRevision: "lease_revision",
  reason: "reason",
  releaseTag: "release_tag",
  verificationState: "verification_state",
  includedPrs: "included_prs",
  includedTickets: "included_tickets",
  artifactManifest: "artifact_manifest",
  serviceUnavailable: "service_unavailable",
  serviceRecovered: "service_recovered",
};

/** Refuse any supplied field the selected action would otherwise ignore. */
export function validateReleaseChannelRequest(input: ReleaseChannelRequest): void {
  if (input.channel !== undefined && !input.channel.trim()) {
    throw new KanmerError("RECONCILIATION_INCONCLUSIVE", `RELEASE_INPUT_INVALID: channel cannot be blank when supplied.`);
  }
  const allowed = new Set<ReleaseRequestField>(RELEASE_ACTION_FIELDS[input.action]);
  const rejected = RELEASE_REQUEST_FIELDS.filter((field) => input[field] !== undefined && !allowed.has(field));
  if (rejected.length > 0) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RELEASE_INPUT_INVALID: action "${input.action}" does not accept ${rejected.map((field) => RELEASE_FIELD_NAMES[field]).join(", ")}; ` +
        `nothing was written.`,
    );
  }
  if (input.integrationSha !== undefined && input.integrationRef !== undefined) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RELEASE_INPUT_INVALID: pass integration_sha or integration_ref, not both.`,
    );
  }
  if (input.integrationRef !== undefined && !input.integrationRef.trim()) {
    throw new KanmerError("RECONCILIATION_INCONCLUSIVE", `RELEASE_INPUT_INVALID: integration_ref cannot be blank when supplied.`);
  }
  if (input.action !== "fail" && input.reason !== undefined && !input.reason.trim()) {
    throw new KanmerError("RECONCILIATION_INCONCLUSIVE", `RELEASE_INPUT_INVALID: reason cannot be blank when supplied.`);
  }
  if (input.serviceUnavailable !== undefined && !input.serviceUnavailable.trim()) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RELEASE_INPUT_INVALID: service_unavailable must describe the observed failure.`,
    );
  }
  if (input.serviceUnavailable !== undefined && input.serviceRecovered === true) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RELEASE_INPUT_INVALID: one record action cannot report service_unavailable and service_recovered together.`,
    );
  }
  if (input.serviceRecovered !== undefined && input.serviceRecovered !== true) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RELEASE_INPUT_INVALID: service_recovered, when supplied, must be true.`,
    );
  }
  if (input.action === "record" && ![
    input.releaseTag,
    input.verificationState,
    input.includedPrs,
    input.includedTickets,
    input.artifactManifest,
    input.serviceUnavailable,
    input.serviceRecovered,
  ].some((value) => value !== undefined)) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RELEASE_INPUT_INVALID: record needs at least one progress field; use renew for a heartbeat with no progress.`,
    );
  }
}

function requireLease(input: ReleaseChannelRequest): { leaseId: string; leaseRevision: number } {
  const leaseRevision = input.leaseRevision;
  if (!input.leaseId?.trim() || typeof leaseRevision !== "number" || !Number.isSafeInteger(leaseRevision) || leaseRevision < 1) {
    throw new KanmerError(
      "LEASE_CONFLICT",
      `LEASE_ID_REQUIRED: release action "${input.action}" writes through the channel's current lease, so it needs both ` +
        `lease_id and lease_revision (read them from get_status.release or the result of your last release_channel call).`,
    );
  }
  return { leaseId: input.leaseId, leaseRevision };
}

/**
 * Resolve the integration SHA a candidate is minted from.
 *
 * Bounded exactly like the reconciliation collector's subprocesses, and a
 * failure is a structured refusal rather than a manufactured SHA — an invented
 * candidate identity would be worse than no release at all.
 */
export async function resolveIntegrationCandidate(
  store: KanmerStore,
  input: { integrationSha?: string; integrationRef?: string },
  run: ReconciliationRun = execFile,
): Promise<{ integrationSha: string; policyVersion: string }> {
  const policy = resolveDelivery(await store.getBoard());
  const policyVersion = deliveryPolicyVersion(policy);
  if (input.integrationSha !== undefined) return { integrationSha: input.integrationSha, policyVersion };
  const explicitRef = input.integrationRef?.trim();
  const ref = explicitRef || `refs/heads/${policy.integrationBranch}`;
  try {
    const { stdout } = await run("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: store.paths.repoRoot,
      windowsHide: true,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
    });
    const sha = stdout.trim();
    if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`git rev-parse returned "${sha}"`);
    return { integrationSha: sha, policyVersion };
  } catch (error) {
    throw new KanmerError(
      "RECONCILIATION_INCONCLUSIVE",
      `RELEASE_SHA_UNAVAILABLE: could not resolve "${ref}" to an exact commit in ${store.paths.repoRoot} ` +
        `(${error instanceof Error ? error.message : String(error)}). A candidate identity is never minted from a guessed SHA — ` +
        `fetch the ref, or pass integration_sha explicitly.`,
    );
  }
}

/** Compatibility-sized read helper used by focused callers and tests. */
export async function resolveIntegrationSha(
  store: KanmerStore,
  input: { integrationSha?: string; integrationRef?: string },
  run: ReconciliationRun = execFile,
): Promise<string> {
  return (await resolveIntegrationCandidate(store, input, run)).integrationSha;
}

/**
 * Run one release action: collect outside the lock, then delegate to the store
 * verb that owns the `withLeaseLock` critical section.
 */
export async function releaseChannelAction(
  store: KanmerStore,
  input: ReleaseChannelRequest,
  run: ReconciliationRun = execFile,
): Promise<ReleaseChannelResult> {
  validateReleaseChannelRequest(input);
  const channel = input.channel?.trim() || undefined;
  switch (input.action) {
    case "acquire": {
      const candidate = await resolveIntegrationCandidate(store, input, run);
      return store.acquireReleaseChannel({
        ...(channel ? { channel } : {}),
        integrationSha: candidate.integrationSha,
        expectedPolicyVersion: candidate.policyVersion,
        ...(input.includedPrs ? { includedPrs: input.includedPrs } : {}),
        ...(input.includedTickets ? { includedTickets: input.includedTickets } : {}),
      });
    }
    case "renew":
      return store.renewReleaseChannel({
        ...(channel ? { channel } : {}),
        ...requireLease(input),
      });
    case "record":
      return store.recordReleaseProgress({
        ...(channel ? { channel } : {}),
        ...requireLease(input),
        ...(input.verificationState !== undefined ? { verificationState: input.verificationState } : {}),
        ...(input.releaseTag !== undefined ? { releaseTag: input.releaseTag } : {}),
        ...(input.includedPrs !== undefined ? { includedPrs: input.includedPrs } : {}),
        ...(input.includedTickets !== undefined ? { includedTickets: input.includedTickets } : {}),
        ...(input.artifactManifest !== undefined ? { artifactManifest: input.artifactManifest } : {}),
        ...(input.serviceUnavailable !== undefined ? { serviceUnavailable: input.serviceUnavailable } : {}),
        ...(input.serviceRecovered !== undefined ? { serviceRecovered: input.serviceRecovered } : {}),
      });
    case "supersede": {
      const lease = requireLease(input);
      const candidate = await resolveIntegrationCandidate(store, input, run);
      return store.supersedeReleaseAttempt({
        ...(channel ? { channel } : {}),
        ...lease,
        integrationSha: candidate.integrationSha,
        expectedPolicyVersion: candidate.policyVersion,
        ...(input.reason !== undefined ? { reason: input.reason.trim() } : {}),
        ...(input.includedPrs ? { includedPrs: input.includedPrs } : {}),
        ...(input.includedTickets ? { includedTickets: input.includedTickets } : {}),
      });
    }
    case "complete":
      return store.completeReleaseAttempt({
        ...(channel ? { channel } : {}),
        ...requireLease(input),
        ...(input.releaseTag !== undefined ? { releaseTag: input.releaseTag } : {}),
        ...(input.artifactManifest !== undefined ? { artifactManifest: input.artifactManifest } : {}),
      });
    case "fail":
      if (!input.reason?.trim()) {
        throw new KanmerError(
          "RECONCILIATION_INCONCLUSIVE",
          `RELEASE_REASON_REQUIRED: a failed release attempt keeps its proof forever, so it records why it failed. Pass reason.`,
        );
      }
      return store.failReleaseAttempt({
        ...(channel ? { channel } : {}),
        ...requireLease(input),
        reason: input.reason.trim(),
      });
    default: {
      const exhaustive: never = input.action;
      throw new Error(`Unknown release action "${String(exhaustive)}"`);
    }
  }
}

/** The read side of the channel, reported by `get_status` so no roster slot is spent on it. */
export async function releaseStatus(store: KanmerStore, now: Date = new Date()): Promise<{
  channels: {
    channel: string;
    attemptId: string;
    candidateId: string | null;
    candidateRef: string | null;
    integrationSha: string | null;
    owner: string;
    leaseId: string;
    leaseRevision: number;
    state: "current" | "expired";
    expiresAt: string;
    outcome: string | null;
  }[];
  attempts: {
    attemptId: string;
    channel: string;
    ordinal: number;
    candidateId: string;
    candidateRef: string | null;
    integrationSha: string;
    releaseBranch: string;
    deliveryPolicyVersion: string;
    owner: string;
    createdAt: string;
    outcome: string;
    terminalAt: string | null;
    failureReason: string | null;
    verificationState: string;
    retry: import("@kanmer/core").ReleaseRetrySchedule | null;
    includedPrs: string[];
    includedTickets: string[];
    releaseTag: string | null;
    artifactManifest: string[];
    predecessor: string | null;
    successor: string | null;
  }[];
  attemptCount: number;
  pendingTransactions: string[];
  unreadable: boolean;
}> {
  const snapshot = await store.releaseSnapshot();
  const byId = new Map(snapshot.attempts.map((attempt) => [attempt.attempt_id, attempt]));
  const successorByPredecessor = new Map<string, string>();
  for (const attempt of snapshot.attempts) {
    if (attempt.supersedes !== null && !successorByPredecessor.has(attempt.supersedes)) {
      successorByPredecessor.set(attempt.supersedes, attempt.attempt_id);
    }
  }
  return {
    channels: snapshot.channels.map((lease) => {
      const attempt = byId.get(lease.attempt_id) ?? null;
      const expires = Date.parse(lease.expires_at);
      return {
        channel: lease.channel,
        attemptId: lease.attempt_id,
        candidateId: attempt?.candidate_id ?? null,
        candidateRef: attempt?.candidate_ref ?? null,
        integrationSha: attempt?.integration_sha ?? null,
        owner: lease.owner,
        leaseId: lease.lease_id,
        leaseRevision: lease.lease_revision,
        state: !Number.isNaN(expires) && expires < now.getTime() ? "expired" : "current",
        expiresAt: lease.expires_at,
        outcome: attempt?.outcome ?? null,
      };
    }),
    attempts: snapshot.attempts.map((attempt) => ({
      attemptId: attempt.attempt_id,
      channel: attempt.channel,
      ordinal: attempt.ordinal,
      candidateId: attempt.candidate_id,
      candidateRef: attempt.candidate_ref,
      integrationSha: attempt.integration_sha,
      releaseBranch: attempt.release_branch,
      deliveryPolicyVersion: attempt.delivery_policy_version,
      owner: attempt.owner,
      createdAt: attempt.created_at,
      outcome: attempt.outcome,
      terminalAt: attempt.terminal_at,
      failureReason: attempt.failure_reason,
      verificationState: attempt.verification_state,
      retry: attempt.retry,
      includedPrs: attempt.included_prs,
      includedTickets: attempt.included_tickets,
      releaseTag: attempt.release_tag,
      artifactManifest: attempt.artifact_manifest,
      predecessor: attempt.supersedes,
      successor: attempt.successor ?? successorByPredecessor.get(attempt.attempt_id) ?? null,
    })),
    attemptCount: snapshot.attempts.length,
    pendingTransactions: snapshot.pending.map((transaction) => transaction.channel),
    unreadable: snapshot.unreadable,
  };
}

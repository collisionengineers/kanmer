import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { removeTreeWithRetry } from "./io.js";
import {
  RELEASE_RETRY_MAX_ATTEMPTS,
  candidateIdentity,
  candidateRefFor,
  classifyReleaseEvidence,
  deliveryPolicyVersion,
  nextOrdinal,
  nextRetry,
  parseAttemptId,
  readReleaseSnapshot,
  recoverReleaseMutation,
  type ReleaseAttemptRecord,
  type ReleaseChannelHeadRecord,
  type ReleaseChannelRecord,
  type ReleaseSnapshot,
} from "./release.js";
import { resolvePaths } from "./paths.js";
import { resolveDelivery } from "./board.js";
import { defaultBoardConfig } from "./board.js";
import type { DeliveryConfig } from "./types.js";

/**
 * FRD-031 AC2 (immutable-candidate clause), AC3, AC4 and the
 * unavailable-release-service edge case (CORE-132). CORE-116's half — AC1,
 * AC5, the rest of AC2 and the unmerged-branch edge case — is covered by
 * `delivery.test.ts` and is deliberately not re-tested here.
 */

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-release-"));
  store = new KanmerStore(root, { actor: "test-actor" });
  await store.init();
});

afterEach(async () => {
  await removeTreeWithRetry(root);
});

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

/** A gate-free ticket, so a fixture can walk stages without pipeline documents. */
const free = { type: "ticket", profile: "custom", requires: {} } as const;

const DEV_TO_MAIN: DeliveryConfig = {
  integrationBranch: "dev",
  releaseBranch: "main",
  releaseCandidatePattern: "release/*",
  hotfixBackport: true,
};

const MAIN_POLICY_VERSION = deliveryPolicyVersion(resolveDelivery(defaultBoardConfig()));

async function policy(delivery: DeliveryConfig): Promise<void> {
  await store.updateBoard((board) => ({ ...board, delivery }));
}

type AcquireInput = Omit<Parameters<KanmerStore["acquireReleaseChannel"]>[0], "expectedPolicyVersion"> & {
  expectedPolicyVersion?: string;
};
type SupersedeInput = Omit<Parameters<KanmerStore["supersedeReleaseAttempt"]>[0], "expectedPolicyVersion"> & {
  expectedPolicyVersion?: string;
};

async function acquire(input: AcquireInput, target: KanmerStore = store) {
  const version = deliveryPolicyVersion(resolveDelivery(await target.getBoard()));
  return target.acquireReleaseChannel({ expectedPolicyVersion: version, ...input });
}

async function supersede(input: SupersedeInput, target: KanmerStore = store) {
  const version = deliveryPolicyVersion(resolveDelivery(await target.getBoard()));
  return target.supersedeReleaseAttempt({ expectedPolicyVersion: version, ...input });
}

const paths = () => resolvePaths(root);

/** Push a channel lease's expiry into the past, without releasing it. */
async function expireChannel(channel: string): Promise<void> {
  const file = path.join(root, ".kanmer", "releases", "channels", `${channel}.json`);
  const record = JSON.parse(await fs.readFile(file, "utf8")) as ReleaseChannelRecord;
  record.expires_at = new Date(Date.now() - 60_000).toISOString();
  await fs.writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function snapshotOf(attempts: ReleaseAttemptRecord[], channels: ReleaseChannelRecord[] = [], unreadable = false): ReleaseSnapshot {
  return { attempts, channels, heads: [], pending: [], unreadable };
}

function attempt(over: Partial<ReleaseAttemptRecord> = {}): ReleaseAttemptRecord {
  return {
    schema: 1,
    attempt_id: "main@1",
    channel: "main",
    ordinal: 1,
    candidate_id: candidateIdentity("main", SHA_A, 1),
    candidate_ref: null,
    integration_sha: SHA_A,
    release_branch: "main",
    delivery_policy_version: MAIN_POLICY_VERSION,
    created_at: "2026-01-01T00:00:00.000Z",
    owner: "test-actor",
    supersedes: null,
    release_tag: null,
    included_prs: [],
    included_tickets: ["T-1"],
    artifact_manifest: [],
    verification_state: "pending",
    retry: null,
    outcome: "active",
    terminal_at: null,
    successor: null,
    failure_reason: null,
    ...over,
  };
}

function channelRecord(attemptId: string, over: Partial<ReleaseChannelRecord> = {}): ReleaseChannelRecord {
  return {
    schema: 1,
    channel: "main",
    attempt_id: attemptId,
    lease_id: "lease-1",
    lease_revision: 1,
    owner: "test-actor",
    acquired_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    heartbeat_at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function headRecord(attemptId = "main@1", over: Partial<ReleaseChannelHeadRecord> = {}): ReleaseChannelHeadRecord {
  const ordinal = Number(attemptId.slice(attemptId.lastIndexOf("@") + 1));
  return {
    schema: 1,
    channel: attemptId.slice(0, attemptId.lastIndexOf("@")),
    latest_attempt_id: attemptId,
    next_ordinal: ordinal + 1,
    ...over,
  };
}

describe("candidate identity (FRD-031 AC2 immutable-candidate clause, AC3)", () => {
  it("is a stable digest over channel, integration SHA and ordinal", () => {
    expect(candidateIdentity("main", SHA_A, 1)).toBe(candidateIdentity("main", SHA_A, 1));
    expect(candidateIdentity("main", SHA_A, 1)).toMatch(/^cand1:[0-9a-f]{16}$/);
  });

  it("differs whenever the integration SHA differs — AC3 made structural, not remembered", () => {
    expect(candidateIdentity("main", SHA_A, 1)).not.toBe(candidateIdentity("main", SHA_B, 1));
  });

  it("differs per ordinal and per channel, so two candidates never collide", () => {
    expect(candidateIdentity("main", SHA_A, 1)).not.toBe(candidateIdentity("main", SHA_A, 2));
    expect(candidateIdentity("main", SHA_A, 1)).not.toBe(candidateIdentity("beta", SHA_A, 1));
  });

  it("mints a candidate ref only when the policy enables candidates", () => {
    expect(candidateRefFor({ releaseCandidatePattern: null }, "main", 2)).toBeNull();
    expect(candidateRefFor({ releaseCandidatePattern: "release/*" }, "main", 2)).toBe("release/main-2");
    expect(candidateRefFor(
      { releaseCandidatePattern: "release/*/candidate-*" },
      "Main",
      2,
    )).toBe("release/main-2/candidate-main-2");
  });

  it.each(["release/*.", "release/~*"])("refuses an unusable concrete candidate ref from %s", (releaseCandidatePattern) => {
    expect(() => candidateRefFor({ releaseCandidatePattern }, "main", 2)).toThrow(/Git cannot use as a branch/u);
  });

  it("round-trips an attempt id, and rejects one that is not a channel@ordinal", () => {
    expect(parseAttemptId("main@3")).toEqual({ channel: "main", ordinal: 3 });
    expect(parseAttemptId("release-2.x@11")).toEqual({ channel: "release-2.x", ordinal: 11 });
    expect(parseAttemptId("main")).toBeNull();
    expect(parseAttemptId("@1")).toBeNull();
    expect(parseAttemptId("main@0")).toBeNull();
    expect(parseAttemptId("main@01")).toBeNull();
    expect(parseAttemptId("main@1e2")).toBeNull();
    expect(parseAttemptId(`main@${Number.MAX_SAFE_INTEGER + 1}`)).toBeNull();
  });
});

describe("acquireReleaseChannel (FRD-031 AC2, AC4)", () => {
  it("mints an immutable candidate identity and ref on a candidate-enabled project", async () => {
    await policy(DEV_TO_MAIN);
    const result = await acquire({ integrationSha: SHA_A });

    expect(result.channel).toBe("main");
    expect(result.attempt.attempt_id).toBe("main@1");
    expect(result.attempt.candidate_id).toBe(candidateIdentity("main", SHA_A, 1));
    expect(result.attempt.candidate_ref).toBe("release/main-1");
    expect(result.attempt.integration_sha).toBe(SHA_A);
    expect(result.attempt.release_branch).toBe("main");
    expect(result.attempt.outcome).toBe("active");
    expect(result.lease?.lease_revision).toBe(1);
    expect(result.leaseState).toBe("current");
  });

  it("records no candidate ref when the project enables no candidates", async () => {
    const result = await acquire({ integrationSha: SHA_A });
    expect(result.channel).toBe("main");
    expect(result.attempt.candidate_ref).toBeNull();
  });

  it("refuses a second concurrent owner with RELEASE_CHANNEL_HELD", async () => {
    await acquire({ integrationSha: SHA_A });
    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_CHANNEL_HELD:/);
  });

  it("refuses an EXPIRED lease too, and names supersede as the reclaim", async () => {
    await acquire({ integrationSha: SHA_A });
    await expireChannel("main");
    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(
      /RELEASE_CHANNEL_HELD:[\s\S]*expired[\s\S]*reclaimed with supersede/,
    );
  });

  it("keeps two channels independent", async () => {
    await acquire({ integrationSha: SHA_A });
    const beta = await acquire({ channel: "beta", integrationSha: SHA_B });
    expect(beta.attempt.attempt_id).toBe("beta@1");
    expect((await store.releaseSnapshot()).channels).toHaveLength(2);
  });

  it("refuses an integration SHA that is not an exact 40-hex commit", async () => {
    await expect(acquire({ integrationSha: "abc1234" })).rejects.toThrow(/exact 40-hex integration SHA/);
  });

  it("refuses a channel name that could escape the releases folder", async () => {
    await expect(acquire({ channel: "../evil", integrationSha: SHA_A })).rejects.toThrow(/Invalid release channel/);
  });

  it.each([
    "con",
    "PrN",
    "aux.release",
    "nul",
    "com1",
    "COM9.rc",
    "lpt1",
    "LPT9.beta",
  ])("refuses reserved Windows device channel %s", async (channel) => {
    await expect(acquire({ channel, integrationSha: SHA_A })).rejects.toThrow(/Invalid release channel/);
  });
});

describe("renew / record (FRD-031 lease CAS and the unavailable-service edge case)", () => {
  it("renews on a matching lease id and revision, and bumps the revision", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const renewed = await store.renewReleaseChannel({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
    });
    expect(renewed.lease?.lease_revision).toBe(2);
    expect(Date.parse(renewed.lease!.expires_at)).toBeGreaterThanOrEqual(Date.parse(taken.lease!.expires_at));
  });

  it("refuses a stale lease revision as a Conflict, and writes nothing", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    await store.renewReleaseChannel({ leaseId: taken.lease!.lease_id, leaseRevision: 1 });
    await expect(
      store.renewReleaseChannel({ leaseId: taken.lease!.lease_id, leaseRevision: 1 }),
    ).rejects.toThrow(/^Conflict: release channel "main" changed since you read it/);
    expect((await store.releaseSnapshot()).channels[0]?.lease_revision).toBe(2);
  });

  it("refuses a lease id that is no longer the channel's, as LEASE_EXPIRED", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    await expect(
      store.renewReleaseChannel({ leaseId: "not-the-lease", leaseRevision: taken.lease!.lease_revision }),
    ).rejects.toThrow(/^LEASE_EXPIRED:/);
  });

  it("treats public lease CAS values as concurrency checks, never authority", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const cas = { leaseId: taken.lease!.lease_id, leaseRevision: taken.lease!.lease_revision };
    const before = await store.releaseSnapshot();
    const intruder = new KanmerStore(root, { actor: "intruder" });

    await expect(intruder.renewReleaseChannel(cas)).rejects.toThrow(/^CLAIM_NOT_OWNED:/);
    await expect(intruder.recordReleaseProgress({ ...cas, verificationState: "passed" })).rejects.toThrow(/^CLAIM_NOT_OWNED:/);
    await expect(intruder.completeReleaseAttempt(cas)).rejects.toThrow(/^CLAIM_NOT_OWNED:/);
    await expect(intruder.failReleaseAttempt({ ...cas, reason: "spoofed failure" })).rejects.toThrow(/^CLAIM_NOT_OWNED:/);
    expect(await store.releaseSnapshot()).toEqual(before);
    expect((await store.renewReleaseChannel(cas)).lease?.lease_revision).toBe(2);
  });

  it("records progress without ever changing a frozen identity field", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const recorded = await store.recordReleaseProgress({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      verificationState: "passed",
      releaseTag: "v9.9.9",
      includedTickets: ["CORE-1", "CORE-2"],
      includedPrs: ["https://example.test/pr/1"],
      artifactManifest: ["kanmer-9.9.9.exe"],
    });
    expect(recorded.attempt.verification_state).toBe("passed");
    expect(recorded.attempt.release_tag).toBe("v9.9.9");
    expect(recorded.attempt.included_tickets).toEqual(["CORE-1", "CORE-2"]);
    expect(recorded.attempt.artifact_manifest).toEqual(["kanmer-9.9.9.exe"]);
    expect(recorded.attempt.candidate_id).toBe(taken.attempt.candidate_id);
    expect(recorded.attempt.integration_sha).toBe(SHA_A);
  });

  it("recording progress renews the lease expiry as well as its heartbeat", async () => {
    await store.updateBoard((board) => ({ ...board, claimExpiryMinutes: 5 }));
    const firstAt = new Date("2026-01-01T00:00:00.000Z");
    const progressAt = new Date("2026-01-01T00:04:00.000Z");
    const taken = await acquire({ integrationSha: SHA_A, now: firstAt });
    const recorded = await store.recordReleaseProgress({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      verificationState: "passed",
      now: progressAt,
    });
    expect(recorded.lease?.heartbeat_at).toBe(progressAt.toISOString());
    expect(recorded.lease?.expires_at).toBe("2026-01-01T00:09:00.000Z");
    expect(recorded.lease?.expires_at).not.toBe(taken.lease?.expires_at);
  });

  it("records a BOUNDED retry schedule when the release service is unavailable", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    let lease = taken.lease!;
    let last = taken.attempt;
    for (let n = 0; n < RELEASE_RETRY_MAX_ATTEMPTS + 2; n += 1) {
      const step = await store.recordReleaseProgress({
        leaseId: lease.lease_id,
        leaseRevision: lease.lease_revision,
        serviceUnavailable: `registry unreachable (${n})`,
      });
      lease = step.lease!;
      last = step.attempt;
    }
    expect(last.retry?.max_attempts).toBe(RELEASE_RETRY_MAX_ATTEMPTS);
    expect(last.retry?.exhausted).toBe(true);
    // Bounded: the backoff stops doubling once the schedule is exhausted.
    expect(last.retry!.backoff_ms).toBeLessThanOrEqual(60_000 * 2 ** (RELEASE_RETRY_MAX_ATTEMPTS - 1));
  });

  it("clears the retry schedule when the caller observes the service again", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const down = await store.recordReleaseProgress({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      serviceUnavailable: "registry unreachable",
    });
    expect(down.attempt.retry?.attempts).toBe(1);
    const up = await store.recordReleaseProgress({
      leaseId: down.lease!.lease_id,
      leaseRevision: down.lease!.lease_revision,
      serviceRecovered: true,
    });
    expect(up.attempt.retry).toBeNull();
  });

  it("rejects contradictory, empty or absent progress before changing the lease", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const cas = { leaseId: taken.lease!.lease_id, leaseRevision: taken.lease!.lease_revision };
    const before = await store.releaseSnapshot();
    await expect(store.recordReleaseProgress({
      ...cas,
      serviceUnavailable: "registry unreachable",
      serviceRecovered: true,
    })).rejects.toThrow(/^RELEASE_INPUT_INVALID: one record action cannot report/);
    await expect(store.recordReleaseProgress({ ...cas, serviceUnavailable: "   " })).rejects.toThrow(/^RELEASE_INPUT_INVALID:/);
    await expect(store.recordReleaseProgress(cas)).rejects.toThrow(/^RELEASE_INPUT_INVALID: record needs/);
    await expect(store.recordReleaseProgress({
      ...cas,
      serviceRecovered: false,
    } as Parameters<KanmerStore["recordReleaseProgress"]>[0])).rejects.toThrow(/^RELEASE_INPUT_INVALID:/);
    expect(await store.releaseSnapshot()).toEqual(before);
  });

  it("nextRetry never exceeds its bound, however many observations arrive", () => {
    let schedule = nextRetry(null, "down", new Date("2026-01-01T00:00:00.000Z"));
    for (let n = 0; n < 50; n += 1) schedule = nextRetry(schedule, "down", new Date("2026-01-01T00:00:00.000Z"));
    expect(schedule.attempts).toBe(RELEASE_RETRY_MAX_ATTEMPTS);
    expect(schedule.exhausted).toBe(true);
    expect(schedule.backoff_ms).toBe(60_000 * 2 ** (RELEASE_RETRY_MAX_ATTEMPTS - 1));
    expect(nextRetry(schedule, "a later error", new Date("2030-01-01T00:00:00.000Z"))).toEqual(schedule);
  });
});

describe("supersede (FRD-031 AC3) and terminal outcomes (AC4)", () => {
  it("mints a NEW candidate identity at a changed SHA and archives the incumbent with a successor", async () => {
    await policy(DEV_TO_MAIN);
    const first = await acquire({ integrationSha: SHA_A, includedTickets: ["CORE-1"] });
    await store.recordReleaseProgress({
      leaseId: first.lease!.lease_id,
      leaseRevision: first.lease!.lease_revision,
      verificationState: "passed",
      artifactManifest: ["stale-artifact"],
    });
    const held = (await store.releaseSnapshot()).channels[0]!;

    const second = await supersede({
      leaseId: held.lease_id,
      leaseRevision: held.lease_revision,
      integrationSha: SHA_B,
      includedTickets: ["CORE-1"],
    });

    expect(second.attempt.attempt_id).toBe("main@2");
    expect(second.attempt.candidate_id).toBe(candidateIdentity("main", SHA_B, 2));
    expect(second.attempt.candidate_id).not.toBe(first.attempt.candidate_id);
    expect(second.attempt.candidate_ref).toBe("release/main-2");
    expect(second.attempt.supersedes).toBe("main@1");
    // Evidence for candidate 1 does not carry to candidate 2.
    expect(second.attempt.artifact_manifest).toEqual([]);
    expect(second.attempt.verification_state).toBe("pending");
    expect(second.attempt.retry).toBeNull();

    const snapshot = await store.releaseSnapshot();
    expect(snapshot.unreadable).toBe(false);
    const archived = snapshot.attempts.find((entry) => entry.attempt_id === "main@1")!;
    expect(archived.outcome).toBe("superseded");
    expect(archived.successor).toBe("main@2");
    expect(archived.terminal_at).not.toBeNull();
    // The incumbent keeps its own proof.
    expect(archived.verification_state).toBe("passed");
    expect(archived.artifact_manifest).toEqual(["stale-artifact"]);
    // The lease moved rather than being cleared.
    expect(snapshot.channels).toHaveLength(1);
    expect(snapshot.channels[0]!.attempt_id).toBe("main@2");
    expect(snapshot.channels[0]!.lease_revision).toBe(1);
    expect(snapshot.channels[0]!.lease_id).not.toBe(held.lease_id);
  });

  it("reclaims an EXPIRED lease, which is the same verb", async () => {
    const first = await acquire({ integrationSha: SHA_A });
    await expireChannel("main");
    const held = (await store.releaseSnapshot()).channels[0]!;
    const other = new KanmerStore(root, { actor: "another-controller" });
    const second = await supersede({
      leaseId: held.lease_id,
      leaseRevision: held.lease_revision,
      integrationSha: SHA_B,
    }, other);
    expect(second.attempt.supersedes).toBe(first.attempt.attempt_id);
    expect(second.lease?.owner).toBe("another-controller");
  });

  it("refuses to take a LIVE lease from its owner without an operator reason", async () => {
    await acquire({ integrationSha: SHA_A });
    const held = (await store.releaseSnapshot()).channels[0]!;
    const other = new KanmerStore(root, { actor: "another-controller" });
    await expect(
      supersede({
        leaseId: held.lease_id,
        leaseRevision: held.lease_revision,
        integrationSha: SHA_B,
      }, other),
    ).rejects.toThrow(/^CLAIM_LIVE:/);
    const forced = await supersede({
      leaseId: held.lease_id,
      leaseRevision: held.lease_revision,
      integrationSha: SHA_B,
      reason: "operator: taking the channel back",
    }, other);
    expect(forced.attempt.attempt_id).toBe("main@2");
  });

  it("authorises supersession against the store actor, never a caller-supplied owner string", async () => {
    const alice = new KanmerStore(root, { actor: "alice" });
    const bob = new KanmerStore(root, { actor: "bob" });
    const taken = await acquire({ integrationSha: SHA_A }, alice);
    const spoofed = {
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      integrationSha: SHA_B,
      owner: "alice",
    } as Parameters<typeof bob.supersedeReleaseAttempt>[0] & { owner: string };
    await expect(supersede(spoofed, bob)).rejects.toThrow(/^CLAIM_LIVE:/);
    expect((await store.releaseSnapshot()).attempts).toHaveLength(1);
  });

  it("complete records the release and CLEARS the channel lease", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const done = await store.completeReleaseAttempt({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      releaseTag: "v1.2.3",
      artifactManifest: ["kanmer-1.2.3.exe"],
    });
    expect(done.attempt.outcome).toBe("released");
    expect(done.attempt.release_tag).toBe("v1.2.3");
    expect(done.lease).toBeNull();
    expect(done.leaseState).toBe("cleared");

    const snapshot = await store.releaseSnapshot();
    expect(snapshot.channels).toHaveLength(0);
    // The attempt record survives the cleared lease — it is the evidence.
    expect(snapshot.attempts).toHaveLength(1);
    // And the channel can be taken again, with a fresh, higher ordinal.
    const next = await acquire({ integrationSha: SHA_B });
    expect(next.attempt.attempt_id).toBe("main@2");
  });

  it("fail keeps the attempt's proof AND retains the channel", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const failed = await store.failReleaseAttempt({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      reason: "signing service rejected the artifact",
    });
    expect(failed.attempt.outcome).toBe("failed");
    expect(failed.attempt.failure_reason).toBe("signing service rejected the artifact");
    expect(failed.lease).not.toBeNull();
    const failedFile = path.join(root, ".kanmer", "releases", "attempts", "main@1.json");
    const failedBytes = await fs.readFile(failedFile);
    // A second owner cannot start on top of unexamined failure evidence.
    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_CHANNEL_HELD:/);
    // Supersede is the documented way forward.
    const next = await supersede({
      leaseId: failed.lease!.lease_id,
      leaseRevision: failed.lease!.lease_revision,
      integrationSha: SHA_B,
    });
    expect(next.attempt.supersedes).toBe("main@1");
    const snapshot = await store.releaseSnapshot();
    expect(snapshot.unreadable).toBe(false);
    const retained = snapshot.attempts.find((entry) => entry.attempt_id === "main@1");
    expect(retained).toEqual(failed.attempt);
    expect(retained?.outcome).toBe("failed");
    expect(retained?.successor).toBeNull();
    expect(await fs.readFile(failedFile)).toEqual(failedBytes);
  });

  it("refuses every write to a terminal attempt", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const failed = await store.failReleaseAttempt({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      reason: "nope",
    });
    const cas = { leaseId: failed.lease!.lease_id, leaseRevision: failed.lease!.lease_revision };
    await expect(store.recordReleaseProgress({ ...cas, verificationState: "passed" })).rejects.toThrow(/^RELEASE_ATTEMPT_TERMINAL:/);
    await expect(store.completeReleaseAttempt({ ...cas })).rejects.toThrow(/^RELEASE_ATTEMPT_TERMINAL:/);
    await expect(store.failReleaseAttempt({ ...cas, reason: "again" })).rejects.toThrow(/^RELEASE_ATTEMPT_TERMINAL:/);
  });

  it("refuses anything at all once the lease is cleared", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    await store.completeReleaseAttempt({ leaseId: taken.lease!.lease_id, leaseRevision: taken.lease!.lease_revision });
    await expect(
      store.renewReleaseChannel({ leaseId: taken.lease!.lease_id, leaseRevision: taken.lease!.lease_revision }),
    ).rejects.toThrow(/^LEASE_EXPIRED: release channel "main" holds no lease/);
  });
});

describe("classifyReleaseEvidence — the ordered mapping onto ReconciliationEvidence.release", () => {
  it("1. an unreadable record is unavailable, never a manufactured neutral", () => {
    expect(classifyReleaseEvidence(snapshotOf([], [], true), "T-1").state).toBe("unavailable");
  });

  it("2. no attempt naming the ticket is not-applicable", () => {
    expect(classifyReleaseEvidence(snapshotOf([]), "T-1").state).toBe("not-applicable");
    expect(classifyReleaseEvidence(snapshotOf([attempt({ included_tickets: ["T-2"] })]), "T-1").state).toBe("not-applicable");
  });

  it("3. a live retry schedule on an active attempt is unavailable", () => {
    const record = attempt({
      retry: { attempts: 1, max_attempts: 5, backoff_ms: 60_000, first_at: "x", last_at: "x", next_at: "x", last_error: "down", exhausted: false },
    });
    expect(classifyReleaseEvidence(snapshotOf([record], [channelRecord("main@1")]), "T-1").state).toBe("unavailable");
  });

  it("3b. an EXHAUSTED retry schedule is no longer unavailable — it stops claiming progress", () => {
    const record = attempt({
      retry: { attempts: 5, max_attempts: 5, backoff_ms: 60_000, first_at: "x", last_at: "x", next_at: "x", last_error: "down", exhausted: true },
    });
    expect(classifyReleaseEvidence(snapshotOf([record], [channelRecord("main@1")]), "T-1").state).toBe("not-applicable");
  });

  it("4. two active attempts naming the ticket is contended", () => {
    const a = attempt({ attempt_id: "main@1" });
    const b = attempt({ attempt_id: "beta@1", channel: "beta" });
    expect(classifyReleaseEvidence(snapshotOf([a, b], [channelRecord("main@1"), channelRecord("beta@1", { channel: "beta" })]), "T-1").state).toBe("contended");
  });

  it("4b. an active attempt that is not its channel's current holder is contended", () => {
    const orphan = attempt({ attempt_id: "main@1" });
    expect(classifyReleaseEvidence(snapshotOf([orphan], [channelRecord("main@2")]), "T-1").state).toBe("contended");
    // And with no channel record at all, which is the abandoned-attempt case.
    expect(classifyReleaseEvidence(snapshotOf([orphan]), "T-1").state).toBe("contended");
  });

  it("5. one cleanly owned active attempt is not-applicable", () => {
    expect(classifyReleaseEvidence(snapshotOf([attempt()], [channelRecord("main@1")]), "T-1").state).toBe("not-applicable");
  });

  it("6. a superseded terminal attempt is superseded", () => {
    const archived = attempt({ outcome: "superseded", terminal_at: "2026-01-02T00:00:00.000Z" });
    expect(classifyReleaseEvidence(snapshotOf([archived]), "T-1").state).toBe("superseded");
  });

  it("6b. the NEWEST terminal attempt decides, so a remediated ticket is not frozen forever", () => {
    const archived = attempt({ attempt_id: "main@1", outcome: "superseded", terminal_at: "2030-01-02T00:00:00.000Z", successor: "main@2" });
    const released = attempt({ attempt_id: "main@2", ordinal: 2, supersedes: "main@1", outcome: "released", terminal_at: "2020-01-03T00:00:00.000Z" });
    expect(classifyReleaseEvidence(snapshotOf([released, archived]), "T-1").state).toBe("not-applicable");
  });

  it.each(["active", "released", "failed"] as const)(
    "6c. follows a causal successor that drops the ticket through a %s outcome",
    (outcome) => {
      const archived = attempt({
        attempt_id: "main@1",
        outcome: "superseded",
        terminal_at: "2026-01-02T00:00:00.000Z",
        successor: "main@2",
      });
      const successor = attempt({
        attempt_id: "main@2",
        ordinal: 2,
        candidate_id: candidateIdentity("main", SHA_B, 2),
        integration_sha: SHA_B,
        supersedes: "main@1",
        included_tickets: [],
        outcome,
        terminal_at: outcome === "active" ? null : "2026-01-03T00:00:00.000Z",
        failure_reason: outcome === "failed" ? "candidate failed" : null,
        retry: outcome === "active"
          ? { attempts: 1, max_attempts: 5, backoff_ms: 60_000, first_at: "x", last_at: "x", next_at: "x", last_error: "down", exhausted: false }
          : null,
      });
      const channels = outcome === "active" ? [channelRecord("main@2")] : [];
      expect(classifyReleaseEvidence(snapshotOf([archived, successor], channels), "T-1").state).toBe("not-applicable");
    },
  );

  it("6d. follows more than one fresh-roster successor", () => {
    const first = attempt({
      attempt_id: "main@1",
      outcome: "superseded",
      terminal_at: "2026-01-02T00:00:00.000Z",
      successor: "main@2",
    });
    const second = attempt({
      attempt_id: "main@2",
      ordinal: 2,
      candidate_id: candidateIdentity("main", SHA_B, 2),
      integration_sha: SHA_B,
      supersedes: "main@1",
      included_tickets: [],
      outcome: "superseded",
      terminal_at: "2026-01-03T00:00:00.000Z",
      successor: "main@3",
    });
    const shaC = "c".repeat(40);
    const third = attempt({
      attempt_id: "main@3",
      ordinal: 3,
      candidate_id: candidateIdentity("main", shaC, 3),
      integration_sha: shaC,
      supersedes: "main@2",
      included_tickets: [],
      outcome: "released",
      terminal_at: "2026-01-04T00:00:00.000Z",
    });
    expect(classifyReleaseEvidence(snapshotOf([first, second, third]), "T-1").state).toBe("not-applicable");
  });

  it("6e. incomparable terminal outcomes on different channels are contended", () => {
    const main = attempt({ outcome: "superseded", terminal_at: "2030-01-01T00:00:00.000Z" });
    const beta = attempt({
      attempt_id: "beta@1",
      channel: "beta",
      candidate_id: candidateIdentity("beta", SHA_A, 1),
      outcome: "released",
      terminal_at: "2020-01-01T00:00:00.000Z",
    });
    expect(classifyReleaseEvidence(snapshotOf([main, beta]), "T-1").state).toBe("contended");
  });

  it("7. released and failed terminal attempts are not-applicable — no ticket waits on a release", () => {
    expect(classifyReleaseEvidence(snapshotOf([attempt({ outcome: "released", terminal_at: "2026-01-02T00:00:00.000Z" })]), "T-1").state).toBe("not-applicable");
    expect(classifyReleaseEvidence(snapshotOf([attempt({ outcome: "failed", terminal_at: "2026-01-02T00:00:00.000Z" })]), "T-1").state).toBe("not-applicable");
  });

  it("scopes an unavailable release service to that attempt's tickets only", async () => {
    const taken = await acquire({ integrationSha: SHA_A, includedTickets: ["CORE-1"] });
    await store.recordReleaseProgress({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      serviceUnavailable: "registry unreachable",
    });
    const snapshot = await store.releaseSnapshot();
    expect(classifyReleaseEvidence(snapshot, "CORE-1").state).toBe("unavailable");
    expect(classifyReleaseEvidence(snapshot, "CORE-99").state).toBe("not-applicable");
  });
});

describe("release-record corruption, identity and interruption recovery", () => {
  it("fails closed when mutable lease ownership disagrees with the immutable attempt", async () => {
    const alice = new KanmerStore(root, { actor: "alice" });
    const bob = new KanmerStore(root, { actor: "bob" });
    const taken = await acquire({ integrationSha: SHA_A }, alice);
    const channelFile = path.join(root, ".kanmer", "releases", "channels", "main.json");
    const attemptFile = path.join(root, ".kanmer", "releases", "attempts", "main@1.json");
    const headFile = path.join(root, ".kanmer", "releases", "heads", "main.json");
    const corrupt = { ...taken.lease!, owner: "bob" };
    await fs.writeFile(channelFile, `${JSON.stringify(corrupt, null, 2)}\n`, "utf8");
    const before = await Promise.all([channelFile, attemptFile, headFile].map((file) => fs.readFile(file)));
    expect((await store.releaseSnapshot()).unreadable).toBe(true);

    const cas = { leaseId: corrupt.lease_id, leaseRevision: corrupt.lease_revision };
    const writes = [
      () => bob.renewReleaseChannel(cas),
      () => bob.recordReleaseProgress({ ...cas, verificationState: "passed" }),
      () => supersede({ ...cas, integrationSha: SHA_B }, bob),
      () => bob.completeReleaseAttempt(cas),
      () => bob.failReleaseAttempt({ ...cas, reason: "spoofed" }),
    ];
    for (const write of writes) await expect(write()).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    const after = await Promise.all([channelFile, attemptFile, headFile].map((file) => fs.readFile(file)));
    expect(after).toEqual(before);
    expect(await fs.readdir(path.join(root, ".kanmer", "releases", "transactions"))).toEqual([]);
  });

  it("distinguishes an absent channel from malformed or unreadable ownership and never overwrites it", async () => {
    const channels = path.join(root, ".kanmer", "releases", "channels");
    const file = path.join(channels, "main.json");
    await fs.mkdir(channels, { recursive: true });
    await fs.writeFile(file, "{ truncated", "utf8");
    const malformed = await fs.readFile(file, "utf8");
    await expect(acquire({ integrationSha: SHA_A })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect(await fs.readFile(file, "utf8")).toBe(malformed);
    expect((await store.releaseSnapshot()).attempts).toEqual([]);

    await fs.unlink(file);
    await fs.mkdir(file);
    await expect(acquire({ integrationSha: SHA_A })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect((await fs.stat(file)).isDirectory()).toBe(true);
    expect((await store.releaseSnapshot()).attempts).toEqual([]);

    await removeTreeWithRetry(channels);
    await fs.writeFile(channels, "not a directory", "utf8");
    await expect(acquire({ integrationSha: SHA_A })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect(await fs.readFile(channels, "utf8")).toBe("not a directory");
    expect((await store.releaseSnapshot()).unreadable).toBe(true);
  });

  it("recovers a crash after the immutable attempt write and before the channel write", async () => {
    const record = attempt();
    const lease = channelRecord(record.attempt_id);
    const head = headRecord(record.attempt_id);
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const transactionsDir = path.join(root, ".kanmer", "releases", "transactions");
    await fs.mkdir(attemptsDir, { recursive: true });
    await fs.mkdir(transactionsDir, { recursive: true });
    await fs.writeFile(path.join(attemptsDir, "main@1.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(transactionsDir, "main.json"), `${JSON.stringify({
      schema: 1,
      transaction_id: "interrupted-acquire",
      channel: "main",
      created_at: "2026-01-01T00:00:00.000Z",
      attempts: [{ before: null, after: record }],
      head_record: { before: null, after: head },
      channel_record: { before: null, after: lease },
    }, null, 2)}\n`, "utf8");

    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_CHANNEL_HELD:/);
    const snapshot = await store.releaseSnapshot();
    expect(snapshot.pending).toEqual([]);
    expect(snapshot.attempts.map((entry) => entry.attempt_id)).toEqual(["main@1"]);
    expect(snapshot.heads).toEqual([head]);
    expect(snapshot.channels).toEqual([lease]);
  });

  it("rolls a journal-only interrupted acquire forward without minting another attempt", async () => {
    const record = attempt();
    const lease = channelRecord(record.attempt_id);
    const head = headRecord(record.attempt_id);
    const transactionsDir = path.join(root, ".kanmer", "releases", "transactions");
    await fs.mkdir(transactionsDir, { recursive: true });
    await fs.writeFile(path.join(transactionsDir, "main.json"), `${JSON.stringify({
      schema: 1,
      transaction_id: "journal-only-acquire",
      channel: "main",
      created_at: "2026-01-01T00:00:00.000Z",
      attempts: [{ before: null, after: record }],
      head_record: { before: null, after: head },
      channel_record: { before: null, after: lease },
    }, null, 2)}\n`, "utf8");

    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_CHANNEL_HELD:/);
    const snapshot = await store.releaseSnapshot();
    expect(snapshot.pending).toEqual([]);
    expect(snapshot.attempts).toEqual([record]);
    expect(snapshot.heads).toEqual([head]);
    expect(snapshot.channels).toEqual([lease]);
  });

  it("recovers an interruption after publishing the pending epoch but before the journal", async () => {
    const releases = path.join(root, ".kanmer", "releases");
    await fs.mkdir(releases, { recursive: true });
    await fs.writeFile(path.join(releases, "state.json"), `${JSON.stringify({
      schema: 1,
      revision: 1,
      phase: "pending",
      transaction_id: "pre-journal-interruption",
      channel: "main",
    }, null, 2)}\n`, "utf8");

    const taken = await acquire({ integrationSha: SHA_A });
    expect(taken.attempt.attempt_id).toBe("main@1");
    expect(JSON.parse(await fs.readFile(path.join(releases, "state.json"), "utf8"))).toMatchObject({
      revision: 2,
      phase: "stable",
      channel: "main",
    });
  });

  it("recovers a crash after the durable head write and before the channel write", async () => {
    const record = attempt();
    const head = headRecord(record.attempt_id);
    const lease = channelRecord(record.attempt_id);
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const headsDir = path.join(root, ".kanmer", "releases", "heads");
    const transactionsDir = path.join(root, ".kanmer", "releases", "transactions");
    await Promise.all([attemptsDir, headsDir, transactionsDir].map((dir) => fs.mkdir(dir, { recursive: true })));
    await fs.writeFile(path.join(attemptsDir, "main@1.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(headsDir, "main.json"), `${JSON.stringify(head, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(transactionsDir, "main.json"), `${JSON.stringify({
      schema: 1,
      transaction_id: "interrupted-after-head",
      channel: "main",
      created_at: "2026-01-01T00:00:00.000Z",
      attempts: [{ before: null, after: record }],
      head_record: { before: null, after: head },
      channel_record: { before: null, after: lease },
    }, null, 2)}\n`, "utf8");

    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_CHANNEL_HELD:/);
    const snapshot = await store.releaseSnapshot();
    expect(snapshot.pending).toEqual([]);
    expect(snapshot.heads).toEqual([head]);
    expect(snapshot.channels).toEqual([lease]);
  });

  it.each(["predecessor", "head"] as const)(
    "rolls an interrupted supersede forward after the %s write",
    async (prefix) => {
      const taken = await acquire({ integrationSha: SHA_A, includedTickets: ["T-1"] });
      const createdAt = new Date(Date.parse(taken.lease!.heartbeat_at) + 1_000).toISOString();
      const archived: ReleaseAttemptRecord = {
        ...taken.attempt,
        outcome: "superseded",
        terminal_at: createdAt,
        successor: "main@2",
      };
      const successor = attempt({
        attempt_id: "main@2",
        ordinal: 2,
        candidate_id: candidateIdentity("main", SHA_B, 2),
        integration_sha: SHA_B,
        created_at: createdAt,
        owner: taken.attempt.owner,
        supersedes: "main@1",
        included_tickets: ["T-2"],
      });
      const beforeHead = (await store.releaseSnapshot()).heads[0]!;
      const afterHead = headRecord("main@2");
      const afterLease = channelRecord("main@2", {
        lease_id: "lease-2",
        owner: successor.owner,
        acquired_at: createdAt,
        heartbeat_at: createdAt,
        expires_at: new Date(Date.parse(createdAt) + 30 * 60_000).toISOString(),
      });
      const journal = {
        schema: 1,
        transaction_id: `interrupted-supersede-${prefix}`,
        channel: "main",
        created_at: createdAt,
        attempts: [
          { before: taken.attempt, after: archived },
          { before: null, after: successor },
        ],
        head_record: { before: beforeHead, after: afterHead },
        channel_record: { before: taken.lease!, after: afterLease },
      };
      const releases = path.join(root, ".kanmer", "releases");
      const stateFile = path.join(releases, "state.json");
      const state = JSON.parse(await fs.readFile(stateFile, "utf8")) as { revision: number };
      await fs.writeFile(stateFile, `${JSON.stringify({
        schema: 1,
        revision: state.revision + 1,
        phase: "pending",
        transaction_id: journal.transaction_id,
        channel: "main",
      }, null, 2)}\n`, "utf8");
      await fs.writeFile(
        path.join(releases, "transactions", "main.json"),
        `${JSON.stringify(journal, null, 2)}\n`,
        "utf8",
      );
      await fs.writeFile(path.join(releases, "attempts", "main@1.json"), `${JSON.stringify(archived, null, 2)}\n`, "utf8");
      if (prefix === "head") {
        await fs.writeFile(path.join(releases, "attempts", "main@2.json"), `${JSON.stringify(successor, null, 2)}\n`, "utf8");
        await fs.writeFile(path.join(releases, "heads", "main.json"), `${JSON.stringify(afterHead, null, 2)}\n`, "utf8");
      }

      expect(await recoverReleaseMutation(paths(), "main")).toBe(true);
      const snapshot = await store.releaseSnapshot();
      expect(snapshot.unreadable).toBe(false);
      expect(snapshot.pending).toEqual([]);
      expect(snapshot.attempts).toEqual([archived, successor]);
      expect(snapshot.heads).toEqual([afterHead]);
      expect(snapshot.channels).toEqual([afterLease]);
    },
  );

  it("retains the ordinal high-water mark after completion and never reuses a lost identity", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const done = await store.completeReleaseAttempt({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
    });
    const attemptFile = path.join(root, ".kanmer", "releases", "attempts", "main@1.json");
    const headFile = path.join(root, ".kanmer", "releases", "heads", "main.json");
    const attemptBytes = await fs.readFile(attemptFile);
    const headBytes = await fs.readFile(headFile);
    await fs.unlink(attemptFile);

    expect((await store.releaseSnapshot()).unreadable).toBe(true);
    await expect(acquire({ integrationSha: SHA_A })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    await expect(fs.stat(attemptFile)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readFile(headFile)).toEqual(headBytes);

    await fs.writeFile(attemptFile, attemptBytes);
    const successor = await acquire({ integrationSha: SHA_A });
    expect(successor.attempt.attempt_id).toBe("main@2");
    expect(successor.attempt.candidate_id).not.toBe(done.attempt.candidate_id);
  });

  it("allocates from the durable head without parsing retained history", async () => {
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const headsDir = path.join(root, ".kanmer", "releases", "heads");
    await Promise.all([attemptsDir, headsDir].map((dir) => fs.mkdir(dir, { recursive: true })));
    // Historical contents are deliberately unreadable. The allocator needs
    // only the strict head and its exact latest endpoint, not a linear replay.
    for (let ordinal = 1; ordinal < 250; ordinal += 1) {
      await fs.writeFile(path.join(attemptsDir, `main@${ordinal}.json`), "not-json", "utf8");
    }
    const latest = attempt({
      attempt_id: "main@250",
      ordinal: 250,
      candidate_id: candidateIdentity("main", SHA_A, 250),
    });
    await fs.writeFile(path.join(attemptsDir, "main@250.json"), `${JSON.stringify(latest, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(headsDir, "main.json"), `${JSON.stringify(headRecord("main@250"), null, 2)}\n`, "utf8");
    expect(await nextOrdinal(paths(), "main")).toBe(251);
  });

  it("removes a retained journal after finding its whole transaction already applied", async () => {
    const record = attempt();
    const lease = channelRecord(record.attempt_id);
    const head = headRecord(record.attempt_id);
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const channelsDir = path.join(root, ".kanmer", "releases", "channels");
    const headsDir = path.join(root, ".kanmer", "releases", "heads");
    const transactionsDir = path.join(root, ".kanmer", "releases", "transactions");
    await Promise.all([attemptsDir, channelsDir, headsDir, transactionsDir].map((dir) => fs.mkdir(dir, { recursive: true })));
    const journal = {
      schema: 1,
      transaction_id: "applied-before-cleanup",
      channel: "main",
      created_at: "2026-01-01T00:00:00.000Z",
      attempts: [{ before: null, after: record }],
      head_record: { before: null, after: head },
      channel_record: { before: null, after: lease },
    };
    await fs.writeFile(path.join(attemptsDir, "main@1.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(headsDir, "main.json"), `${JSON.stringify(head, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(channelsDir, "main.json"), `${JSON.stringify(lease, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(transactionsDir, "main.json"), `${JSON.stringify(journal, null, 2)}\n`, "utf8");

    const renewed = await store.renewReleaseChannel({ leaseId: lease.lease_id, leaseRevision: lease.lease_revision });
    expect(renewed.lease?.lease_revision).toBe(2);
    expect((await store.releaseSnapshot()).pending).toEqual([]);
  });

  it("retains the journal and every existing byte when replay sees conflicting state", async () => {
    const intended = attempt();
    const conflicting = { ...intended, included_tickets: ["OTHER"] };
    const lease = channelRecord(intended.attempt_id);
    const head = headRecord(intended.attempt_id);
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const transactionsDir = path.join(root, ".kanmer", "releases", "transactions");
    await fs.mkdir(attemptsDir, { recursive: true });
    await fs.mkdir(transactionsDir, { recursive: true });
    const attemptBytes = `${JSON.stringify(conflicting, null, 2)}\n`;
    const journalBytes = `${JSON.stringify({
      schema: 1,
      transaction_id: "conflicting-replay",
      channel: "main",
      created_at: "2026-01-01T00:00:00.000Z",
      attempts: [{ before: null, after: intended }],
      head_record: { before: null, after: head },
      channel_record: { before: null, after: lease },
    }, null, 2)}\n`;
    const attemptFile = path.join(attemptsDir, "main@1.json");
    const journalFile = path.join(transactionsDir, "main.json");
    await fs.writeFile(attemptFile, attemptBytes, "utf8");
    await fs.writeFile(journalFile, journalBytes, "utf8");

    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_TRANSACTION_CONFLICT:/);
    expect(await fs.readFile(attemptFile, "utf8")).toBe(attemptBytes);
    expect(await fs.readFile(journalFile, "utf8")).toBe(journalBytes);
    expect(await fs.readdir(path.join(root, ".kanmer", "releases"))).not.toContain("channels");
  });

  it("fails closed on a malformed recovery journal", async () => {
    const dir = path.join(root, ".kanmer", "releases", "transactions");
    const file = path.join(dir, "main.json");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, "{ truncated", "utf8");
    await expect(acquire({ integrationSha: SHA_A })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect(await fs.readFile(file, "utf8")).toBe("{ truncated");
    expect((await store.releaseSnapshot()).unreadable).toBe(true);
  });

  it("rejects a recovery journal whose lease and immutable attempt owners disagree", async () => {
    const record = attempt({ owner: "alice" });
    const head = headRecord(record.attempt_id);
    const lease = channelRecord(record.attempt_id, { owner: "bob" });
    const dir = path.join(root, ".kanmer", "releases", "transactions");
    const file = path.join(dir, "main.json");
    await fs.mkdir(dir, { recursive: true });
    const bytes = `${JSON.stringify({
      schema: 1,
      transaction_id: "owner-mismatch",
      channel: "main",
      created_at: "2026-01-01T00:00:00.000Z",
      attempts: [{ before: null, after: record }],
      head_record: { before: null, after: head },
      channel_record: { before: null, after: lease },
    }, null, 2)}\n`;
    await fs.writeFile(file, bytes, "utf8");

    await expect(acquire({ integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect(await fs.readFile(file, "utf8")).toBe(bytes);
    expect((await store.releaseSnapshot()).unreadable).toBe(true);
  });

  it("rejects duplicate, extra, immutable and lease-CAS journal rewrites without changing evidence", async () => {
    const taken = await acquire({ integrationSha: SHA_A, includedTickets: ["T-1"] });
    const beforeAttempt = taken.attempt;
    const beforeLease = taken.lease!;
    const beforeHead = (await store.releaseSnapshot()).heads[0]!;
    const createdAt = new Date(Date.parse(beforeLease.heartbeat_at) + 1_000).toISOString();
    const renewedLease = {
      ...beforeLease,
      lease_revision: beforeLease.lease_revision + 1,
      heartbeat_at: createdAt,
      expires_at: new Date(Date.parse(createdAt) + 30 * 60_000).toISOString(),
    };
    const base = {
      schema: 1,
      transaction_id: "semantic-refusal",
      channel: "main",
      created_at: createdAt,
      attempts: [{ before: beforeAttempt, after: beforeAttempt }],
      head_record: { before: beforeHead, after: beforeHead },
      channel_record: { before: beforeLease, after: renewedLease },
    };
    const successor = attempt({
      attempt_id: "main@2",
      ordinal: 2,
      candidate_id: candidateIdentity("main", SHA_B, 2),
      integration_sha: SHA_B,
      created_at: createdAt,
      owner: beforeAttempt.owner,
    });
    const variants = [
      { ...base, attempts: [...base.attempts, ...base.attempts] },
      { ...base, attempts: [...base.attempts, { before: null, after: successor }] },
      {
        ...base,
        attempts: [{
          before: beforeAttempt,
          after: {
            ...beforeAttempt,
            integration_sha: SHA_B,
            candidate_id: candidateIdentity("main", SHA_B, beforeAttempt.ordinal),
          },
        }],
      },
      {
        ...base,
        attempts: [{ before: beforeAttempt, after: { ...beforeAttempt, owner: "spoofed-owner" } }],
        channel_record: { before: beforeLease, after: { ...renewedLease, owner: "spoofed-owner" } },
      },
      {
        ...base,
        attempts: [{
          before: beforeAttempt,
          after: { ...beforeAttempt, unexpected_schema_1_field: "must not persist" },
        }],
      },
      {
        ...base,
        channel_record: { before: beforeLease, after: { ...renewedLease, lease_revision: beforeLease.lease_revision } },
      },
    ];
    const transactionFile = path.join(root, ".kanmer", "releases", "transactions", "main.json");
    const attemptFile = path.join(root, ".kanmer", "releases", "attempts", "main@1.json");
    const channelFile = path.join(root, ".kanmer", "releases", "channels", "main.json");
    const attemptBytes = await fs.readFile(attemptFile);
    const channelBytes = await fs.readFile(channelFile);
    for (const variant of variants) {
      const bytes = `${JSON.stringify(variant, null, 2)}\n`;
      await fs.writeFile(transactionFile, bytes, "utf8");
      await expect(store.renewReleaseChannel({
        leaseId: beforeLease.lease_id,
        leaseRevision: beforeLease.lease_revision,
      })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
      expect(await fs.readFile(transactionFile, "utf8")).toBe(bytes);
      expect(await fs.readFile(attemptFile)).toEqual(attemptBytes);
      expect(await fs.readFile(channelFile)).toEqual(channelBytes);
      await fs.unlink(transactionFile);
    }
  });

  it("rejects a journal that rewrites retained terminal proof", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const failedAt = new Date(Date.parse(taken.lease!.heartbeat_at) + 1_000);
    const failed = await store.failReleaseAttempt({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      reason: "publisher refused the candidate",
      now: failedAt,
    });
    const head = (await store.releaseSnapshot()).heads[0]!;
    const createdAt = new Date(failedAt.getTime() + 1_000).toISOString();
    const renewedLease = {
      ...failed.lease!,
      lease_revision: failed.lease!.lease_revision + 1,
      heartbeat_at: createdAt,
      expires_at: new Date(Date.parse(createdAt) + 30 * 60_000).toISOString(),
    };
    const journal = {
      schema: 1,
      transaction_id: "terminal-rewrite",
      channel: "main",
      created_at: createdAt,
      attempts: [{
        before: failed.attempt,
        after: { ...failed.attempt, failure_reason: "rewritten terminal proof" },
      }],
      head_record: { before: head, after: head },
      channel_record: { before: failed.lease!, after: renewedLease },
    };
    const releases = path.join(root, ".kanmer", "releases");
    const transactionFile = path.join(releases, "transactions", "main.json");
    const attemptFile = path.join(releases, "attempts", "main@1.json");
    const beforeBytes = await fs.readFile(attemptFile);
    await fs.writeFile(transactionFile, `${JSON.stringify(journal, null, 2)}\n`, "utf8");

    await expect(store.renewReleaseChannel({
      leaseId: failed.lease!.lease_id,
      leaseRevision: failed.lease!.lease_revision,
    })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect(await fs.readFile(attemptFile)).toEqual(beforeBytes);
    await expect(fs.stat(transactionFile)).resolves.toBeDefined();
  });

  it("preflights every journal CAS before writing an earlier attempt", async () => {
    const taken = await acquire({ integrationSha: SHA_A, includedTickets: ["T-1"] });
    const beforeAttempt = taken.attempt;
    const beforeLease = taken.lease!;
    const beforeHead = (await store.releaseSnapshot()).heads[0]!;
    const createdAt = new Date(Date.parse(beforeLease.heartbeat_at) + 1_000).toISOString();
    const afterAttempt = { ...beforeAttempt, included_tickets: ["T-1", "T-2"] };
    const afterLease = {
      ...beforeLease,
      lease_revision: beforeLease.lease_revision + 1,
      heartbeat_at: createdAt,
      expires_at: new Date(Date.parse(createdAt) + 30 * 60_000).toISOString(),
    };
    const journal = {
      schema: 1,
      transaction_id: "preflight-all-cas",
      channel: "main",
      created_at: createdAt,
      attempts: [{ before: beforeAttempt, after: afterAttempt }],
      head_record: { before: beforeHead, after: beforeHead },
      channel_record: { before: beforeLease, after: afterLease },
    };
    const releases = path.join(root, ".kanmer", "releases");
    const transactionFile = path.join(releases, "transactions", "main.json");
    const stateFile = path.join(releases, "state.json");
    const attemptFile = path.join(releases, "attempts", "main@1.json");
    const channelFile = path.join(releases, "channels", "main.json");
    const state = JSON.parse(await fs.readFile(stateFile, "utf8")) as { revision: number };
    await fs.writeFile(transactionFile, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
    await fs.writeFile(stateFile, `${JSON.stringify({
      schema: 1,
      revision: state.revision + 1,
      phase: "pending",
      transaction_id: journal.transaction_id,
      channel: "main",
    }, null, 2)}\n`, "utf8");
    const conflictingLease = { ...beforeLease, lease_revision: beforeLease.lease_revision + 9 };
    await fs.writeFile(channelFile, `${JSON.stringify(conflictingLease, null, 2)}\n`, "utf8");
    const attemptBytes = await fs.readFile(attemptFile);
    const headBytes = await fs.readFile(path.join(releases, "heads", "main.json"));

    await expect(store.renewReleaseChannel({
      leaseId: beforeLease.lease_id,
      leaseRevision: beforeLease.lease_revision,
    })).rejects.toThrow(/^RELEASE_TRANSACTION_CONFLICT:/);
    expect(await fs.readFile(attemptFile)).toEqual(attemptBytes);
    expect(await fs.readFile(path.join(releases, "heads", "main.json"))).toEqual(headBytes);
    expect(JSON.parse(await fs.readFile(channelFile, "utf8"))).toEqual(conflictingLease);
    await expect(fs.stat(transactionFile)).resolves.toBeDefined();
  });

  it("validates every required attempt, head and channel field plus their enums before admission", async () => {
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const headsDir = path.join(root, ".kanmer", "releases", "heads");
    const channelsDir = path.join(root, ".kanmer", "releases", "channels");
    await fs.mkdir(attemptsDir, { recursive: true });
    await fs.mkdir(headsDir, { recursive: true });
    await fs.mkdir(channelsDir, { recursive: true });
    const attemptFile = path.join(attemptsDir, "main@1.json");
    const headFile = path.join(headsDir, "main.json");
    const channelFile = path.join(channelsDir, "main.json");
    const completeAttempt = attempt();
    const completeHead = headRecord("main@1");
    const completeChannel = channelRecord("main@1");
    await fs.writeFile(headFile, `${JSON.stringify(completeHead)}\n`, "utf8");

    for (const field of Object.keys(completeAttempt) as (keyof ReleaseAttemptRecord)[]) {
      const malformed = { ...completeAttempt } as Partial<ReleaseAttemptRecord>;
      delete malformed[field];
      await fs.writeFile(attemptFile, `${JSON.stringify(malformed)}\n`, "utf8");
      const snapshot = await readReleaseSnapshot(paths());
      expect(snapshot.unreadable, `missing attempt.${field}`).toBe(true);
      expect(snapshot.attempts, `missing attempt.${field}`).toEqual([]);
      expect(classifyReleaseEvidence(snapshot, "T-1").state).toBe("unavailable");
    }

    await fs.writeFile(attemptFile, `${JSON.stringify(completeAttempt)}\n`, "utf8");
    for (const field of Object.keys(completeHead) as (keyof ReleaseChannelHeadRecord)[]) {
      const malformed = { ...completeHead } as Partial<ReleaseChannelHeadRecord>;
      delete malformed[field];
      await fs.writeFile(headFile, `${JSON.stringify(malformed)}\n`, "utf8");
      const snapshot = await readReleaseSnapshot(paths());
      expect(snapshot.unreadable, `missing head.${field}`).toBe(true);
      expect(snapshot.heads, `missing head.${field}`).toEqual([]);
    }

    await fs.writeFile(headFile, `${JSON.stringify(completeHead)}\n`, "utf8");
    for (const field of Object.keys(completeChannel) as (keyof ReleaseChannelRecord)[]) {
      const malformed = { ...completeChannel } as Partial<ReleaseChannelRecord>;
      delete malformed[field];
      await fs.writeFile(channelFile, `${JSON.stringify(malformed)}\n`, "utf8");
      const snapshot = await readReleaseSnapshot(paths());
      expect(snapshot.unreadable, `missing channel.${field}`).toBe(true);
      expect(snapshot.channels, `missing channel.${field}`).toEqual([]);
    }

    await fs.writeFile(channelFile, `${JSON.stringify(completeChannel)}\n`, "utf8");
    for (const [field, value] of [["outcome", "done"], ["verification_state", "unknown"]] as const) {
      await fs.writeFile(attemptFile, `${JSON.stringify({ ...completeAttempt, [field]: value })}\n`, "utf8");
      expect((await readReleaseSnapshot(paths())).unreadable, `invalid attempt.${field}`).toBe(true);
    }

    const validRetry = {
      attempts: 1,
      max_attempts: 5,
      backoff_ms: 60_000,
      first_at: "2026-01-01T00:00:00.000Z",
      last_at: "2026-01-01T00:00:00.000Z",
      next_at: "2026-01-01T00:01:00.000Z",
      last_error: "publisher unavailable",
      exhausted: false,
    };
    for (const retry of [
      { ...validRetry, attempts: 6 },
      { ...validRetry, attempts: 6, max_attempts: 6, exhausted: true },
      { ...validRetry, exhausted: true },
      { ...validRetry, next_at: "not-a-date" },
      { ...validRetry, last_error: "" },
      { ...validRetry, max_attempts: 0 },
    ]) {
      await fs.writeFile(attemptFile, `${JSON.stringify({ ...completeAttempt, retry })}\n`, "utf8");
      expect((await readReleaseSnapshot(paths())).unreadable, `invalid retry ${JSON.stringify(retry)}`).toBe(true);
    }

    const exactShapeCases = [
      { label: "attempt", file: attemptFile, value: { ...completeAttempt, unexpected_schema_1_field: true } },
      { label: "head", file: headFile, value: { ...completeHead, unexpected_schema_1_field: true } },
      { label: "channel", file: channelFile, value: { ...completeChannel, unexpected_schema_1_field: true } },
      {
        label: "retry",
        file: attemptFile,
        value: { ...completeAttempt, retry: { ...validRetry, unexpected_schema_1_field: true } },
      },
    ];
    for (const shape of exactShapeCases) {
      await fs.writeFile(attemptFile, `${JSON.stringify(completeAttempt)}\n`, "utf8");
      await fs.writeFile(headFile, `${JSON.stringify(completeHead)}\n`, "utf8");
      await fs.writeFile(channelFile, `${JSON.stringify(completeChannel)}\n`, "utf8");
      await fs.writeFile(shape.file, `${JSON.stringify(shape.value)}\n`, "utf8");
      expect((await readReleaseSnapshot(paths())).unreadable, `extra ${shape.label} field`).toBe(true);
    }

    await fs.writeFile(attemptFile, `${JSON.stringify(completeAttempt)}\n`, "utf8");
    await fs.writeFile(headFile, `${JSON.stringify(completeHead)}\n`, "utf8");
    await fs.writeFile(channelFile, `${JSON.stringify(completeChannel)}\n`, "utf8");
    await fs.writeFile(path.join(root, ".kanmer", "releases", "state.json"), `${JSON.stringify({
      schema: 1,
      revision: 1,
      phase: "stable",
      transaction_id: "complete-transaction",
      channel: "main",
      unexpected_schema_1_field: true,
    })}\n`, "utf8");
    expect((await readReleaseSnapshot(paths())).unreadable, "extra state field").toBe(true);
  });

  it("fails closed on a malformed transaction epoch and preserves every release record", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const releases = path.join(root, ".kanmer", "releases");
    const stateFile = path.join(releases, "state.json");
    const state = JSON.parse(await fs.readFile(stateFile, "utf8")) as Record<string, unknown>;
    delete state.phase;
    const malformed = `${JSON.stringify(state, null, 2)}\n`;
    await fs.writeFile(stateFile, malformed, "utf8");
    const attemptBytes = await fs.readFile(path.join(releases, "attempts", "main@1.json"));
    const channelBytes = await fs.readFile(path.join(releases, "channels", "main.json"));

    expect((await store.releaseSnapshot()).unreadable).toBe(true);
    await expect(store.renewReleaseChannel({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
    })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect(await fs.readFile(stateFile, "utf8")).toBe(malformed);
    expect(await fs.readFile(path.join(releases, "attempts", "main@1.json"))).toEqual(attemptBytes);
    expect(await fs.readFile(path.join(releases, "channels", "main.json"))).toEqual(channelBytes);
  });

  it("reports noncanonical JSON extension casing and refuses to mint around it", async () => {
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const file = path.join(attemptsDir, "main@1.JSON");
    await fs.mkdir(attemptsDir, { recursive: true });
    const bytes = `${JSON.stringify(attempt())}\n`;
    await fs.writeFile(file, bytes, "utf8");

    expect((await readReleaseSnapshot(paths())).unreadable).toBe(true);
    await expect(acquire({ integrationSha: SHA_A })).rejects.toThrow(/^RELEASE_CHANNEL_CASE_COLLISION:/);
    expect(await fs.readFile(file, "utf8")).toBe(bytes);
    expect(await fs.readdir(attemptsDir)).toEqual(["main@1.JSON"]);
  });

  it("refuses to mint around an attributable malformed attempt filename", async () => {
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const file = path.join(attemptsDir, "main@junk.json");
    await fs.mkdir(attemptsDir, { recursive: true });
    const bytes = `${JSON.stringify(attempt())}\n`;
    await fs.writeFile(file, bytes, "utf8");

    expect((await readReleaseSnapshot(paths())).unreadable).toBe(true);
    await expect(acquire({ integrationSha: SHA_A })).rejects.toThrow(/^RELEASE_RECORD_UNREADABLE:/);
    expect(await fs.readFile(file, "utf8")).toBe(bytes);
    expect(await fs.readdir(attemptsDir)).toEqual(["main@junk.json"]);
  });

  it("normalizes case variants into one cross-platform channel identity", async () => {
    const first = await acquire({ channel: "Main", integrationSha: SHA_A });
    expect(first.channel).toBe("main");
    await expect(acquire({ channel: "MAIN", integrationSha: SHA_B })).rejects.toThrow(/^RELEASE_CHANNEL_HELD:/);
    expect((await store.releaseSnapshot()).attempts.map((entry) => entry.attempt_id)).toEqual(["main@1"]);
  });

  it("refuses delivery-policy drift without minting any release record", async () => {
    await expect(acquire({
      integrationSha: SHA_A,
      expectedPolicyVersion: "0".repeat(64),
    })).rejects.toThrow(/^RELEASE_POLICY_DRIFT:/);
    expect(await store.releaseSnapshot()).toEqual({ channels: [], heads: [], attempts: [], pending: [], unreadable: false });
  });
});

describe("the release records are a sidecar the stable server cannot see", () => {
  it("writes nothing outside .kanmer/releases/ across a whole release cycle", async () => {
    await policy(DEV_TO_MAIN);
    await store.createItem({ type: "ticket", title: "Feature", ...free });
    const boardBefore = await fs.readFile(path.join(root, ".kanmer", "data", "board.yml"), "utf8");
    const areasBefore = await fs.readdir(path.join(root, ".kanmer", "areas"), { recursive: true });

    const taken = await acquire({ integrationSha: SHA_A, includedTickets: ["T-1"] });
    const held = await store.recordReleaseProgress({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      verificationState: "passed",
    });
    const next = await supersede({
      leaseId: held.lease!.lease_id,
      leaseRevision: held.lease!.lease_revision,
      integrationSha: SHA_B,
    });
    await store.completeReleaseAttempt({ leaseId: next.lease!.lease_id, leaseRevision: next.lease!.lease_revision });

    expect(await fs.readFile(path.join(root, ".kanmer", "data", "board.yml"), "utf8")).toBe(boardBefore);
    expect(await fs.readdir(path.join(root, ".kanmer", "areas"), { recursive: true })).toEqual(areasBefore);
    // The board config itself never learns about the channel.
    expect(JSON.stringify(await store.getBoard())).not.toContain("releases");
    expect(await fs.readdir(path.join(root, ".kanmer", "releases"))).toEqual([
      "attempts",
      "channels",
      "heads",
      "state.json",
      "transactions",
    ]);
  });

  it("reads an empty snapshot on a board that has never released", async () => {
    expect(await readReleaseSnapshot(paths())).toEqual({ channels: [], heads: [], attempts: [], pending: [], unreadable: false });
  });

  it("reports a malformed record as unreadable rather than absent", async () => {
    await acquire({ integrationSha: SHA_A });
    await fs.writeFile(path.join(root, ".kanmer", "releases", "attempts", "main@1.json"), "{ not json", "utf8");
    const snapshot = await readReleaseSnapshot(paths());
    expect(snapshot.unreadable).toBe(true);
    expect(classifyReleaseEvidence(snapshot, "anything").state).toBe("unavailable");
  });

  it("fails closed when the durable head proves retained ordinal history is missing", async () => {
    const first = await acquire({ integrationSha: SHA_A, includedTickets: ["CORE-X"] });
    await store.completeReleaseAttempt({
      leaseId: first.lease!.lease_id,
      leaseRevision: first.lease!.lease_revision,
    });
    const second = await acquire({ integrationSha: SHA_B, includedTickets: ["CORE-Y"] });
    expect(second.attempt.attempt_id).toBe("main@2");
    await fs.unlink(path.join(root, ".kanmer", "releases", "attempts", "main@1.json"));

    const snapshot = await readReleaseSnapshot(paths());
    expect(snapshot.attempts.map((entry) => entry.attempt_id)).toEqual(["main@2"]);
    expect(snapshot.heads[0]?.next_ordinal).toBe(3);
    expect(snapshot.unreadable).toBe(true);
    expect(classifyReleaseEvidence(snapshot, "CORE-X").state).toBe("unavailable");
  });

  it("rejects a persisted candidate ref that Git cannot create", async () => {
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    await fs.mkdir(attemptsDir, { recursive: true });
    await fs.writeFile(
      path.join(attemptsDir, "main@1.json"),
      `${JSON.stringify(attempt({ candidate_ref: "release/main-1." }), null, 2)}\n`,
      "utf8",
    );

    const snapshot = await readReleaseSnapshot(paths());
    expect(snapshot.unreadable).toBe(true);
    expect(snapshot.attempts).toEqual([]);
  });

  it("fails closed when a superseded attempt names an absent successor", async () => {
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const predecessor = attempt({
      outcome: "superseded",
      terminal_at: "2026-01-02T00:00:00.000Z",
      successor: "main@2",
    });
    await fs.mkdir(attemptsDir, { recursive: true });
    await fs.writeFile(path.join(attemptsDir, "main@1.json"), `${JSON.stringify(predecessor, null, 2)}\n`, "utf8");

    const snapshot = await readReleaseSnapshot(paths());
    expect(snapshot.unreadable).toBe(true);
    expect(classifyReleaseEvidence(snapshot, "T-1").state).toBe("unavailable");
  });

  it("fails closed when a successor names an absent predecessor", async () => {
    const attemptsDir = path.join(root, ".kanmer", "releases", "attempts");
    const channelsDir = path.join(root, ".kanmer", "releases", "channels");
    const successor = attempt({
      attempt_id: "main@2",
      ordinal: 2,
      candidate_id: candidateIdentity("main", SHA_A, 2),
      supersedes: "main@1",
    });
    await Promise.all([attemptsDir, channelsDir].map((dir) => fs.mkdir(dir, { recursive: true })));
    await fs.writeFile(path.join(attemptsDir, "main@2.json"), `${JSON.stringify(successor, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(channelsDir, "main.json"), `${JSON.stringify(channelRecord("main@2"), null, 2)}\n`, "utf8");

    const snapshot = await readReleaseSnapshot(paths());
    expect(snapshot.unreadable).toBe(true);
    expect(classifyReleaseEvidence(snapshot, "T-1").state).toBe("unavailable");
  });

  it("fails closed when a channel snapshot names an absent immutable attempt", async () => {
    const channelsDir = path.join(root, ".kanmer", "releases", "channels");
    await fs.mkdir(channelsDir, { recursive: true });
    await fs.writeFile(
      path.join(channelsDir, "main.json"),
      `${JSON.stringify(channelRecord("main@1"), null, 2)}\n`,
      "utf8",
    );

    const snapshot = await readReleaseSnapshot(paths());
    expect(snapshot.unreadable).toBe(true);
    expect(snapshot.pending).toEqual([]);
    expect(classifyReleaseEvidence(snapshot, "anything").state).toBe("unavailable");
  });
});

describe("release evidence is non-gating (ADR-0005, FRD-031 edge case)", () => {
  it("retries a lock-free release snapshot and refuses drift without scanning history under the write lock", async () => {
    const ticket = await store.createItem({ ...free, title: "Atomic reconciliation", status: "verifying" });
    const taken = await acquire({ integrationSha: SHA_A, includedTickets: [ticket.id] });
    const revision = (await store.getRevision(ticket.id))!.revision;
    const originalSnapshot = store.releaseSnapshot.bind(store);
    let entered!: () => void;
    let resume!: () => void;
    const enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
    const resumePromise = new Promise<void>((resolve) => { resume = resolve; });
    let park = true;
    store.releaseSnapshot = async () => {
      const snapshot = await originalSnapshot();
      if (park) {
        park = false;
        entered();
        await resumePromise;
      }
      return snapshot;
    };

    const applying = store.applyReconciliation(ticket.id, {
      action: "MOVE_TO_DONE",
      targetStatus: "done",
      expectedRevision: revision,
    });
    await enteredPromise;
    const other = new KanmerStore(root, { actor: "test-actor" });
    const recording = other.recordReleaseProgress({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      serviceUnavailable: "publisher unavailable after reconciliation classified",
    });
    expect((await recording).attempt.retry?.attempts).toBe(1);
    resume();
    await expect(applying).rejects.toThrow(/^RECONCILIATION_DRIFT:/);
    expect((await store.getItem(ticket.id))!.status).toBe("verifying");
  });

  it("self-recovers a pending pre-journal epoch before applying reconciliation", async () => {
    const ticket = await store.createItem({ ...free, title: "Pending epoch", status: "verifying" });
    const revision = (await store.getRevision(ticket.id))!.revision;
    const releases = path.join(root, ".kanmer", "releases");
    await fs.mkdir(releases, { recursive: true });
    await fs.writeFile(path.join(releases, "state.json"), `${JSON.stringify({
      schema: 1,
      revision: 1,
      phase: "pending",
      transaction_id: "crash-before-journal",
      channel: "main",
    }, null, 2)}\n`, "utf8");
    expect((await store.releaseSnapshot()).unreadable).toBe(true);

    const applied = await store.applyReconciliation(ticket.id, {
      action: "MOVE_TO_DONE",
      targetStatus: "done",
      expectedRevision: revision,
    });
    expect(applied.item.status).toBe("done");
    expect(JSON.parse(await fs.readFile(path.join(releases, "state.json"), "utf8"))).toMatchObject({
      revision: 1,
      phase: "stable",
    });
  });

  it("self-recovers a fully applied journal retained after the stable epoch", async () => {
    const ticket = await store.createItem({ ...free, title: "Retained journal", status: "verifying" });
    const revision = (await store.getRevision(ticket.id))!.revision;
    const record = attempt({ included_tickets: ["OTHER-001"] });
    const lease = channelRecord(record.attempt_id);
    const head = headRecord(record.attempt_id);
    const journal = {
      schema: 1,
      transaction_id: "crash-after-stable",
      channel: "main",
      created_at: record.created_at,
      attempts: [{ before: null, after: record }],
      head_record: { before: null, after: head },
      channel_record: { before: null, after: lease },
    };
    const releases = path.join(root, ".kanmer", "releases");
    await Promise.all(["attempts", "channels", "heads", "transactions"].map((dir) =>
      fs.mkdir(path.join(releases, dir), { recursive: true })));
    await fs.writeFile(path.join(releases, "attempts", "main@1.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(releases, "channels", "main.json"), `${JSON.stringify(lease, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(releases, "heads", "main.json"), `${JSON.stringify(head, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(releases, "transactions", "main.json"), `${JSON.stringify(journal, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(releases, "state.json"), `${JSON.stringify({
      schema: 1,
      revision: 1,
      phase: "stable",
      transaction_id: journal.transaction_id,
      channel: "main",
    }, null, 2)}\n`, "utf8");

    const applied = await store.applyReconciliation(ticket.id, {
      action: "MOVE_TO_DONE",
      targetStatus: "done",
      expectedRevision: revision,
    });
    expect(applied.item.status).toBe("done");
    expect((await store.releaseSnapshot()).pending).toEqual([]);
    await expect(fs.stat(path.join(releases, "transactions", "main.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("a released, verified release attempt never lets its ticket skip proof", async () => {
    const item = await store.createItem({ type: "ticket", title: "Unproven", profile: "feature", docs_todo: true });
    await store.setDoc(item.id, "research", "R");
    await store.setDoc(item.id, "files", "F");
    await store.setDoc(item.id, "plan", "P");
    await store.setDoc(item.id, "checklist", "- [x] done");
    await store.moveItem(item.id, { status: "preparing" });
    await store.moveItem(item.id, { status: "implementing" });
    await store.setDoc(item.id, "post-implementation-report", "PIR");
    await store.moveItem(item.id, { status: "review" });
    await store.moveItem(item.id, { status: "verifying" });

    // The strongest release evidence there is: a completed release that names
    // this ticket and recorded a passing verification state.
    const taken = await acquire({ integrationSha: SHA_A, includedTickets: [item.id] });
    const recorded = await store.recordReleaseProgress({
      leaseId: taken.lease!.lease_id,
      leaseRevision: taken.lease!.lease_revision,
      verificationState: "passed",
    });
    await store.completeReleaseAttempt({
      leaseId: recorded.lease!.lease_id,
      leaseRevision: recorded.lease!.lease_revision,
      releaseTag: "v9.9.9",
    });

    // Done is still refused, naming `proof`. Release evidence is not
    // acceptance evidence (ADR-0005), and nothing in the gate engine reads it.
    await expect(store.moveItem(item.id, { status: "done" })).rejects.toThrow(/proof/u);

    await store.setDoc(item.id, "proof", "PASS");
    expect((await store.moveItem(item.id, { status: "done" })).status).toBe("done");
  });
});

describe("release verbs serialise under the board write lock", () => {
  it("serialises a delivery-policy write before candidate policy CAS and commit", async () => {
    const oldVersion = deliveryPolicyVersion(resolveDelivery(await store.getBoard()));
    let enterUpdate!: () => void;
    let finishUpdate!: () => void;
    const updateEntered = new Promise<void>((resolve) => { enterUpdate = resolve; });
    const updateMayFinish = new Promise<void>((resolve) => { finishUpdate = resolve; });
    const update = store.updateBoard(async (board) => {
      enterUpdate();
      await updateMayFinish;
      return { ...board, delivery: DEV_TO_MAIN };
    });

    await updateEntered;
    let mint!: ReturnType<KanmerStore["acquireReleaseChannel"]>;
    try {
      expect((await fs.stat(path.join(root, ".kanmer", "leases.lock"))).isFile()).toBe(true);
      mint = store.acquireReleaseChannel({ integrationSha: SHA_A, expectedPolicyVersion: oldVersion });
    } finally {
      finishUpdate();
    }

    await update;
    await expect(mint).rejects.toThrow(/^RELEASE_POLICY_DRIFT:/);
    expect((await store.releaseSnapshot()).attempts).toEqual([]);
  });

  it("a second store cannot interleave an acquire with the first one", async () => {
    const other = new KanmerStore(root, { actor: "other-actor" });
    const [first, second] = await Promise.allSettled([
      acquire({ integrationSha: SHA_A }),
      acquire({ integrationSha: SHA_B }, other),
    ]);
    const outcomes = [first.status, second.status].sort();
    expect(outcomes).toEqual(["fulfilled", "rejected"]);
    const rejected = (first.status === "rejected" ? first : second) as PromiseRejectedResult;
    expect(String(rejected.reason)).toMatch(/RELEASE_CHANNEL_HELD:/);
    // Exactly one attempt was minted, so no ordinal was handed out twice.
    expect((await store.releaseSnapshot()).attempts).toHaveLength(1);
  });

  it("two concurrent renews cannot both win the same revision", async () => {
    const taken = await acquire({ integrationSha: SHA_A });
    const other = new KanmerStore(root, { actor: "test-actor" });
    const cas = { leaseId: taken.lease!.lease_id, leaseRevision: taken.lease!.lease_revision };
    const results = await Promise.allSettled([store.renewReleaseChannel(cas), other.renewReleaseChannel(cas)]);
    expect(results.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    expect(String((results.find((entry) => entry.status === "rejected") as PromiseRejectedResult).reason)).toMatch(/^Error: Conflict:/);
    expect((await store.releaseSnapshot()).channels[0]?.lease_revision).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { reconcileEvidence } from "./reconciliation.js";
import type { ReconciliationEvidence, ReconciliationFailureClass } from "./types.js";

// Salvaged from PR #286 (CORE-113); the KanmerStore.applyReconciliation
// suite was dropped with the mutating surface (CORE-122) and returned, rebuilt
// on revisions and leases, with CORE-131's typed verification routes and
// expired-claim recovery.

const at = "2026-08-26T00:00:00.000Z";
const sha = (c: string) => c.repeat(40);

function ticket(status: string, taken = false): ReconciliationEvidence["ticket"] {
  return { id: "TICK-001", status, updated: at, taken };
}

function evidence(overrides: Partial<ReconciliationEvidence> = {}): ReconciliationEvidence {
  return {
    ticket: { ...ticket("review"), ...overrides.ticket },
    claim: { state: "unclaimed", controller: null, worker: null, takenAt: null, expiresAt: null, branch: null, worktree: null, reviewRound: 0, remediationBudget: 1, ...overrides.claim },
    commits: { values: [...(overrides.commits?.values ?? [])], reachability: overrides.commits?.reachability ?? "not-applicable" },
    pullRequest: { state: "open", requiredChecks: "pass", ...overrides.pullRequest },
    proof: { state: "absent", ...overrides.proof },
    workspace: { state: "not-recorded", recordedWorktree: null, claimIdentity: "not-applicable", ...overrides.workspace },
    release: { state: "not-applicable", ...overrides.release },
  };
}

const merged = { state: "merged" as const, mergeSha: sha("a"), requiredChecks: "pass" as const };
const expiredClaim: ReconciliationEvidence["claim"] = {
  state: "expired", controller: "ctl-a", worker: "ctl-a", takenAt: at, expiresAt: at,
  branch: "b", worktree: "wt", reviewRound: 0, remediationBudget: 1,
};
const codes = (result: ReturnType<typeof reconcileEvidence>) => result.findings.map((entry) => entry.code);

describe("reconcileEvidence", () => {
  it.each([
    ["moves merged review to verifying", evidence({ pullRequest: merged }), "MOVE_TO_VERIFYING"],
    ["returns closed unmerged review to implementing", evidence({ pullRequest: { state: "closed-unmerged", requiredChecks: "pass" } }), "MOVE_TO_IMPLEMENTING"],
    ["returns review without PR or worker to implementing", evidence({ pullRequest: { state: "absent", requiredChecks: "not-applicable" } }), "MOVE_TO_IMPLEMENTING"],
    ["moves merged PASS verification to done", evidence({ ticket: ticket("verifying"), pullRequest: { ...merged, mergeSha: sha("b") }, proof: { state: "pass", mergedSha: sha("b") } }), "MOVE_TO_DONE"],
    ["releases only an identity-matched clean terminal claim", evidence({ ticket: ticket("done", true), workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "matches-claim" } }), "RELEASE_CLEAN_TERMINAL_CLAIM"],
  ])("%s", (_name, input, action) => {
    const before = JSON.stringify(input);
    const result = reconcileEvidence(input);
    expect(result.recommendation?.action).toBe(action);
    expect(result.recommendation?.advisory).toBe(true);
    // The binding names the ticket; only a store can supply the revision, so
    // the pure classifier leaves it null for the collector to stamp.
    expect(result.recommendation?.ticketId).toBe(input.ticket.id);
    expect(result.recommendation?.revision).toBeNull();
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    ["protects dirty work outside Review", evidence({ ticket: ticket("implementing", true), workspace: { state: "dirty", recordedWorktree: "wt", claimIdentity: "matches-claim" } }), "DIRTY_WORKSPACE_PRESERVED"],
    ["reports a missing taken workspace", evidence({ ticket: ticket("implementing", true), workspace: { state: "missing", recordedWorktree: "wt", claimIdentity: "unavailable" } }), "WORKSPACE_MISSING"],
    ["protects the board worktree", evidence({ workspace: { state: "clean", recordedWorktree: "wt", boardWorktree: true, claimIdentity: "unavailable" } }), "BOARD_WORKTREE_PROTECTED"],
    ["preserves contended release evidence", evidence({ release: { state: "contended" } }), "RELEASE_EVIDENCE_PRESERVED"],
    ["does not invent unavailable GitHub evidence", evidence({ pullRequest: { state: "unavailable", requiredChecks: "unavailable" } }), "EVIDENCE_INCONCLUSIVE"],
    ["does not advance a verifying ticket with failing checks", evidence({ ticket: ticket("verifying"), pullRequest: { ...merged, requiredChecks: "fail" }, proof: { state: "pass", mergedSha: sha("a") } }), "REQUIRED_CHECKS_NOT_GREEN"],
    ["does not advance an unreachable recorded commit", evidence({ pullRequest: merged, commits: { values: [sha("c")], reachability: "unreachable" } }), "RECORDED_COMMIT_UNREACHABLE"],
    ["does not advance unavailable commit reachability", evidence({ pullRequest: merged, commits: { values: [sha("c")], reachability: "unavailable" } }), "EVIDENCE_INCONCLUSIVE"],
    ["refuses a verifying ticket with no PR evidence and no merge SHA", evidence({ ticket: ticket("verifying"), pullRequest: { state: "absent", requiredChecks: "not-applicable" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["refuses a verifying ticket with an open pending PR and no merge SHA", evidence({ ticket: ticket("verifying"), pullRequest: { state: "open", requiredChecks: "pending" } }), "REQUIRED_CHECKS_NOT_GREEN"],
    ["refuses a verifying ticket with a closed-unmerged PR and no merge SHA", evidence({ ticket: ticket("verifying"), pullRequest: { state: "closed-unmerged", requiredChecks: "not-applicable" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["refuses a verifying ticket with a merged PR and no merge SHA", evidence({ ticket: ticket("verifying"), pullRequest: { state: "merged", requiredChecks: "pass" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["treats a failed verification naming no class as inconclusive", evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail" } }), "VERIFICATION_INCONCLUSIVE"],
    ["treats an unrecognised failure class as inconclusive", evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail", failureClass: "flaky" as unknown as ReconciliationFailureClass } }), "VERIFICATION_INCONCLUSIVE"],
    ["keeps a transient verification failure in Verifying", evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail", failureClass: "transient" } }), "VERIFICATION_TRANSIENT_RETRY"],
    ["keeps an inconclusive verification failure in Verifying", evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail", failureClass: "inconclusive" } }), "VERIFICATION_INCONCLUSIVE"],
    ["rejects a stale PASS proof for a different merge", evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "pass", mergedSha: sha("b") } }), "PROOF_MERGE_SHA_MISMATCH"],
    ["preserves an incomplete legacy claim", evidence({ ticket: ticket("implementing", true), claim: { state: "current", controller: null, worker: "worker", takenAt: at, expiresAt: null, branch: "core-113", worktree: null, reviewRound: 0, remediationBudget: 1 } }), "CLAIM_WITHOUT_RECORDED_WORKSPACE"],
    ["preserves a clean terminal claim without matching identity", evidence({ ticket: ticket("done", true), workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "branch-mismatch" } }), "TERMINAL_CLAIM_IDENTITY_UNVERIFIED"],
    ["does not recover an expired claim whose worktree belongs to another repository", evidence({ ticket: ticket("implementing", true), claim: expiredClaim, workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "foreign-repository" } }), "CLAIM_EXPIRED"],
    ["does not recover an expired claim checked out on another branch", evidence({ ticket: ticket("implementing", true), claim: expiredClaim, workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "branch-mismatch" } }), "CLAIM_EXPIRED"],
    ["does not recover an expired claim on a detached workspace", evidence({ ticket: ticket("implementing", true), claim: expiredClaim, workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "detached" } }), "CLAIM_EXPIRED"],
    ["does not recover an expired claim whose workspace identity is unproven", evidence({ ticket: ticket("implementing", true), claim: expiredClaim, workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "unavailable" } }), "CLAIM_EXPIRED"],
    ["describes nothing to do for a healthy open review", evidence(), "NO_RECONCILIATION_NEEDED"],
  ])("%s", (_name, input, code) => {
    const result = reconcileEvidence(input);
    expect(result.recommendation).toBeNull();
    expect(result.findings[0]?.code).toBe(code);
  });

  it("recommends returning a closed-unmerged Review ticket to Implementing even with red required checks", () => {
    const result = reconcileEvidence(evidence({ pullRequest: { state: "closed-unmerged", requiredChecks: "fail" } }));
    expect(result.recommendation).toEqual({ action: "MOVE_TO_IMPLEMENTING", targetStatus: "implementing", advisory: true, ticketId: "TICK-001", revision: null });
    expect(codes(result)).toEqual(["REQUIRED_CHECKS_NOT_GREEN", "CLOSED_UNMERGED_REVIEW"]);
  });

  it("moves a merged Review ticket despite a dirty workspace but preserves the warning", () => {
    const result = reconcileEvidence(evidence({ pullRequest: merged, workspace: { state: "dirty", recordedWorktree: "wt", claimIdentity: "matches-claim" } }));
    expect(result.recommendation?.action).toBe("MOVE_TO_VERIFYING");
    expect(codes(result)).toEqual(["DIRTY_WORKSPACE_PRESERVED", "MERGED_REVIEW"]);
  });

  it("moves a merged Review ticket whose taken workspace is missing but preserves the warning", () => {
    const result = reconcileEvidence(evidence({ ticket: ticket("review", true), pullRequest: merged, workspace: { state: "missing", recordedWorktree: "wt", claimIdentity: "unavailable" } }));
    expect(result.recommendation?.action).toBe("MOVE_TO_VERIFYING");
    expect(codes(result)).toEqual(["WORKSPACE_MISSING", "MERGED_REVIEW"]);
  });

  it("keeps the merged Review route behind commit reachability", () => {
    const result = reconcileEvidence(evidence({ pullRequest: { ...merged, requiredChecks: "fail" }, commits: { values: [sha("c")], reachability: "unreachable" } }));
    expect(result.recommendation).toBeNull();
    expect(codes(result)).toEqual(["REQUIRED_CHECKS_NOT_GREEN", "RECORDED_COMMIT_UNREACHABLE"]);
  });

  it("records an expired claim alongside a merged Review recommendation", () => {
    const result = reconcileEvidence(evidence({
      ticket: ticket("review", true),
      claim: { state: "expired", controller: "ctl", worker: "ctl", takenAt: at, expiresAt: at, branch: "b", worktree: "wt", reviewRound: 1, remediationBudget: 1 },
      pullRequest: merged,
      workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "matches-claim" },
    }));
    expect(result.recommendation?.action).toBe("MOVE_TO_VERIFYING");
    expect(codes(result)).toEqual(["CLAIM_EXPIRED", "MERGED_REVIEW"]);
  });

  it.each([
    ["implementation" as const, "VERIFICATION_FAILED_IMPLEMENTATION", "implementing"],
    ["plan" as const, "VERIFICATION_FAILED_PLAN", "preparing"],
  ])("routes a %s verification failure by the proof's failure_class", (failureClass, code, targetStatus) => {
    const result = reconcileEvidence(evidence({
      ticket: ticket("verifying"),
      pullRequest: merged,
      proof: { state: "fail", mergedSha: sha("a"), failureClass },
    }));
    expect(result.recommendation).toEqual({
      action: "ROUTE_VERIFICATION_FAILURE", targetStatus, advisory: true, ticketId: "TICK-001", revision: null,
    });
    expect(codes(result)).toEqual([code]);
  });

  it("recovers an expired claim over a DIRTY workspace and never recommends cleanup", () => {
    const result = reconcileEvidence(evidence({
      ticket: ticket("implementing", true),
      claim: expiredClaim,
      workspace: { state: "dirty", recordedWorktree: "wt", claimIdentity: "matches-claim" },
    }));
    expect(result.recommendation).toEqual({
      action: "RECOVER_EXPIRED_CLAIM", advisory: true, ticketId: "TICK-001", revision: null,
    });
    // The dirty-work warning is preserved alongside the recovery, and nothing
    // in the result proposes deleting or cleaning anything.
    expect(codes(result)).toEqual(["DIRTY_WORKSPACE_PRESERVED", "CLAIM_EXPIRED"]);
    expect(result.recommendation?.targetStatus).toBeUndefined();
  });

  it("recovers an expired claim over a clean, identity-matched workspace", () => {
    const result = reconcileEvidence(evidence({
      ticket: ticket("implementing", true),
      claim: expiredClaim,
      workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "matches-claim" },
    }));
    expect(result.recommendation?.action).toBe("RECOVER_EXPIRED_CLAIM");
    expect(codes(result)).toEqual(["CLAIM_EXPIRED"]);
  });

  it("prefers advancing a merged Review over reducing it to a claim transfer", () => {
    const result = reconcileEvidence(evidence({
      ticket: ticket("review", true),
      claim: expiredClaim,
      pullRequest: merged,
      workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "matches-claim" },
    }));
    expect(result.recommendation?.action).toBe("MOVE_TO_VERIFYING");
  });

  it("never recovers an expired claim on a terminal ticket; the clean-terminal release owns that", () => {
    const result = reconcileEvidence(evidence({
      ticket: ticket("done", true),
      claim: expiredClaim,
      workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "matches-claim" },
    }));
    expect(result.recommendation?.action).toBe("RELEASE_CLEAN_TERMINAL_CLAIM");
  });

  it("keeps the documented refusal ordering ahead of every new route", () => {
    // Board worktree first, before an otherwise-recoverable expired claim.
    const board = reconcileEvidence(evidence({
      ticket: ticket("implementing", true),
      claim: expiredClaim,
      workspace: { state: "clean", recordedWorktree: "wt", boardWorktree: true, claimIdentity: "matches-claim" },
    }));
    expect(board.recommendation).toBeNull();
    expect(codes(board)).toEqual(["BOARD_WORKTREE_PROTECTED"]);

    // Preserved release evidence next, then inconclusive evidence — both ahead
    // of the expired-claim route and of the typed verification routes.
    const release = reconcileEvidence(evidence({
      ticket: ticket("verifying", true), claim: expiredClaim, release: { state: "superseded" },
      pullRequest: merged, proof: { state: "fail", mergedSha: sha("a"), failureClass: "implementation" },
    }));
    expect(release.recommendation).toBeNull();
    expect(codes(release)).toEqual(["RELEASE_EVIDENCE_PRESERVED"]);

    const inconclusive = reconcileEvidence(evidence({
      ticket: ticket("verifying", true), claim: expiredClaim,
      workspace: { state: "unavailable", recordedWorktree: "wt", claimIdentity: "unavailable" },
      proof: { state: "fail", mergedSha: sha("a"), failureClass: "plan" },
    }));
    expect(inconclusive.recommendation).toBeNull();
    expect(codes(inconclusive)).toEqual(["EVIDENCE_INCONCLUSIVE"]);
  });

  it("covers every finding code the classifier can emit", () => {
    const seen = new Set<string>();
    const inputs = [
      evidence({ workspace: { state: "clean", recordedWorktree: "wt", boardWorktree: true, claimIdentity: "unavailable" } }),
      evidence({ release: { state: "superseded" } }),
      evidence({ pullRequest: { state: "unavailable", requiredChecks: "unavailable" } }),
      evidence({ ticket: ticket("review", true), claim: { state: "expired", controller: null, worker: null, takenAt: at, expiresAt: at, branch: "b", worktree: null, reviewRound: 0, remediationBudget: 1 }, pullRequest: { state: "closed-unmerged", requiredChecks: "pending" }, workspace: { state: "dirty", recordedWorktree: "wt", claimIdentity: "matches-claim" } }),
      evidence({ ticket: ticket("review", true), pullRequest: merged, workspace: { state: "missing", recordedWorktree: "wt", claimIdentity: "unavailable" } }),
      evidence({ ticket: ticket("implementing", true), claim: { state: "current", controller: null, worker: null, takenAt: at, expiresAt: null, branch: "b", worktree: null, reviewRound: 0, remediationBudget: 1 } }),
      evidence({ pullRequest: { state: "absent", requiredChecks: "not-applicable" } }),
      evidence({ pullRequest: merged, commits: { values: [sha("c")], reachability: "unreachable" } }),
      evidence({ ticket: ticket("verifying"), pullRequest: { state: "absent", requiredChecks: "not-applicable" } }),
      evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "pass", mergedSha: sha("b") } }),
      evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "pass", mergedSha: sha("a") } }),
      evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail" } }),
      evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail", failureClass: "implementation" } }),
      evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail", failureClass: "plan" } }),
      evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail", failureClass: "transient" } }),
      evidence({ ticket: ticket("done", true), workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "matches-claim" } }),
      evidence({ ticket: ticket("done", true), workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "detached" } }),
      evidence(),
    ];
    for (const input of inputs) for (const code of codes(reconcileEvidence(input))) seen.add(code);
    expect([...seen].sort()).toEqual([
      "BOARD_WORKTREE_PROTECTED",
      "CLAIM_EXPIRED",
      "CLAIM_WITHOUT_RECORDED_WORKSPACE",
      "CLEAN_TERMINAL_CLAIM",
      "CLOSED_UNMERGED_REVIEW",
      "DIRTY_WORKSPACE_PRESERVED",
      "EVIDENCE_INCONCLUSIVE",
      "MERGED_REVIEW",
      "NO_RECONCILIATION_NEEDED",
      "PASS_PROOF_STILL_VERIFYING",
      "PROOF_MERGE_SHA_MISMATCH",
      "RECORDED_COMMIT_UNREACHABLE",
      "RELEASE_EVIDENCE_PRESERVED",
      "REQUIRED_CHECKS_NOT_GREEN",
      "REVIEW_WITHOUT_PR_OR_WORKER",
      "TERMINAL_CLAIM_IDENTITY_UNVERIFIED",
      "VERIFICATION_FAILED_IMPLEMENTATION",
      "VERIFICATION_FAILED_PLAN",
      "VERIFICATION_INCONCLUSIVE",
      "VERIFICATION_TRANSIENT_RETRY",
      "VERIFYING_WITHOUT_MERGE_SHA",
      "WORKSPACE_MISSING",
    ]);
  });

  it("binds a recommendation by revision, never by a separate proposal id", () => {
    const result = reconcileEvidence(evidence({ pullRequest: merged }));
    expect(Object.keys(result).sort()).toEqual(["evidence", "findings", "recommendation"]);
    // PR #286's 64-char proposal hash is deliberately not reintroduced: the
    // document-inclusive revision is the one freshness token.
    expect(Object.keys(result.recommendation ?? {}).sort())
      .toEqual(["action", "advisory", "revision", "targetStatus", "ticketId"]);
  });
});

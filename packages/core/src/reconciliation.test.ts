import { describe, expect, it } from "vitest";
import { reconcileEvidence } from "./reconciliation.js";
import type { ReconciliationEvidence } from "./types.js";

// Salvaged from PR #286 (CORE-113); the KanmerStore.applyReconciliation
// suite was dropped with the mutating surface (CORE-122).

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
    ["retains failed verification for disposition", evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "fail" } }), "FAILED_VERIFICATION_REQUIRES_DISPOSITION"],
    ["rejects a stale PASS proof for a different merge", evidence({ ticket: ticket("verifying"), pullRequest: merged, proof: { state: "pass", mergedSha: sha("b") } }), "PROOF_MERGE_SHA_MISMATCH"],
    ["preserves an incomplete legacy claim", evidence({ ticket: ticket("implementing", true), claim: { state: "current", controller: null, worker: "worker", takenAt: at, expiresAt: null, branch: "core-113", worktree: null, reviewRound: 0, remediationBudget: 1 } }), "CLAIM_WITHOUT_RECORDED_WORKSPACE"],
    ["preserves a clean terminal claim without matching identity", evidence({ ticket: ticket("done", true), workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "branch-mismatch" } }), "TERMINAL_CLAIM_IDENTITY_UNVERIFIED"],
    ["reports an expired claim without releasing it", evidence({ ticket: ticket("implementing", true), claim: { state: "expired", controller: "ctl", worker: "ctl", takenAt: at, expiresAt: at, branch: "b", worktree: "wt", reviewRound: 0, remediationBudget: 1 }, workspace: { state: "clean", recordedWorktree: "wt", claimIdentity: "matches-claim" } }), "CLAIM_EXPIRED"],
    ["describes nothing to do for a healthy open review", evidence(), "NO_RECONCILIATION_NEEDED"],
  ])("%s", (_name, input, code) => {
    const result = reconcileEvidence(input);
    expect(result.recommendation).toBeNull();
    expect(result.findings[0]?.code).toBe(code);
  });

  it("recommends returning a closed-unmerged Review ticket to Implementing even with red required checks", () => {
    const result = reconcileEvidence(evidence({ pullRequest: { state: "closed-unmerged", requiredChecks: "fail" } }));
    expect(result.recommendation).toEqual({ action: "MOVE_TO_IMPLEMENTING", targetStatus: "implementing", advisory: true });
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
      "FAILED_VERIFICATION_REQUIRES_DISPOSITION",
      "MERGED_REVIEW",
      "NO_RECONCILIATION_NEEDED",
      "PASS_PROOF_STILL_VERIFYING",
      "PROOF_MERGE_SHA_MISMATCH",
      "RECORDED_COMMIT_UNREACHABLE",
      "RELEASE_EVIDENCE_PRESERVED",
      "REQUIRED_CHECKS_NOT_GREEN",
      "REVIEW_WITHOUT_PR_OR_WORKER",
      "TERMINAL_CLAIM_IDENTITY_UNVERIFIED",
      "VERIFYING_WITHOUT_MERGE_SHA",
      "WORKSPACE_MISSING",
    ]);
  });

  it("never exposes a proposal id or an applyable surface", () => {
    const result = reconcileEvidence(evidence({ pullRequest: merged }));
    expect(Object.keys(result).sort()).toEqual(["evidence", "findings", "recommendation"]);
    expect(Object.keys(result.recommendation ?? {}).sort()).toEqual(["action", "advisory", "targetStatus"]);
  });
});

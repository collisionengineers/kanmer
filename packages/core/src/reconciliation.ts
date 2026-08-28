import { hasLegacyTicketClaim } from "./types.js";
import type {
  ReconciliationAction,
  ReconciliationEvidence,
  ReconciliationFinding,
  ReconciliationRecommendation,
  ReconciliationResult,
} from "./types.js";

// Salvaged from PR #286 (CORE-113) and reduced to the read-only inspector
// (CORE-122). The classifier is advisory: it never proposes an applyable
// proposal id, and nothing in core consumes its recommendation as authority.
// CORE-131 added the typed verification routes and expired-claim recovery, and
// binds each recommendation to the ticket it was computed for. The binding's
// `revision` is stamped by the host collector, never read here: this function
// stays pure and store-free.

function finding(code: string, level: ReconciliationFinding["level"], message: string): ReconciliationFinding {
  return { code, level, message };
}

function stableEvidence(evidence: ReconciliationEvidence): ReconciliationEvidence {
  return {
    ticket: { ...evidence.ticket },
    claim: { ...evidence.claim },
    commits: { values: [...evidence.commits.values], reachability: evidence.commits.reachability },
    pullRequest: { ...evidence.pullRequest },
    proof: { ...evidence.proof },
    workspace: { ...evidence.workspace },
    release: { ...evidence.release },
  };
}

function recommend(
  evidence: ReconciliationEvidence,
  action: ReconciliationAction,
  targetStatus?: string,
): ReconciliationRecommendation {
  return {
    action,
    ...(targetStatus ? { targetStatus } : {}),
    advisory: true,
    ticketId: evidence.ticket.id,
    // Null here by construction: only a store can compute a document-inclusive
    // revision, and core never touches one. `reconcileTicket` stamps it.
    revision: null,
  };
}

/**
 * Evaluate bounded host-collected facts. This function is deliberately pure:
 * core never executes Git/GitHub commands and never mutates a board here.
 *
 * Ordering: hard refusals first (board worktree, preserved release evidence,
 * inconclusive evidence); then every advisory warning is recorded WITHOUT
 * returning, so a merged or closed-unmerged Review ticket can still receive
 * its recovery recommendation alongside the warning (GH-3867261023 and the
 * missing-worktree merged-recovery thread from PR #286); then expired-claim
 * recovery, which is deliberately reachable over a dirty workspace; then the
 * stage routes, where the same warnings become hard stops for non-Review
 * stages.
 */
export function reconcileEvidence(input: ReconciliationEvidence): ReconciliationResult {
  const evidence = stableEvidence(input);
  const findings: ReconciliationFinding[] = [];
  const hasClaim = evidence.ticket.taken || hasLegacyTicketClaim({
    taken_at: evidence.claim.takenAt ?? undefined,
    branch: evidence.claim.branch ?? undefined,
    worktree: evidence.claim.worktree ?? undefined,
  });
  const none = (): ReconciliationResult => ({ evidence, findings, recommendation: null });

  if (evidence.workspace.boardWorktree) {
    findings.push(finding("BOARD_WORKTREE_PROTECTED", "error", "the recorded workspace is the Kanmer board worktree; reconciliation refuses every recommendation"));
    return none();
  }
  if (evidence.release.state === "contended" || evidence.release.state === "superseded") {
    findings.push(finding("RELEASE_EVIDENCE_PRESERVED", "warning", "release ownership is contended or superseded; reconciliation preserves immutable evidence and recommends no action"));
    return none();
  }
  if (
    evidence.pullRequest.state === "unavailable" ||
    evidence.pullRequest.requiredChecks === "unavailable" ||
    evidence.commits.reachability === "unavailable" ||
    evidence.workspace.state === "unavailable" ||
    evidence.release.state === "unavailable"
  ) {
    findings.push(finding("EVIDENCE_INCONCLUSIVE", "warning", "required Git, GitHub, CI, workspace or release evidence is unavailable; reconciliation does not invent a recovery recommendation"));
    return none();
  }

  // Advisory warnings: recorded for every stage, decisive only below.
  const dirtyWorkspace = evidence.workspace.state === "dirty";
  const missingWorkspace = evidence.workspace.state === "missing" && hasClaim;
  const unrecordedWorkspace = evidence.workspace.state === "not-recorded" && hasClaim;
  const checksNotGreen = evidence.pullRequest.requiredChecks === "fail" || evidence.pullRequest.requiredChecks === "pending";
  if (dirtyWorkspace) {
    findings.push(finding("DIRTY_WORKSPACE_PRESERVED", "warning", "the recorded workspace is dirty; reconciliation preserves it and never recommends cleanup"));
  }
  if (missingWorkspace) {
    findings.push(finding("WORKSPACE_MISSING", "warning", "the taken ticket's workspace is missing; reconciliation records no-surviving-workspace evidence and recommends no destructive action"));
  }
  if (unrecordedWorkspace) {
    findings.push(finding("CLAIM_WITHOUT_RECORDED_WORKSPACE", "warning", "the ticket claim has no recorded workspace; reconciliation preserves the claim and recommends no cleanup"));
  }
  if (evidence.claim.state === "expired") {
    findings.push(finding("CLAIM_EXPIRED", "warning", "the ticket claim has expired; transfer is an operator/controller decision (take_ticket action transfer, or an explicit apply_reconciliation of RECOVER_EXPIRED_CLAIM) and reconciliation never releases it or its workspace"));
  }
  if (checksNotGreen) {
    findings.push(finding("REQUIRED_CHECKS_NOT_GREEN", "warning", "required checks are failing or pending on the selected pull request"));
  }

  if (evidence.ticket.status === "review") {
    if (evidence.pullRequest.state === "merged" && evidence.pullRequest.mergeSha) {
      if (evidence.commits.reachability === "unreachable") {
        findings.push(finding("RECORDED_COMMIT_UNREACHABLE", "error", "a recorded ticket commit is not reachable from the exact merged pull-request target; reconciliation does not recommend advancing the ticket"));
        return none();
      }
      findings.push(finding("MERGED_REVIEW", "info", "the pull request is merged while the ticket remains in Review"));
      return { evidence, findings, recommendation: recommend(evidence, "MOVE_TO_VERIFYING", "verifying") };
    }
    if (evidence.pullRequest.state === "closed-unmerged") {
      findings.push(finding("CLOSED_UNMERGED_REVIEW", "warning", "the review pull request closed without merge; return to Implementing for an explicit next decision"));
      return { evidence, findings, recommendation: recommend(evidence, "MOVE_TO_IMPLEMENTING", "implementing") };
    }
    if (evidence.pullRequest.state === "absent" && !hasClaim) {
      findings.push(finding("REVIEW_WITHOUT_PR_OR_WORKER", "warning", "the ticket is in Review without a pull request or active claim; return to Implementing"));
      return { evidence, findings, recommendation: recommend(evidence, "MOVE_TO_IMPLEMENTING", "implementing") };
    }
  }

  // An abandoned lease is reclaimable before anything else is judged, and
  // deliberately BEFORE the dirty/missing stop below: FRD-028 acceptance 4
  // preserves dirty work, it does not refuse to reassign responsibility for
  // it. Recovery is `transferTicket`, which never deletes, cleans or moves a
  // workspace. It sits AFTER the Review routes so a merged Review still
  // advances rather than being reduced to a transfer, and it is refused for a
  // terminal ticket, whose only claim action is the clean-terminal release.
  //
  // An identity the transfer would itself refuse (`foreign-repository`,
  // `branch-mismatch`) or cannot prove (`detached`, `unavailable`) gets no
  // recommendation: the classifier does not propose a refusal.
  if (
    evidence.claim.state === "expired" &&
    evidence.ticket.status !== "done" &&
    (evidence.workspace.state === "clean" || evidence.workspace.state === "dirty" || evidence.workspace.state === "missing") &&
    (evidence.workspace.claimIdentity === "matches-claim" || evidence.workspace.claimIdentity === "not-applicable")
  ) {
    return { evidence, findings, recommendation: recommend(evidence, "RECOVER_EXPIRED_CLAIM") };
  }

  // Outside the Review recovery routes the advisory warnings are stops.
  if (dirtyWorkspace || missingWorkspace || unrecordedWorkspace || checksNotGreen) return none();

  if (evidence.ticket.status === "verifying" && !evidence.pullRequest.mergeSha) {
    findings.push(finding("VERIFYING_WITHOUT_MERGE_SHA", "error", "the ticket is Verifying but pull-request evidence has no merge SHA"));
    return none();
  }
  if (evidence.commits.reachability === "unreachable") {
    findings.push(finding("RECORDED_COMMIT_UNREACHABLE", "error", "a recorded ticket commit is not reachable from the exact merged pull-request target; reconciliation does not recommend advancing the ticket"));
    return none();
  }

  if (evidence.ticket.status === "verifying") {
    if (evidence.proof.state === "pass" && evidence.pullRequest.state === "merged" && evidence.pullRequest.mergeSha) {
      if (evidence.proof.mergedSha !== evidence.pullRequest.mergeSha) {
        findings.push(finding("PROOF_MERGE_SHA_MISMATCH", "error", "the PASS proof does not name the current merged pull-request SHA; reconciliation does not recommend Done"));
        return none();
      }
      findings.push(finding("PASS_PROOF_STILL_VERIFYING", "info", "a PASS proof is present for the merged pull request while the ticket remains Verifying"));
      return { evidence, findings, recommendation: recommend(evidence, "MOVE_TO_DONE", "done") };
    }
    if (evidence.proof.state === "fail") {
      // The routing table is `kanmer-verify/SKILL.md`'s, verbatim. A non-PASS
      // proof that names no class — or one this build does not recognise —
      // reaches the default and is inconclusive, never retryable. `transient`
      // and `inconclusive` both yield NO recommendation: the ticket stays in
      // Verifying because no board mutation expresses "rerun the check".
      switch (evidence.proof.failureClass ?? "inconclusive") {
        case "implementation":
          findings.push(finding("VERIFICATION_FAILED_IMPLEMENTATION", "warning", "verification failed against the plan and governing docs; the proof is preserved and the ticket returns to Implementing"));
          return { evidence, findings, recommendation: recommend(evidence, "ROUTE_VERIFICATION_FAILURE", "implementing") };
        case "plan":
          findings.push(finding("VERIFICATION_FAILED_PLAN", "warning", "verification failed because the plan is what is wrong; the proof is preserved and the ticket returns to Preparing"));
          return { evidence, findings, recommendation: recommend(evidence, "ROUTE_VERIFICATION_FAILURE", "preparing") };
        case "transient":
          findings.push(finding("VERIFICATION_TRANSIENT_RETRY", "warning", "verification failed on the environment rather than the change; rerun the failed check and retain both attempts — the ticket stays in Verifying and reconciliation recommends no move"));
          return none();
        default:
          findings.push(finding("VERIFICATION_INCONCLUSIVE", "warning", "verification did not distinguish an implementation, plan or transient failure; the ticket stays in Verifying until the proof names a class"));
          return none();
      }
    }
  }

  if (evidence.ticket.status === "done" && hasClaim && evidence.workspace.state === "clean" && evidence.workspace.claimIdentity === "matches-claim") {
    findings.push(finding("CLEAN_TERMINAL_CLAIM", "info", "a completed ticket still has a clean recorded claim; releasing it belongs to closeout"));
    return { evidence, findings, recommendation: recommend(evidence, "RELEASE_CLEAN_TERMINAL_CLAIM") };
  }

  if (evidence.ticket.status === "done" && hasClaim && evidence.workspace.state === "clean") {
    findings.push(finding("TERMINAL_CLAIM_IDENTITY_UNVERIFIED", "warning", "the terminal workspace is clean but does not prove the recorded repository and branch identity; reconciliation preserves the claim"));
    return none();
  }

  findings.push(finding("NO_RECONCILIATION_NEEDED", "info", "the supplied evidence does not describe a safe reconciliation recommendation"));
  return none();
}

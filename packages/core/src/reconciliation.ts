import { createHash } from "node:crypto";
import { hasLegacyTicketClaim } from "./types.js";
import type {
  ReconciliationAction,
  ReconciliationEvidence,
  ReconciliationFinding,
  ReconciliationProposal,
  ReconciliationResult,
} from "./types.js";

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

/** A proposal is invalid the moment either its action or its observed facts change. */
export function reconciliationProposalId(evidence: ReconciliationEvidence, action: ReconciliationAction): string {
  return createHash("sha256")
    .update(JSON.stringify({ evidence: stableEvidence(evidence), action }))
    .digest("hex");
}

function proposal(evidence: ReconciliationEvidence, action: ReconciliationAction, targetStatus?: string): ReconciliationProposal {
  return {
    id: reconciliationProposalId(evidence, action),
    ticketId: evidence.ticket.id,
    ticketUpdated: evidence.ticket.updated,
    action,
    ...(targetStatus ? { targetStatus } : {}),
  };
}

/**
 * Evaluate bounded host-collected facts. This function is deliberately pure:
 * core never executes Git/GitHub commands and never mutates a board here.
 */
export function reconcileEvidence(input: ReconciliationEvidence): ReconciliationResult {
  const evidence = stableEvidence(input);
  const findings: ReconciliationFinding[] = [];
  const hasClaim = evidence.ticket.taken || hasLegacyTicketClaim({
    taken_at: evidence.claim.takenAt ?? undefined,
    branch: evidence.claim.branch ?? undefined,
    worktree: evidence.claim.worktree ?? undefined,
  });
  const dirtyWorkspace = evidence.workspace.state === "dirty";

  if (evidence.workspace.boardWorktree) {
    findings.push(finding("BOARD_WORKTREE_PROTECTED", "error", "the recorded workspace is the Kanmer board worktree; reconciliation refuses every action"));
    return { evidence, findings, proposal: null };
  }
  if (dirtyWorkspace) {
    findings.push(finding("DIRTY_WORKSPACE_PRESERVED", "warning", "the recorded workspace is dirty; reconciliation preserves it and never proposes cleanup"));
    // A dirty implementation worktree must not prevent a safe board-only
    // Review → Verifying repair after merge. Terminal release remains below.
    if (evidence.ticket.status !== "review") return { evidence, findings, proposal: null };
  }
  if (evidence.workspace.state === "missing" && hasClaim) {
    findings.push(finding("WORKSPACE_MISSING", "warning", "the taken ticket's workspace is missing; reconciliation records no-surviving-workspace evidence and proposes no destructive action"));
    return { evidence, findings, proposal: null };
  }
  if (evidence.workspace.state === "not-recorded" && hasClaim) {
    findings.push(finding("CLAIM_WITHOUT_RECORDED_WORKSPACE", "warning", "the legacy ticket claim has no recorded workspace; reconciliation preserves the claim and proposes no cleanup"));
    return { evidence, findings, proposal: null };
  }
  if (evidence.release.state === "contended" || evidence.release.state === "superseded") {
    findings.push(finding("RELEASE_EVIDENCE_PRESERVED", "warning", "release ownership is contended or superseded; reconciliation preserves immutable evidence and proposes no action"));
    return { evidence, findings, proposal: null };
  }
  if (
    evidence.pullRequest.state === "unavailable" ||
    evidence.pullRequest.requiredChecks === "unavailable" ||
    evidence.commits.reachability === "unavailable" ||
    evidence.workspace.state === "unavailable" ||
    evidence.release.state === "unavailable"
  ) {
    findings.push(finding("EVIDENCE_INCONCLUSIVE", "warning", "required Git, GitHub, CI, workspace or release evidence is unavailable; reconciliation does not invent a recovery action"));
    return { evidence, findings, proposal: null };
  }
  if (evidence.ticket.status === "verifying" && !evidence.pullRequest.mergeSha) {
    findings.push(finding("VERIFYING_WITHOUT_MERGE_SHA", "error", "the ticket is Verifying but pull-request evidence has no merge SHA"));
    return { evidence, findings, proposal: null };
  }
  if (evidence.pullRequest.requiredChecks === "fail" || evidence.pullRequest.requiredChecks === "pending") {
    findings.push(finding("REQUIRED_CHECKS_NOT_GREEN", "warning", "required checks are failing or pending; reconciliation does not advance the ticket"));
    return { evidence, findings, proposal: null };
  }
  if (evidence.commits.reachability === "unreachable") {
    findings.push(finding("RECORDED_COMMIT_UNREACHABLE", "error", "a recorded ticket commit is not reachable from the exact merged pull-request target; reconciliation does not advance the ticket"));
    return { evidence, findings, proposal: null };
  }

  if (evidence.ticket.status === "review") {
    if (evidence.pullRequest.state === "merged" && evidence.pullRequest.mergeSha) {
      findings.push(finding("MERGED_REVIEW", "info", "the pull request is merged while the ticket remains in Review"));
      return { evidence, findings, proposal: proposal(evidence, "MOVE_TO_VERIFYING", "verifying") };
    }
    if (evidence.pullRequest.state === "closed-unmerged") {
      findings.push(finding("CLOSED_UNMERGED_REVIEW", "warning", "the review pull request closed without merge; return to Implementing for an explicit next decision"));
      return { evidence, findings, proposal: proposal(evidence, "MOVE_TO_IMPLEMENTING", "implementing") };
    }
    if (evidence.pullRequest.state === "absent" && !hasClaim) {
      findings.push(finding("REVIEW_WITHOUT_PR_OR_WORKER", "warning", "the ticket is in Review without a pull request or active claim; return to Implementing"));
      return { evidence, findings, proposal: proposal(evidence, "MOVE_TO_IMPLEMENTING", "implementing") };
    }
  }

  if (evidence.ticket.status === "verifying") {
    if (evidence.proof.state === "pass" && evidence.pullRequest.state === "merged" && evidence.pullRequest.mergeSha) {
      if (evidence.proof.mergedSha !== evidence.pullRequest.mergeSha) {
        findings.push(finding("PROOF_MERGE_SHA_MISMATCH", "error", "the PASS proof does not name the current merged pull-request SHA; reconciliation does not mark the ticket Done"));
        return { evidence, findings, proposal: null };
      }
      findings.push(finding("PASS_PROOF_STILL_VERIFYING", "info", "a PASS proof is present for the merged pull request while the ticket remains Verifying"));
      return { evidence, findings, proposal: proposal(evidence, "MOVE_TO_DONE", "done") };
    }
    if (evidence.proof.state === "fail") {
      findings.push(finding("FAILED_VERIFICATION_REQUIRES_DISPOSITION", "warning", "verification failed; preserve the proof and route the ticket through its recorded implementation, plan or terminal disposition"));
      return { evidence, findings, proposal: null };
    }
  }

  if (evidence.ticket.status === "done" && hasClaim && evidence.workspace.state === "clean" && evidence.workspace.claimIdentity === "matches-claim") {
    findings.push(finding("CLEAN_TERMINAL_CLAIM", "info", "a completed ticket still has a clean recorded claim; release the claim but leave physical cleanup to closeout"));
    return { evidence, findings, proposal: proposal(evidence, "RELEASE_CLEAN_TERMINAL_CLAIM") };
  }

  if (evidence.ticket.status === "done" && hasClaim && evidence.workspace.state === "clean") {
    findings.push(finding("TERMINAL_CLAIM_IDENTITY_UNVERIFIED", "warning", "the terminal workspace is clean but does not prove the recorded repository and branch identity; reconciliation preserves the claim"));
    return { evidence, findings, proposal: null };
  }

  findings.push(finding("NO_RECONCILIATION_NEEDED", "info", "the supplied evidence does not describe a safe reconciliation action"));
  return { evidence, findings, proposal: null };
}

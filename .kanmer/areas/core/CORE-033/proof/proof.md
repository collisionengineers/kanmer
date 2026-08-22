---
kind: proof-record
merged_sha: "44264b2fa18031d83d7f538db7725c0f27e2feca"
prs:
  - "158"
result: PASS
verified_at: "2026-08-22T06:50:00Z"
---

## Merged-main verification

PR #158 merged with the regular merge strategy as commit 44264b2fa18031d83d7f538db7725c0f27e2feca. The final reviewed head c283f4cc and the pre-mutation playbook commit 89e61bdf are both ancestors of this merge target (merge-base checks exit 0). The merged diff is exactly the one playbook file.

Independent review PASS is recorded in scratch/review.md. Hosted PR checks on the final head passed: verify and kanmer-gate in run 32557665583 (jobs 96994318125 and 96994318266). All five review threads were dispositioned: the pre-squash SHA concern was rejected with reachability evidence, behavior-test evidence was fixed, and release/board-rename compatibility gaps were deferred to linked CORE-042 and CORE-043 without bypassing protection.

Merged-main live readback: main requires PRs, exact verify, resolved conversations, and no force/delete; kanmer-board has no PR/check requirement and allows ordinary pushes while forbidding force/delete. The branch-protection API fields match the playbook. A production GUI syncBoard run pushed board commit 83cdf801 and the remote board ref remained healthy.

## Retained boundaries

Force-push and deletion negatives were intentionally not attempted destructively. CORE-042 owns adapting scripts/release.mjs to the protected-main boundary; CORE-043 owns keeping protection aligned with supported board-branch renames. These are explicit follow-up tickets, not hidden deviations.

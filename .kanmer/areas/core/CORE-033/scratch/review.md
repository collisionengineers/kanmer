# Independent review — CORE-033 / PR #158

## Review basis

- PR: https://github.com/collisionengineers/kanmer/pull/158
- Base: main at 0c5ed84ed0128aed6c8a60bec265a8dcb589061a
- Head: 9bf60372147123199876b623aefe9cb222b60668
- Diff scope: exactly one added file, docs/plans/compiled-workflow/playbook.md, 176 lines.
- Hosted checks: verify PASS in run 32557510255 job 96993932885; kanmer-gate PASS in the same run but correctly not listed as a required CORE-033 check.
- Independent API readback matches the playbook: main has exact required check verify, strict false, PR requirement with zero approvals, conversation resolution, enforce_admins true, allow_force_pushes false, allow_deletions false; kanmer-board has no required checks or PR review requirement, conversation resolution false, enforce_admins true, allow_force_pushes false, and allow_deletions false.
- The two prerequisite verify runs and distinct heads are independently confirmed: run 32546955237/job 96967001211 on a174ce9645e0bcc276a45b993c35710e62e43316, and run 32557139544/job 96993014805 on fddcd9b4c900b5f597f26b805300ff629e60a747. CORE-032 and GUI-085 are Done on the board.
- The direct main push evidence is concrete and independently reachable: commit 154b6cdb exists with parent main 0c5ed84; the playbook records exit 1 and GH006 protected-branch refusal.

## Blocking findings

- [blocking] B-001 — CORE-033 checklist/checklist.md is still 0/50 checked, including all preconditions, both live-policy sections, readback, behavioural proof, scope, and handoff. The implementation packet is not review-ready and its board record does not attest which claims were actually completed. Disposition: fix by updating the checklist with exact evidence and leaving only genuinely unavailable items unchecked.
- [blocking] B-002 — The playbook supplies procedures but not results for three required behavioural checks: pending or unchecked PR blocked by verify, unresolved conversation blocks a green PR, and ordinary Kanmer board sync/direct push succeeds. Only the direct main push refusal is recorded. The plan acceptance and checklist explicitly require these results, so the playbook cannot yet claim complete evidence. Disposition: run and record these tests, or mark them INCONCLUSIVE with exact reason and retain the gap in the packet.

## Non-blocking observations

- The current PR is mergeable with both hosted checks green, but GitHub reports mergeStateStatus BLOCKED pending independent review, which is consistent with the requested review stop.
- The playbook correctly keeps kanmer-gate future-only and does not introduce workflow, board-sync, or unrelated policy changes.
- Numeric rule IDs are unavailable from this personal-repository branch-protection API; the branch-specific protection URLs are a reasonable durable identifier.

## Verdict

NEEDS-CHANGES until B-001 and B-002 are resolved or explicitly dispositioned as INCONCLUSIVE in the ticket packet. No merge performed per review instruction.

## Re-review — final PR head c283f4cc

Re-reviewed against the complete current CORE-033 packet, EPIC-009 and HZN-007 context, plan, checklist, report, governing refs, and live GitHub state.

- PR #158 head is c283f4cc44f9c4ad765cf2ea6da34eda849b01f9 on main base 0c5ed84ed0128aed6c8a60bec265a8dcb589061a. The source diff remains exactly one file: docs/plans/compiled-workflow/playbook.md. The amendment adds the production board-sync evidence without broadening scope.
- Hosted checks pass: verify run 32557665583 job 96994318125 and kanmer-gate job 96994318266. kanmer-gate remains informational and is not required by the main protection readback. PR mergeStateStatus is CLEAN and mergeable; no merge was performed.
- Independent live readback still matches the playbook: main requires only verify with strict=false, PRs, zero approvals, conversation resolution, admin enforcement, and no force pushes/deletion; kanmer-board has no PR/check/conversation requirement and has no-force/no-delete protection.
- The board-sync evidence is reachable: 83cdf8014d607f09b745325ec6822c871adc7cd2 exists remotely, and current refs/heads/kanmer-board is 87e546cb8709f280cf30d2a72fb68f1d722eb573, a single later child sync commit. This is consistent with the recorded successful historical sync, not a lost or fabricated SHA.
- The unresolved-thread evidence is independently readable: GraphQL thread PRRT_kwDOT2PEds6bXFpb isResolved=true and resolvedBy=collisionengineers. The current report/checklist record the initial pending-check BLOCKED state and subsequent BLOCKED to CLEAN transition.

### Prior findings disposition

- B-001 fixed. MCP readback reports CORE-033 checklist 50/50, with exact run, settings, direct-push, conversation, board-sync, scope, and handoff evidence; the post-implementation report is present and consistent with the one-file diff.
- B-002 fixed. The updated ticket packet records the pending verify observation, unresolved-thread BLOCKED to CLEAN transition, direct main refusal, and production syncBoard push. The playbook now carries the board-push command/result and the packet report/checklist carry the controlled PR/conversation results required by the plan.

### Verdict

PASS — no unresolved review findings. The PR is independent-review-ready at c283f4cc. Do not merge as part of this review; merge remains an explicit parent/operator action.


## Final review dispositions — 2026-08-22

- B-003 (pre-squash SHA): **rejected with evidence**. The PR is being merged with the regular merge strategy, not squash; 89e61bdf is an ancestor of c283f4cc (merge-base --is-ancestor exit 0), so it remains reachable from the merge target.
- B-004 (missing behavior outcomes): **fixed** in c283f4cc. The playbook and report record the queued-check BLOCKED observation, unresolved-thread false→true transition to CLEAN, and production syncBoard board push 83cdf801.
- B-005 (release command direct push): **deferred to CORE-042**, linked on the board and in the PR thread. CORE-033 is explicitly source-free beyond the playbook; no bypass is accepted.
- B-006 (board-branch rename leaves protection stale): **deferred to CORE-043**, linked on the board and in the PR thread. The live exact-branch policy is retained; board-sync code is not silently changed here.

Independent verdict remains PASS for CORE-033’s scoped playbook and live branch rules, with CORE-042/043 carrying the two compatibility follow-ups.

---
kind: review-attestation
pr: "169"
head_sha: "47169144c0bd13bd205e42922c0282bfd56c466a"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "d4f2e65c2dfe0d08"
ticket_updated: "2026-08-22T11:05:01.163Z"
findings:
  - id: F-003-release
    severity: blocker
    summary: "Replacement-owner release can leave a ghost lock after quarantine restoration"
    disposition: open
    reason: "When A inspected the old lock, B claimed and recreated the path, and A then moved B's lock into quarantine, B can finish before A restores the replacement. B's finally sees the original path absent; A subsequently hard-links B's completed lock back to the original path. The deterministic release-order probe produced a fulfilled B, A=EEXIST, and a remaining lock with B's pid after B had released."
  - id: F-003-claim
    severity: blocker
    summary: "A third claimant can cause an active replacement lock to be deleted"
    disposition: open
    reason: "After A moves B's fresh lock into quarantine, C can claim the empty original path before A's link. The link gets EEXIST and the implementation then removes the quarantine file, deleting B's still-active lock while C runs. The deterministic probe observed cText with C's lock, quarantineCount 0, and concurrentWinnerStillRunning true."
  - id: F-003-artifact
    severity: blocker
    summary: "Committed standalone plugin artifact does not contain the lock fix"
    disposition: open
    reason: "PR #169 changes only packages/core/src/io.ts and io.test.ts. plugins/kanmer/mcp/kanmer-mcp.cjs is unchanged from CORE-046 and its bundled recoverStaleLock still unconditionally removes quarantineFile, so installed plugin/runtime users retain the old race."
  - id: traceability
    severity: blocker
    summary: "Ticket commit metadata is not the reachable PR head"
    disposition: open
    reason: "The board item records 47169144e9e6fdd8b215408cbb177657e6c7a0bce, which is not resolvable locally or by PR #169. The authoritative PR and worktree head is 47169144c0bd13bd205e42922c0282bfd56c466a; ticket metadata must be corrected before merge."
---
# Independent review — CORE-047

## Verdict

NEEDS-CHANGES. The ordinary reversed-order regression passes, but the remediation is not ownership-safe across replacement-owner release and a third claimant. It can resurrect a completed lock or delete an active replacement lock. The committed standalone plugin artifact is also stale, and the ticket's recorded commit SHA is unreachable.

## Packet and exact diff

I read the complete CORE-047 research, files, plan, checklist, open-questions, post-implementation report and execution packet; HZN-007 context; FRD-027; ADR-0020; and CORE-046's SHA-bound NEEDS-CHANGES attestation. The exact PR #169 diff from CORE-046 head 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c to the authoritative local/GitHub head 47169144c0bd13bd205e42922c0282bfd56c466a is scoped to two files: packages/core/src/io.ts and packages/core/src/io.test.ts. The branch is clean and git diff --check passes. The assignment/board SHA 47169144e9e6fdd8b215408cbb177657e6c7a0bce does not exist; I bound this attestation to the actual PR head.

## F-003 audit

PASS for the ordinary forward and reversed-order test paths: the new test passes and the winner's replacement content is restored when the original path is empty. Inherited atomic-write, rename retry, and TMP_FILE_RE assertions remain present.

BLOCKER — release ordering: a deterministic probe paused A after moving B's replacement lock into quarantine, released B before A's verification/link, then allowed A to continue. Output was aCode EEXIST, replacementOwnerReleased true, and lockAfterRelease containing B's pid. B's finally had already run, so A resurrected a completed owner's lock.

BLOCKER — third claimant: a deterministic probe started C after A moved B's replacement lock but before A's link. Output was aCode EEXIST, cText containing C's lock, quarantineCount 0, concurrentWinnerStillRunning true. B's active replacement lock was removed from quarantine even though C owned the original path. This directly violates the no-fresh-lock-deleted/overwritten acceptance.

The implementation must coordinate replacement-owner release with quarantine restoration and must never remove a quarantined replacement when restoration loses to another claimant. Add deterministic release-order and third-claimant regressions; retain the current forward/reversed-order tests.

## Artifact and traceability audit

PR #169 has two unresolved P1 GitHub threads. The first reports the replacement-owner release race described above. The second is confirmed: the committed plugins/kanmer/mcp/kanmer-mcp.cjs artifact has no diff from CORE-046 and still contains the old unconditional quarantine removal, so the fix is absent from the installed plugin runtime. Rebuild the standalone artifact and rerun plugin synchronization checks.

The ticket item records commit 47169144e9e6fdd8b215408cbb177657e6c7a0bce, while GitHub PR #169 and the worktree resolve to 47169144c0bd13bd205e42922c0282bfd56c466a. Correct the ticket traceability before another review.

## Verification evidence

- PASS exit 0: npm run test -w @kanmer/core -- src/io.test.ts — 17/17.
- PASS exit 0: npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts — 108/108.
- PASS exit 0: npm test -w @kanmer/core — 295/295 across 15 files.
- PASS exit 0: npm run typecheck -w @kanmer/core.
- PASS exit 0: npm run build:core.
- PASS exit 0: node --test packages/mcp-server/src/sources.test.mjs — 14/14 inherited source rail.
- PASS exit 0: 20 isolated runs of the reversed-order replacement-lock test, 20/20.
- The PR has no hosted workflow runs and two unresolved P1 review threads. Genuine multi-process Windows stress, PID reuse, process termination between inspection/reclaim and crash timing remain INCONCLUSIVE.

## Required remediation

Fix both ownership races without resurrecting released locks or deleting active replacement locks; add the two adversarial regressions; regenerate plugins/kanmer/mcp/kanmer-mcp.cjs and run plugin checks; correct the recorded ticket SHA; then request fresh independent review. No merge, move or cleanup was performed.

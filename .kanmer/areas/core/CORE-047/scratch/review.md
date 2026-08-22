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

---
kind: review-attestation
pr: "169"
head_sha: "47169144c0bd13bd205e42922c0282bfd56c466a"
verdict: needs-changes
reviewer: "core041-executor"
independent: true
plan_hash: "d4f2e65c2dfe0d08"
ticket_updated: "2026-08-22T11:05:01.163Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Replacement lock can be restored after its owner cleanup, leaving an orphaned lock"
    disposition: open
    reason: "The post-rename inode check and exclusive hard-link restoration protect an active replacement owner, but not the ordering where that owner finishes before the stale reclaimer validates/restores its quarantine. A deterministic injected run delayed the stale reclaimer after moving the winner lock, released the winner callback, then allowed validation/link restoration: the winner cleanup saw ENOENT, the stale reclaimer restored the winner inode afterward, and the original lock path remained with pid/process metadata after both operations completed. The protocol must coordinate restoration with owner cleanup or use an ownership token/generation that cannot recreate a lock after its owner has released it."
  - id: F-002
    severity: major
    summary: "CORE-047 ticket records a non-existent commit SHA"
    disposition: open
    reason: "MCP item commits records 47169144e9e6fdd8b215408cbb177657e6c7a0bce, but git rev-parse rejects that SHA. GitHub PR #169 and the branch resolve to 47169144c0bd13bd205e42922c0282bfd56c466a. Traceability must be corrected to the exact reachable PR head before acceptance."
---
# Independent review — CORE-047

## Scope and packet

I read the complete CORE-047 ticket, research/files/plan/checklist/open-questions/post-implementation-report, HZN-007 context, CORE-046 packet, and CORE-046's independent NEEDS-CHANGES review at PR #167. I inspected PR #169's exact two-file diff against CORE-046 head 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c. The diff is scoped to `packages/core/src/io.ts` and `packages/core/src/io.test.ts`; inherited IO assertions remain present.

## F-001 audit

The ordinary reversed-order regression passes and proves that an active replacement lock is not deleted while its callback is held. However, the production protocol still has a cleanup-order race. I ran a deterministic variant of the injected seam in which the replacement owner releases immediately after the stale reclaimer moves its lock into quarantine, before the stale reclaimer reads/restores that quarantine. The result was `staleError=EEXIST`, `winnerResult=winner`, `leftover=true`, with the original lock path containing the winner's pid/createdAt record after both promises completed. This is an orphaned lock: the winner's `finally` observed ENOENT while the stale reclaimer restored afterward. The fix must close this ordering, not only preserve an active callback.

Repeated original regression: 12/12 PASS. The additional cleanup-order stress is a deterministic NEEDS-CHANGES finding.

## F-002 traceability audit

PR #169 reports head `47169144c0bd13bd205e42922c0282bfd56c466a`; `git rev-parse` confirms it and its ancestry from CORE-046. The CORE-047 MCP item records `47169144e9e6fdd8b215408cbb177657e6c7a0bce`, which `git rev-parse` rejects. Correct the recorded commit to the reachable PR head.

## Verification evidence

- PASS exit 0: `npm run test -w @kanmer/core -- src/io.test.ts` — 17/17.
- PASS exit 0: repeated targeted reversed-order regression — 12/12 iterations.
- PASS exit 0: `npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts` — 108/108.
- PASS exit 0: full `npm run test -w @kanmer/core` — 295/295.
- PASS exit 0: `npm run typecheck -w @kanmer/core`.
- PASS exit 0: `npm run build:core`.
- PASS exit 0: `git diff --check`.
- No hosted checks are reported for PR #169; live multi-process Windows crash/PID-reuse proof remains INCONCLUSIVE as documented.

## Verdict

NEEDS-CHANGES. The active-owner reversed-order case is covered, but the cleanup-order stress leaves an orphaned replacement lock, and the ticket SHA is unreachable. No merge, move, cleanup, or source change was performed.

# Independent review — CORE-047 — LATEST SHA-BOUND ATTESTATION

This entry supersedes the prior review entries for old head `47169144c0bd13bd205e42922c0282bfd56c466a`. It reviews only the current PR head.

- independent: true
- verdict: PASS
- ticket: CORE-047
- PR: #169 (open; not merged)
- reviewed_head: `67e2be792e8480d29df7ff13128fb8c7886056a`
- base: `core-046-lock-reclaim-race-ipv6` / `54651a3c77b8ca8d02d9d309e36baf9b62ebca3c`
- branch: `core-047-replacement-lock-race`
- plan_version/hash: `d4f2e65c2dfe0d08`
- review_date: 2026-08-22

## Scope and diff audit

The exact head contains only the bounded CORE-047 implementation and proof changes:
- `packages/core/src/io.ts`
- `packages/core/src/io.test.ts`
- `plugins/kanmer/mcp/kanmer-mcp.cjs`

The implementation uses unique owner tokens and owner-marker leases, token-aware release with a double sweep, and active-owner quarantine retention. The tests add deterministic release-order and third-claimant coverage while preserving inherited IO assertions. The committed standalone plugin bundle contains the same token/lease/release logic; `npm run plugin:check` confirms source/bundle byte parity.

Prior findings are dispositioned:
- Release-order orphan race: FIXED by token-aware owner release and the second token sweep.
- Third-claimant deletion race: FIXED by active-owner marker detection and retaining a quarantined active replacement for its owner to clean up.
- Stale plugin artifact: FIXED; regenerated artifact is present and plugin parity passes.
- Commit traceability: FIXED for this review; ticket and PR record exact reachable head `67e2be792e8480d29df7ff13128fb8c7886056a9`.

## Exact verification evidence

- `npm run test -w @kanmer/core -- src/io.test.ts` — PASS, 18/18.
- `npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts` — PASS, 109/109.
- `npm run test -w @kanmer/core` — PASS, 296/296.
- `npm run typecheck -w @kanmer/core` — PASS.
- `npm run build:core` — PASS.
- `node --test packages/mcp-server/src/sources.test.mjs` — PASS, 14/14.
- `npm run plugin:check` — PASS: 37 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.3, isolated MCP handshake lists 37 tools.
- `git diff --check` — PASS.
- Worktree at review time was clean at the reviewed head.

## Adversarial release-order probe

Against the freshly built `packages/core/dist/index.js`, the deterministic reversed-order probe produced exactly:

```json
{"winnerResult":"winner","staleResult":"stale-reclaimer","leftover":false,"leftoverContents":null,"entries":[]}
```

The winner released while its tokenized lock was quarantined; the stale reclaimer then completed, and no lock or quarantine entry remained.

## Adversarial third-claimant probe

Against the same freshly built artifact, the deterministic third-claimant probe produced exactly:

```json
{"staleError":"EEXIST","winnerResult":"winner","thirdResult":"third","thirdLockBefore":"{\"pid\":29596,\"createdAt\":1787397763859,\"token\":\"5fe8d12b-3f8e-4dbe-9dbf-57d7b61dd6f2\"}\n","quarantineBeforeWinnerRelease":["cache.lock.stale-29596-3"],"thirdLockAfterWinner":"{\"pid\":29596,\"createdAt\":1787397763859,\"token\":\"5fe8d12b-3f8e-4dbe-9dbf-57d7b61dd6f2\"}\n","finalPath":false,"finalEntries":[]}
```

The third claimant remained owner of the original path after the winner released, and all lock/quarantine entries were gone only after the third claimant released.

## Boundaries

No hosted workflow, genuine multi-process Windows crash/PID-reuse stress, process termination between inspection/reclaim, or crash-timing evidence is claimed. Those remain explicitly INCONCLUSIVE per the ticket's parked questions. No merge, move, cleanup, or source changes were performed by this reviewer.

## Review conclusion

PASS for `67e2be792e8480d29df7ff13128fb8c7886056a9`. Independent review is complete; leave PR #169 and CORE-047 at Review for the authorized next step.

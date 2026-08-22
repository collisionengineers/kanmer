# Independent review — CORE-054 / PR #176

- Reviewer: independent reviewer.
- Exact head: `1ef6852a676266e1760f61a328e00a7be67fdcb0` (supplied prefix `1ef6852a`).
- Exact base: CORE-052 head `825fb79dc3528b1d341f532ce8016aa0006624c8`, branch `core-052-board-refresh-state`.
- PR #176 is OPEN, CLEAN, MERGEABLE with no hosted checks reported.
- Diff scope is limited to `apps/gui/src/main/index.ts`, `apps/gui/src/main/kanmerGit.ts`, and `apps/gui/src/main/kanmerGit.test.ts`.

## Positive evidence

The new `shouldAttemptProtectedBranchRename` predicate correctly returns false for a live `branchMismatch`, and the real-Git regression proves an unexpected branch does not change refs/worktree porcelain through that predicate path. Focused GUI Git rail passes 20/20. The report's manual/docs/core/scripts/diff results are consistent; scripts are 89/89. The documented typecheck and GUI-build failures are pre-existing shared-dispatch diagnostics and not introduced by this diff. Live GitHub protection remains INCONCLUSIVE.

## Blocking finding

`applyGitPreferences` sets `blockedBranchRefresh` and suppresses the protected refusal branch, but its `else` ordinary rename loop still calls `renameBoardBranch` when the cached `ctx.syncStatus.branch` differs from `settings.kanmerBranch` (index.ts lines 693-697). `refreshBoardBranch` preserves the cached branch on mismatch. After a prior failed rename or stale cached preference, a live worktree on an unexpected branch can therefore still be renamed, mutating refs/worktree state despite `branchMismatch`. The current regression keeps cached branch `kanmer-board` equal to the saved setting and only exercises the pure predicate; it does not cover this stale-cache mismatch through `applyGitPreferences`.

This violates the ticket/report claim that any mismatch blocks both protected and ordinary rename paths. CORE-055 was created and linked as a blocking remediation: “skip all rename paths on branch mismatch,” with a cached-branch-different-from-saved-preference integration regression.

## Verdict

NEEDS-CHANGES. PR #176 is not merge-ready. No merge, move, verification, or cleanup performed. Re-review after CORE-055 lands with the exact mismatch integration path and preserved refs/worktree assertions.

## Fresh cumulative independent review — CORE-054 / PR #176

### Exact stack

The cumulative head is `b7957214962889891d0463a0882641c6980e29eb`, containing CORE-054 implementation `1ef6852a` and the independently reviewed CORE-055 merge `b7957214` (source `3964c2ca`). I reread the complete packet, the prior NEEDS-CHANGES attestation, CORE-055 report/review, FRD-020, ADR-0016, and the exact cumulative diff.

### Dispositions

- The original protected-refusal mismatch finding is fixed: `shouldAttemptProtectedBranchRename` fails closed on `branchMismatch` and preserves the current preference/live refs.
- The ordinary rename path finding is fixed by CORE-055: `shouldAttemptOrdinaryBranchRename` also requires no mismatch, and the cached-branch/different-preference regression proves refs/worktree porcelain remain unchanged.
- The protected default requirement remains enforced for a valid open-board context; no unscoped rename or provider behavior was added.
- Live GitHub protection retargeting and packaged GUI interaction remain explicit INCONCLUSIVE boundaries, not unclaimed PASS.

### Evidence

- PASS exit 0: `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` — 20/20 at the cumulative head (131.10s test time).
- The child exact-head rails remain PASS: manual 22 chapters, verify-docs, build:core, scripts 89/89, and diff-check. The cumulative diff adds no new untested surface beyond the child regression.
- Broad GUI/typecheck/build shared-dispatch `antigravity` failures remain recorded as unrelated baseline evidence.

### Verdict

PASS — the CORE-054 review blocker is closed at exact cumulative head `b7957214`. Merge PR #176 non-squash into `core-052-board-refresh-state`, then move CORE-054 to Verifying. Do not verify or clean up in this review step.

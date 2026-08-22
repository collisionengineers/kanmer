## Independent review — NEEDS-CHANGES

Reviewed exact PR #175 head `825fb79dc3528b1d341f532ce8016aa0006624c8` against base `11930038542d402865bb26a23787d7d3cad3e2c5`. The scoped diff, governing-document references (FRD-020 and ADR-0016), and deterministic local rails were inspected independently.

### P1 — mismatch path still auto-renames the observed branch

`refreshBoardBranch(status, requestedBranch)` correctly leaves the cached branch at `kanmer-board` and sets `branchMismatch=true` when the live worktree is on an unexpected branch. However, `applyGitPreferences` then computes `protectedOpenBoard` from the unchanged cached branch and enters its `if (protectedOpenBoard)` branch. That branch unconditionally calls `renameBoardBranch(ctx.syncStatus.boardRoot, requestedBranch)`. Therefore a worktree observed on an arbitrary branch can still be renamed automatically, contrary to the report and the ticket requirement to retain the current preference and perform no automatic rename on mismatch. The fix must make the mismatch path block/refuse before the protected refusal loop (and add an integration regression proving the unexpected branch, refs, and worktree remain unchanged).

### Checks

- `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`: exit 0, 19/19.
- `npm run check:manual`: exit 0.
- `npm run verify:docs`: exit 0.
- `node --test scripts/release-flow.test.mjs`: exit 0, 5/5.
- `npm run test:scripts`: exit 0, 89/89 after the documented core build prerequisite.
- `git diff --check`: exit 0.
- Full GUI/typecheck/build and live protection/manual interaction evidence remain the report's documented baseline or INCONCLUSIVE boundaries; they do not change this source finding.

### Verdict

NEEDS-CHANGES. Do not merge PR #175 until the mismatch branch is proven not to be renamed and the regression is added.

## Fresh cumulative independent review — CORE-052 / PR #175

### Exact stack and scope

The exact cumulative head is `f4705d9e87545a7e64ea4aebf9c0a7272eb45d28`, with CORE-054/055 non-squash merges included. I reread the complete CORE-052 packet, prior review findings, child reports/reviews, FRD-020, ADR-0016, and the cumulative diff. The diff is limited to the documented workflow/manual/settings/test surfaces: `pr.yml`, Git preference/refresh logic and tests, Settings guidance, and generated/manual chapters.

### Dispositions

- Actions-variable handoff — fixed: workflow and GUI/manual guidance name `KANMER_BOARD_BRANCH` and preserve the default fallback only when absent.
- Destination equality and state preservation — fixed: `refreshBoardBranch` validates the requested destination, marks unexpected live branches as paused mismatch, preserves the cached/current preference and prior error, and the CORE-054/055 child guards skip every rename path.
- Contradictory troubleshooting guidance — fixed and regenerated; manual freshness and link/doctor validation pass.
- No new out-of-scope provider or GitHub mutation behavior is present. Live branch-protection retargeting and packaged GUI interaction remain explicit INCONCLUSIVE boundaries.

### Evidence at exact cumulative head

- PASS exit 0: `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` — 12/12 tests in a detached exact-head worktree.
- PASS exit 0: `npm run build:core`, `npm run check:manual` (22 chapters), `npm run verify:docs`, `npm run test:scripts` (89/89), and `git diff --check`.
- The broader GUI/typecheck/build baseline failures and child deterministic rails remain preserved in the packet; no new touched-surface failure was observed.

### Verdict

PASS — independent cumulative review at exact head `f4705d9e`. Merge PR #175 non-squash into `core-043-protection-retarget`, then move CORE-052 to Verifying. Do not verify or clean up in this review step.

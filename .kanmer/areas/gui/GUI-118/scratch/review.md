# Independent review — NEEDS-CHANGES

Reviewed independently of author codex-recovery. Exact PR #219 head `e09009b2eadfc8a63608307f05ceb4868a5ec273`; the commit's direct parent is the requested CORE-043 head `1126253eed586111db60ed72eccf6754f0f5ef06`. At review time the target branch had advanced to `7654a28104fbc67c58cad61241188d0f3d898c17` through merged GUI-119, so GitHub reports that as PR base; no source from GUI-119 is included in the head commit.

## Changes checked

- Native Grok/Antigravity functional probes now require project identity plus expected/actual branch and affirmative on-expected-branch evidence.
- `index.ts` adds an application lifecycle lock, deferred provider reconciliation state, transactional branch preference handling, Retry reconciliation, and user-scoped native reconnect updates.
- `settings.ts`, `kanmerGit.ts`, provider/connect seams, IPC types, and focused production-caller tests cover the eight mapped GUI-118 findings.
- Diff is limited to the 11 GUI lifecycle/provider files listed by the packet; `git diff --check` passed.

## Blocking finding

- **F-001 — GUI-120, blocking:** `connectProject` loops over every open context as `for (const [id, project] of contexts)` but emits `{ projectId, ... }` using the initiating function argument rather than `id`. The renderer accepts a status event only when `status.projectId === root` (`App.tsx`), so after a user-scoped Grok/Antigravity Connect in project A, project B's updated `nativeReconnectRequired` state is broadcast with A's id and discarded by B. This contradicts the ticket's “update all open project contexts” contract and has no multi-project production-caller regression. Linked blocker: [[GUI-120]].

## Evidence/disposition

- Author packet reports settings 4/4, providers 66/66, connect 34/34, index.sync 10/10, reduced GUI 47 files/392 tests, typecheck/build/docs/scripts/diff PASS.
- Independent focused rerun first exited 1 during collection: settings 4/4 passed, while providers/connect/index.sync failed with `Missing shared dispatch provider antigravity` because the linked worktree resolved `@kanmer/core` from the primary checkout. After `npm run build:core` (exit 0), the same focused command reproduced the same exit 1; this environment limitation is preserved, not relabeled PASS.
- No hosted checks were reported. Live native-provider, packaged, protected-branch, and hosted evidence remain INCONCLUSIVE as documented.

Verdict: NEEDS-CHANGES. Do not merge PR #219 until GUI-120 fixes the broadcast project id and adds the multi-project regression; no source or review-thread edits were made.

# Independent cumulative review — NEEDS-CHANGES

- Exact PR: #219
- Exact head: `37740379552e241f200bb181a2ca0e9d3be32ece`
- Exact current CORE-043 base: `7654a28104fbc67c58cad61241188d0f3d898c17`
- Author: `codex-recovery`; reviewer: independent `core041_executor`
- Review boundary: GUI-118 source and GUI-120 remediation only; no merge performed.

## Prior finding disposition

GUI-118 F-001 (multi-project Connect status broadcast) is fixed at this head. `connectProject` now emits `projectId: id` for every open context, and the added production-caller regression asserts both open project ids are broadcast. GUI-120 is recorded as merged into this head at `37740379552e241f200bb181a2ca0e9d3be32ece`.

## New finding — GUI-121

The cumulative PR head is based on `1126253e`, but current CORE-043 is `7654a281` after GUI-119 merged. Comparing current base to this head shows the PR would remove/revert GUI-119 behavior:

- `apps/gui/src/main/remoteAccess/manager.ts`: removes `remoteBoardBranchEnvironment`, the board-branch constructor seam, and `KANMER_BOARD_BRANCH` propagation to remote runtime and doctor children.
- `apps/gui/src/main/remoteAccess/manager.test.ts`: removes the corresponding branch-binding regression.
- `apps/gui/src/main/connect.ts` and `connect.test.ts`: removes GUI-119 marketplace staging/branch propagation behavior and its regression, while retaining older code around the new GUI-118 changes.
- The resulting merge would therefore regress the already-merged GUI-119 contract even though GitHub reports the PR mergeable.

GUI-121 was created, linked to GUI-118, and blocks GUI-118. Required disposition: rebase/merge current CORE-043 into GUI-118, preserve GUI-119 behavior, rerun cumulative GUI/typecheck/build/scripts/docs/diff rails, and refresh exact traceability.

## Evidence

- `gh pr view 219`: OPEN, MERGEABLE, base `core-043-protection-retarget` at `7654a281`, head as above; no hosted checks reported.
- `git diff --check 7654a281..37740379`: PASS (exit 0).
- Current-base diff is 13 files / 397 insertions / 217 deletions; the two remote-access files are unrelated regressions introduced solely by the stale base.
- Existing author packet evidence remains: settings 4/4, providers 66/66, connect 34/34, index.sync 10/10; reduced GUI 47 files/392 tests; typecheck/build/docs/scripts/diff PASS. Full Git-heavy GUI, live native/protected-host, and hosted evidence remain INCONCLUSIVE as reported.
- Verdict: NEEDS-CHANGES. Do not merge PR #219 until GUI-121 is resolved and a fresh exact-head cumulative review is recorded.

# Canonical independent mainline review — PASS

- Ticket: GUI-118
- Merged CORE-043 mainline commit: `9519e2e8ad9c0424b63d9b9d8c4e6ef2832a7401`
- Parent CORE-043 commit: `7654a28104fbc67c58cad61241188d0f3d898c17`
- Final tree: `c58434556512262b972385b32bbf7d2ad88442f0`
- Reviewer: independent `core041_executor`; no merge or board move performed.

## Cumulative behavior confirmed

- GUI-118 lifecycle fixes remain present: serialized project/provider operations, transactional branch persistence, Retry provider reconciliation, native reconnect state, user-scoped clearing, and actionable handoff warnings.
- GUI-119 propagation remains present: OpenAI branch-aware invocation, Claude staged marketplace branch binding, and remote runtime/doctor `KANMER_BOARD_BRANCH` propagation.
- GUI-120/F-001 remains present: `connectProject` broadcasts each context with `projectId: id`, and the two-project production-caller regression remains in `index.sync.test.ts`.

## Evidence and dispositions

- The merged mainline tree exactly matches the independently tested cumulative tree from GUI-123.
- Focused providers/connect/index.sync/remote-manager rail: 121/121 passed, exit 0, including the GUI-120 broadcast regression.
- `git diff --check` from CORE-043 parent to merged mainline: PASS, exit 0.
- All prior GUI-121 and GUI-123 review findings are fixed in the cumulative lineage; no new findings.
- GUI-118 packet's GUI typecheck/build, scripts 89/89, docs, and prior deterministic evidence remain consistent. Full workspace typecheck and hosted/live native/protected/packaged evidence remain INCONCLUSIVE as explicitly recorded.
- Verdict: PASS for the merged mainline state.

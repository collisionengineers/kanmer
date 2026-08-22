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

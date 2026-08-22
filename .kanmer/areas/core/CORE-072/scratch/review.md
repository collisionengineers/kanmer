# Independent review — NEEDS-CHANGES

- Reviewer: codex-mcp-client; independent of author `codex-recovery`.
- Exact PR: #194 https://github.com/collisionengineers/kanmer/pull/194
- Exact head: `9abfc9f47b8acfa31ef57d5b30071f72de43497c`
- Base: `core-058-board-ignore-plugin-artifact` at `cbb152dae4effc6fe0db254a59639818e2915b44` (includes merged CORE-071).
- PR state: OPEN, CLEAN, MERGEABLE; no hosted checks attached.
- Ticket packet and HZN-007 context read; report/checklist match the bounded two-file diff. Recorded `9abfc9f4` resolves to the exact head.

## Diff and evidence

The diff adds `resumeOrphanMigration`, invokes it after attached orphan ignore repair and in first-time orphan creation, and adds a real-Git orphan-resume regression. Independent focused rail: `npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` — PASS, 26/26 in 87.32s. The packet reports GUI typecheck, core build, scripts 88/88, and diff check PASS; hosted Windows GUI remains INCONCLUSIVE.

## Blocking finding

CORE-076 — `resumeOrphanMigration` begins with `if (await hasHead(boardRoot) || !existsSync(boardRootBoard) || !existsSync(sourceBoard)) return`. If board commit/push succeeds but the subsequent source cleanup `git rm` fails (for example EPERM/lock), a retry sees the existing `HEAD` and returns before retrying cleanup. The source `.kanmer/` tree remains as a stale second board, contrary to the idempotent finalization claim. The 26-test regression covers a clean first retry but not post-commit cleanup failure/retry. CORE-076 is filed in Core, linked to and blocking CORE-072.

## Verdict

NEEDS-CHANGES. Do not merge PR #194 until CORE-076 makes source cleanup retryable after an already-committed board and adds the deterministic regression.

Correction to the finding text above: the actual guard is `if (await hasHead(boardRoot) || !existsSync(join(boardRoot, ".kanmer")) || !existsSync(sourceBoard)) return`; `boardRootBoard` was a shorthand typo in the scratch wording, not in the reviewed source.

## Independent review — NEEDS-CHANGES — 9abfc9f47b8acfa31ef57d5b30071f72de43497c

Reviewer: codex-core072-review, independent of the implementation author. Exact reviewed head: 9abfc9f47b8acfa31ef57d5b30071f72de43497c (PR #194), base cbb152dae4effc6fe0db254a59639818e2915b44.

Focused GUI Git rail: PASS — npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts, exit 0, 26/26. PR #194 has no hosted checks attached.

Blocking finding: resumeOrphanMigration returns immediately whenever hasHead(boardRoot) is true. If the initial orphan finalization commits successfully but the subsequent push or source cleanup fails, the next ensureBoardWorktree retry sees the existing HEAD and skips both retrying the push and removing the source .kanmer tree. This leaves an orphan migration only partially finalized, contrary to the ticket's retry/idempotence contract. The added regression exercises only an unborn/no-commit orphan and cannot cover commit-success/push-failure or cleanup-failure recovery. Resume must distinguish local commit from published/cleaned migration and retry each remaining step, with deterministic failure injection/regression.

Disposition: NEEDS-CHANGES; do not merge PR #194 or move CORE-072.

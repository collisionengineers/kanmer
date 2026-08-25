# Post-implementation report — CORE-102

## Summary

This PR isolates the area-born ticket ID and folder-persistence regression from unrelated board setup, while retaining independently observable real `addColumn` coverage. It preserves every tested ID/path assertion and leaves all timeouts, retry policy, production IO, lock/PID-reuse logic, release state, and workflows unchanged. PR [#254](https://github.com/collisionengineers/kanmer/pull/254) is opened at `6bd74aaa900651e53378b96deb785721c841855b`.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/store.test.ts` | Modified the named area-ID/folder test to use the fresh board's real `pr-review` area and assert `PR-001 → areas/pr-review/PR-001/PR-001.md`; retained the `TICK-001` fallback path assertion. Added an explicit board-registration assertion to the existing custom-area/filter test after real `addColumn`. | The historical Windows timeout covered two distinct behaviours. This keeps ticket creation/ID/path evidence focused, while retaining actual board mutation coverage without masking a separate lock-path failure. |

## Governing docs

- **FRD-015 R1:** the test uses a real `KanmerStore` and real filesystem access to assert the exact stored ticket Markdown paths, including the fallback `_none` area.
- **FRD-015 R2:** it continues to prove area-born allocation (`PR-001`) and unassigned fallback allocation (`TICK-001`). The separate custom-area case confirms the board registration that `addColumn` owns.
- **FRD-015 R5:** real item creation remains exercised. No atomic-write, lock recovery, PID-reuse protection, concurrency, or retry semantics changed.
- No governing document changes were needed: this is a test-responsibility separation that preserves the existing storage contract.

## Risks / follow-ups

The historical hosted run has no per-await trace. The cold Windows process-identity operation on the removed `addColumn` path is an evidence-backed inference, not a conclusive attribution. A timeout/failure in the still-real independent `addColumn` case would be a separate lock-path defect and must be handled in another ticket; it was not observed here. [[CORE-101]] remains unchanged and blocked pending normal independent review, merge, and merged-main proof.

## Verification hand-off

Implementation-head evidence, all exit 0:

- Focused area-ID/folder test: passed; named test time 70 ms.
- Focused independent custom-area/`addColumn` test: passed; named test time 567 ms.
- Ten bounded fresh area-ID/folder invocations: passed; test times 61–155 ms. No retries, cache warming, mock, or timeout change used.
- `npm run test -w @kanmer/core`: passed, 15 files / 310 tests.
- `npm run typecheck -w @kanmer/core`, `npm run build -w @kanmer/core`, and `git diff --check`: each passed.
- Fresh GitHub-origin clone at `6bd74aaa900651e53378b96deb785721c841855b`: `npm ci --ignore-scripts` and `npm run verify` passed. The rail included 310 core tests, 468 GUI tests, 102 HTTP tests, 102 script tests, all-workspace typechecks, docs, MCP smokes, mcpb, skills, managed-block, and plugin synchronization.

Independent review should inspect the one-file diff and PR checks. After a normal merge, `kanmer-verify` should rerun the appropriate merged-main verification before any proof or downstream [[CORE-101]] update.

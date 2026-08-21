# Checklist

- [x] `dispatchTicket` takes a task id and uses that task's prompt
- [x] omitting the task keeps the whole-ticket behaviour
- [x] `taskFeasibility` in core, pure, beside `DISPATCH_TASKS`
- [x] execute blocked without `plan/`, with the reason
- [x] verify blocked before `review`, with the reason
- [x] the other four enabled, warning when an input is missing
- [x] unit tests for the matrix
- [x] `Dispatch ▸ provider ▸ task` nested menu
- [x] each task row shows its deliverable
- [x] blocked rows disabled and show why
- [x] `DispatchStatus` carries `task` + `deliverable`
- [x] drawer rows show the task
- [x] dispatch still never pre-creates a worktree
- [x] `plugin:build` + `plugin:check`

## Progress notes

- 2026-08-21 — Reconciled existing merged implementation rather than duplicating it. PR #24 merge `cfd41006e924664f4f3fb2c3feb5dce09551822b` and implementation `ca25bdc6aafd8482fb0885438b6277d97e80fa8b` are reachable from merged `main` HEAD `1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5`; fresh branch `gui-016-dispatch-task-picker` has no source diff.
- 2026-08-21 — `npm run test -w @kanmer/core -- src/prompts.test.ts`: 8/8 PASS. `npm run test -w @kanmer/gui -- src/main/dispatch.test.ts`: 2/2 PASS. GUI typecheck and build passed. Root `npm run plugin:build` and `npm run plugin:check` passed (34 tools, bundle bytes match).
- 2026-08-21 — No live agent CLI was spawned and no interactive three-level keyboard/menu session was available; this handoff relies on the merged source plus deterministic tests and build checks. End-to-end provider execution remains unclaimed.

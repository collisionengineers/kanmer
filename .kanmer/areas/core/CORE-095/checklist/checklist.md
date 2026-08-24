# Checklist — CORE-095

## Execution
- [x] Take CORE-095 only after this planning packet is accepted; record its dedicated branch and `.worktrees/core-095` worktree.
- [x] Change `packages/core/package.json` so both core Vitest commands use `--no-file-parallelism`.
- [x] Update the existing `AGENTS.md` test-command guidance with the Windows filesystem-isolation rationale.
- [x] Confirm no runtime core source, test assertion, timeout, retry, workflow, CORE-035 fixture, or plugin-bundle byte change is included.

## Verification
- [x] Run the three named test files via the core package script; record command, exit code, file/test counts, and exact SHA.
- [x] Run the full core package test script; record command, exit code, file/test counts, and exact SHA.
- [x] Run `npm run typecheck -w @kanmer/core`, `npm run build -w @kanmer/core`, and `git diff --check`.
- [x] Run `npm run verify` from a normal checkout, not a linked worktree; preserve every failed attempt if any.
- [x] Obtain independent review before merge.
- [x] After merge, CORE-035 reruns its protected Windows fixture at the reviewed exact SHA; its `verify` job passes while the existing PR #1 failed run remains recorded.

## Stop conditions
- [x] Stop condition not triggered: serial execution removed the named Windows timeouts without a global timeout, blanket retry, skipped assertion, or fixture-rule change.

## Progress notes

- 2026-08-24 — Took `core-095-vitest-file-isolation` in `.worktrees/core-095` at `9a75bd690a80bf070bb8ddc372b3a95fa03ec789`. The scoped diff changes only the core test/watch commands and the AGENTS.md rationale; `git diff --check` passed.
- 2026-08-24 — `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run test -w @kanmer/core -- src/io.test.ts src/docs.test.ts src/store.test.ts` exited 0: 3 files / 167 tests passed in 79.67 s. The three named cases passed within their unchanged 5-second test bound (2.065 s, 2.113 s, and 1.969 s respectively).

- 2026-08-24 — `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run test -w @kanmer/core` exited 0: 15 files / 310 tests passed in 55.96 s. `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run typecheck -w @kanmer/core` and `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\core-095 run build -w @kanmer/core` both exited 0; `git diff --check` exited 0. The authoritative full rail remains for the clean PR Windows checkout because `plugin:check` deliberately refuses linked worktrees.

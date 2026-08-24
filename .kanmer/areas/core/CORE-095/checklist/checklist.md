# Checklist — CORE-095

## Execution
- [ ] Take CORE-095 only after this planning packet is accepted; record its dedicated branch and `.worktrees/core-095` worktree.
- [ ] Change `packages/core/package.json` so both core Vitest commands use `--no-file-parallelism`.
- [ ] Update the existing `AGENTS.md` test-command guidance with the Windows filesystem-isolation rationale.
- [ ] Confirm no runtime core source, test assertion, timeout, retry, workflow, CORE-035 fixture, or plugin-bundle byte change is included.

## Verification
- [ ] Run the three named test files via the core package script; record command, exit code, file/test counts, and exact SHA.
- [ ] Run the full core package test script; record command, exit code, file/test counts, and exact SHA.
- [ ] Run `npm run typecheck -w @kanmer/core`, `npm run build -w @kanmer/core`, and `git diff --check`.
- [ ] Run `npm run verify` from a normal checkout, not a linked worktree; preserve every failed attempt if any.
- [ ] Obtain independent review before merge.
- [ ] After merge, CORE-035 reruns its protected Windows fixture at the reviewed exact SHA; its `verify` job passes while the existing PR #1 failed run remains recorded.

## Stop conditions
- [ ] Stop and report if disabling file parallelism does not remove the named Windows timeout; do not mask it with a global timeout, blanket retry, skipped assertion, or fixture-rule change.

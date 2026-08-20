# Proof — GUI-085

## Merged result

- PR: https://github.com/collisionengineers/kanmer/pull/88
- PR state: `MERGED` at 2026-08-20T23:07:04Z.
- Merge commit: `7f1e150846bd5fa93d9c01594ca8af99d60db5ea`.
- Verification checkout: the main repository checkout on `main`, fast-forwarded to the merge commit.
- Merged source scope: exactly `apps/gui/src/main/kanmerGit.test.ts`; `git diff --check 23c42e0...HEAD` passed.

## Merged-main GUI evidence

| Command | Result |
| --- | --- |
| `npm --workspace apps/gui test -- kanmerGit.test.ts` (run 1) | 12/12 passed. File tests: 28.16 s; no individual case reached the 30 s scoped bound. |
| Same target command (run 2) | 12/12 passed. File tests: 27.75 s; no individual case reached the 30 s scoped bound. |
| `npm --workspace apps/gui test` | 29 test files / 296 tests passed. `kanmerGit.test.ts`: 12/12 passed, 29.80 s test time; slowest case 6.95 s, below the scoped 30 s bound. |
| `git diff --check 23c42e0...HEAD` | Passed; no whitespace errors. |
| `git diff --name-only 23c42e0...HEAD` | Exactly one path: `apps/gui/src/main/kanmerGit.test.ts`. |

## Accurately unavailable or non-passing rails

- Root `npm run typecheck` was run and failed in the pre-existing `@kanmer/ui` `packages/ui/src/demo.tsx:622` fixture: its `TicketDocsInfo` result lacks required `documentPaths`. This is outside the one-file GUI test diff; the command is **not** claimed green.
- Root `npm run verify` is absent from the current root package scripts, so no substitute was invented.
- A complete root `npm test` result and GitHub Windows PR-job evidence are not claimed by this proof. The PR reported no GitHub status checks.
- The six checklist exceptions remain accurate: no new diagnostics redesign; no independently identified path-with-spaces case was claimed; unavailable shared/external rails remain unchecked.

## Result

The merged suite keeps real local Git/worktree coverage and applies the bounded 30-second timeout only to those integration tests. Two complete target runs and the complete GUI suite pass on main; no retry, sleep, skip, global timeout, or production Git behavior change was introduced.

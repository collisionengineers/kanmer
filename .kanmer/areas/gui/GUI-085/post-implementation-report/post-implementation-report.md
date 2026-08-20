# Post-implementation report — GUI-085

## Outcome

Scoped a named `REAL_GIT_TEST_TIMEOUT_MS = 30_000` to the 12 real-Git cases in `kanmerGit.test.ts`. The GUI/global Vitest default remains unchanged; production Git code is unchanged. The local fixture also sets `GIT_TERMINAL_PROMPT=0` so a regression cannot block on credentials.

## Evidence

- Ten consecutive serial target-file runs: 120/120 tests passed. Slowest observed individual test was 4.43 s.
- Full GUI suite with one worker: 29 files / 296 tests passed. Under full-suite load, slowest real-Git test was 13.28 s, below the 30 s bound.
- `npm run typecheck --workspace @kanmer/gui` — pass.
- `git diff --check` — pass.
- Root typecheck remains blocked by the pre-existing `packages/ui/src/demo.tsx` missing `TicketDocsInfo.documentPaths` fixture; GUI typecheck passes.
- Root `npm run verify` is absent, so no substitute command was invented.
- GitHub PR jobs and two post-PR Windows passes remain external CI evidence for review; no retry/sleep/skip was added.

## Scope

Only `apps/gui/src/main/kanmerGit.test.ts` changed. The tests continue to use unique OS-temp repositories, local bare remotes, direct Git argument arrays, repository-local identity, and existing cleanup.

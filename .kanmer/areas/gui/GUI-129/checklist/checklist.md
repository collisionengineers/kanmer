# Checklist — GUI-129

- [x] [pre-review] Run and record the focused baseline settings test in the dedicated worktree.
- [x] [pre-review] Add the bounded Windows-only transient rename retry helper and wire `writeSettings` through it.
- [x] [pre-review] Preserve the temporary-write then rename atomicity and final error propagation.
- [x] [pre-review] Isolate the settings test fixture root and add deterministic recovery, retry-bound, non-retry, persistent-error, and success-cleanup coverage.
- [x] [pre-review] Run the focused settings tests repeatedly and record every exit.
- [x] [pre-review] Run GUI typecheck and the applicable root verification rail without weakening assertions.
- [ ] [pre-review] Write the post-implementation report, commit, push, and open a PR with `Kanmer: GUI-129`.
- [ ] [pre-review] Stop in Review for independent review; do not self-review or merge.
- [ ] [post-merge] On merged main, rerun the focused settings test and an applicable verification rail; record evidence in proof.

## Progress notes

- 2026-08-24 — Planning used `origin/main` `9a75bd690a80bf070bb8ddc372b3a95fa03ec789`; no real Windows file lock was fabricated during research.
- 2026-08-24 — Corrected isolated baseline: a normal disposable checkout at `9a75bd690a80bf070bb8ddc372b3a95fa03ec789` ran `npm --prefix <clone> ci --ignore-scripts --no-audit --no-fund`, `npm --prefix <clone> run build -w @kanmer/core`, then the focused settings command: exit 0, 5/5.
- 2026-08-24 — Authoritative ticket-worktree rail used `npm --prefix C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\gui-129`: `ci --ignore-scripts` 0; core build 0; focused settings tests 11/11 passed three consecutive runs (all exit 0); GUI typecheck 0; GUI production build 0.
- 2026-08-24 — Full normal-checkout `npm run verify` at `49807c28` reached Core 310/310 and GUI settings 11/11 but failed one unrelated `index.sync.test.ts` cleanup hook at 10,000 ms, then did not exit and was interrupted (exit 1). It remains recorded in `scratch/execute`, not erased. The exact named suite was rerun from the isolated ticket worktree and passed 11/11, exit 0, in 102.73 seconds. No assertion was weakened.

# Checklist — GUI-129

- [x] [pre-review] Run and record the focused baseline settings test in the dedicated worktree.
- [x] [pre-review] Add the bounded Windows-only transient rename retry helper and wire `writeSettings` through it.
- [x] [pre-review] Preserve the temporary-write then rename atomicity and final error propagation.
- [x] [pre-review] Isolate the settings test fixture root and add deterministic recovery, retry-bound, non-retry, persistent-error, and success-cleanup coverage.
- [x] [pre-review] Run the focused settings tests repeatedly and record every exit.
- [x] [pre-review] Run GUI typecheck, GUI production build, and the authoritative full verification without weakening assertions.
- [x] [pre-review] Rebase onto current `origin/main`, write the post-implementation report, commit, push, and open PR #241 with `Kanmer: GUI-129`.
- [ ] [pre-review] Stop in Review for independent review; do not self-review or merge.
- [ ] [post-merge] On merged main, rerun the focused settings test and an applicable verification rail; record evidence in proof.

## Progress notes

- 2026-08-24 — Planning used `origin/main` `9a75bd690a80bf070bb8ddc372b3a95fa03ec789`; no real Windows file lock was fabricated during research.
- 2026-08-24 — Corrected isolated baseline: a normal disposable checkout at `9a75bd690a80bf070bb8ddc372b3a95fa03ec789` ran `npm --prefix <clone> ci --ignore-scripts --no-audit --no-fund`, `npm --prefix <clone> run build -w @kanmer/core`, then the focused settings command: exit 0, 5/5.
- 2026-08-24 — Prior bare-`npm` worktree results are setup-contaminated because npm could resolve the parent checkout. They are retained only as observations; authoritative worktree commands use an absolute `npm --prefix <worktree>`.
- 2026-08-24 — Full normal-checkout `npm run verify` at predecessor `49807c28` reached Core 310/310 and GUI settings 11/11 but failed one unrelated `index.sync.test.ts` cleanup hook at 10,000 ms, then did not exit and was interrupted (exit 1). It remains recorded in `scratch/execute`; no assertion was weakened. The exact named suite later passed 11/11 in isolation.
- 2026-08-24 — Rebased GUI-129 to `cfac84a8cc45876f8d3d517d3d6573d0c6fb8ff0` on current `origin/main`. In its isolated worktree, `ci --ignore-scripts` and core build exited 0; focused settings tests passed 11/11 three times; GUI typecheck and production build both exited 0.
- 2026-08-24 — Final authoritative evidence used a fresh genuine GitHub-origin normal clone at exactly `cfac84a8`, with `npm --prefix <absolute-clone> ci --ignore-scripts` then `npm --prefix <absolute-clone> run verify`. Both exited 0; Core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 98/98. No other GUI full-test rail was running before it started, and no clone-owned Node process remained afterward.

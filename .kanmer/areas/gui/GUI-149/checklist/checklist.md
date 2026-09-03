# Checklist — GUI-149

- [x] Step 1 — `PORTABLE_LAUNCHER_*` constants with `CODEX_PORTABLE_*` aliases; `portableLauncherInvocation()`; `connectIgnoreEntries()`; providers tests green
- [x] Step 2 — `serverInvocation()` portable for codex/claude/opencode; `installedElectronInvocation` deleted; probe gates all three; Claude approval note; connect tests green
- [x] Step 3 — `gitIgnore.ts` shared helper; `ensureConnectIgnore` after registration and in reconcile; gitignore tests (once, not twice, not without `.git`)
- [x] Step 4 — `isLegacyLauncherDescriptor` + `registrationRows` wiring for `.mcp.json`/`opencode.json`; core staleness tests green
- [x] Step 5 — FRD-012 R1/R1c/R1e/R7, AGENTS.md §8 gotcha, `.gitignore` comment, `docs/manual/connect.md`
- [ ] [pre-review] `npm run verify` exit 0; no weakened assertions
- [ ] [pre-review] Post-implementation report written; PR opened with `Kanmer: GUI-149`; stop at the boundary
- [ ] [post-merge] Real-host acceptance (scratch repo Connect ×3, `git status`, `claude -p` get_status, staleness row) recorded in proof or marked INCONCLUSIVE naming the build that owes it

## Progress notes

- 2026-09-03: Steps 1-5 implemented in worktree `.worktrees/gui-149` (branch `GUI-149-portable-registrations`); providers/connect 128 tests and core staleness 56 tests green; full `npm run verify` in progress.

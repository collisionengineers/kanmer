# GUI-106 post-implementation report

## Outcome

Implemented the update-safe MCP runtime boundary without changing provider registration bytes, provider selection, board discovery, remote/tunnel behavior, MCP-015, GUI-101/102 integration, or the updater's existing live-session stop/refusal gate.

Fresh Windows installs now stage a byte-copied Electron-as-Node runtime (renamed kanmer-mcp.exe, icudtl.dat, v8_context_snapshot.bin) plus kanmer-mcp.cjs under the versioned per-user path %LOCALAPPDATA%\Kanmer\mcp\<version>\. A current junction is activated only after the staged executable and bundle are present. The fixed GUI-099 launcher still owns the registered path, preserves inherited cwd/std streams, --probe, no-argument launch, and exit propagation, prefers the complete external runtime, and falls back to the install-root payload for legacy/incomplete installations. Normal uninstall removes only the installer-owned external runtime root; update-time cleanup remains skipped so old runtime versions are not removed while an update is replacing the install.

The deterministic package/launcher rails now assert the external target, runtime prerequisites, junction activation markers, and owned cleanup. Session comments and release/governing docs distinguish legacy install-root sessions from external-runtime sessions. No provider configuration rewrite or new dependency was added.

## Traceability

- Branch/worktree: gui-106-runtime-boundary / .worktrees/gui-106
- Base: origin/main 241ff13e
- Commit: bd83b8a531bfa5e69b9879acc2ef51fe9e0b997c
- PR: #153 (https://github.com/collisionengineers/kanmer/pull/153)

## Checks and exact outcomes

- node --test scripts/kanmer-mcp-launcher.test.mjs — exit 0, 4/4.
- npm run test -w @kanmer/gui -- src/shared/mcp-sessions.test.ts src/main/mcp-sessions.test.ts — exit 0, 25/25.
- npm run build -w @kanmer/gui — exit 0.
- npm run typecheck -w @kanmer/gui — exit 0.
- First npm run test:scripts on the fresh worktree — exit 1: core dist was absent and the synthetic updater fixture lacked the new external markers; this first failure is retained. After npm run build:core and the fixture marker update, npm run test:scripts — exit 0, 82/82.
- npm run test -w @kanmer/gui — exit 0, 39 files / 360 tests.
- npm run dist:check — exit 0; Windows package built and updater package check 8/8.
- npm run typecheck — exit 0 for core, mcp-server, ui, and gui.
- npm run verify — exit 1 after core 266/266 and GUI 360/360: the unrelated MCP HTTP test project resolution fails before binding and leaves no listener timed out in child node spawn (ETIMEDOUT, 60/61). This failure is preserved; no assertion was weakened.
- Final focused launcher/package checks after the marker refinement — exit 0, 8/8; git diff --check — exit 0.

## Reviewer correction

Independent review found that the first amended implementation renamed staged Kanmer.exe to kanmer-mcp.exe but then checked current\Kanmer.exe, which would have aborted activation. The activation probe now checks current\kanmer-mcp.exe, and the launcher contract test asserts the post-rename path and rejects the stale check.

Rerun evidence after the correction: node --test scripts/kanmer-mcp-launcher.test.mjs scripts/check-updater-package.test.mjs exited 0 (8/8); npm run test:scripts exited 0 (82/82); npm run dist:check exited 0 and rebuilt the Windows package with updater package 8/8. Hosted PR verify rerun for head 0cdfafad PASSed: run 32551392188, job 96978620702, verify green in 2m20s. This is hosted deterministic verification only; real installed packaged-update/live-session/junction/uninstall evidence remains INCONCLUSIVE.

## Evidence boundaries

Deterministic source, static, build, package, focused, GUI, and type rails are PASS as listed. A real installed two-version update with a live MCP session, post-update tool call, registry/process census, junction behavior on the target filesystem, AV/SmartScreen behavior, and uninstall cleanup was not available in this environment. Those packaged-host acceptance claims remain INCONCLUSIVE and are not promoted to PASS; they remain explicitly parked in open-questions and the governing notes.

## Handoff

Checklist/report are complete for the author lane. After commit/PR traceability and a fresh gate readback, the ticket will move Implementing to Review only. Author will stop for independent review and will not merge, verify, or clean up the worktree.


## Review remediation F-002..F-005

The current head bd83b8a531bfa5e69b9879acc2ef51fe9e0b997c addresses the four substantive review findings without changing provider registration bytes or the existing legacy fallback:

- F-002 fixed pending independent re-review: the external runtime now preserves the packaged resource shape, with the script at <runtime>/resources/mcp/kanmer-mcp.cjs and skills at <runtime>/resources/plugins/kanmer/skills. This is the shape recognized by classifyBuild() and bundledSkillsDir().
- F-003 fixed pending independent re-review: post-activation pruning skips current, current.next, and the current version; stale version directories are removed best-effort, and locked live runtimes remain when Windows refuses recursive removal.
- F-004 fixed pending independent re-review: AGENTS.md gotchas 4 and 10 plus the updater/release wording now distinguish external-runtime sessions from legacy install-root sessions.
- F-005 fixed pending independent re-review: custom installer roots are rejected before staging when they equal, contain, or are contained by %LOCALAPPDATA%\Kanmer\mcp.

Additional verification after these changes: npm test exited 0 (core 266/266, GUI 360/360, MCP HTTP 61/61, scripts 82/82); npm run typecheck exited 0; npm run dist:check exited 0 (Windows package and updater package 8/8); focused launcher/package tests exited 0 (8/8). Hosted verification for this new head is recorded when the PR rerun completes.


## Hosted verification boundary for the remediation head

The implementation head remains bd83b8a531bfa5e69b9879acc2ef51fe9e0b997c. A source-free CI retrigger commit c18b5c046f74102c86ecc5f3bd514f6e687bbeb9 was pushed to PR #153 because GitHub emitted no pull_request check run for bd83b8a531bfa5e69b9879acc2ef51fe9e0b997c; PR #153 now points at c18b5c046f74102c86ecc5f3bd514f6e687bbeb9. The repository workflow has no workflow_dispatch trigger, and the attempted manual dispatch returned HTTP 422: Workflow does not have 'workflow_dispatch' trigger. GitHub reports zero check-runs for both bd83b8a531bfa5e69b9879acc2ef51fe9e0b997c and c18b5c046f74102c86ecc5f3bd514f6e687bbeb9, so no new hosted PASS or FAIL is claimed. The earlier hosted PASS for 0cdfafad0c8c9216779ceb442893e2256bdb65fd (run 32551392188, job 96978620702) remains historical evidence for the activation correction only. Real packaged-host update/session/junction/uninstall/AV evidence remains INCONCLUSIVE.

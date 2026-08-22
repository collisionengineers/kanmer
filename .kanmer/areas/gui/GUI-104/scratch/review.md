## Independent review — final head cad3552a

### What was checked

- PR #157 head `cad3552a0daeba34ea6eed8dae95280d19bec59d`; base `main` `0c5ed84ed0128aed6c8a60bec265a8dcb589061a`.
- Diff is scoped to the GUI-104 implementation, FRD-026, manual source/generated output, IPC/preload, Settings, and lifecycle tests: 11 changed files. No Cloudflare/provider registry changes are present.
- FRD-026 is added in the PR and linked on the ticket. Its R1–R7 contract is met by the reviewed surfaces except for the open findings below. External two-project/control-plane/listener proof remains correctly INCONCLUSIVE.
- Deterministic rails in the clean recorded `.worktrees/gui-104` at `cad3552a`: focused manager + Settings tests 6/6 PASS; `npm run typecheck -w @kanmer/gui` exit 0; root `npm run typecheck` exit 0; `npm run build -w @kanmer/gui` exit 0; `npm run check:manual` exit 0; full GUI vitest 41 files / 368 tests PASS; `git diff --check origin/main...HEAD` exit 0; changed-file scope matches PR.
- F-001 is fixed: `serverInvocation(...).env` is passed into both tunnel-client init and run, with assertions in the focused lifecycle test. Its outdated thread `PRRT_kwDOT2PEds6bXBB8` was resolved as fixed.
- F-002 is fixed: `closeProject` awaits `openAITunnel.closeProject` before watcher close/context deletion, and the focused lifecycle test proves the owned child exits and state becomes stopped.

### Current thread dispositions

All remaining threads below are current-head findings, not stale comments. Keep them unresolved or file/link follow-ups until addressed; none is not-applicable.

- `PRRT_kwDOT2PEds6bXBB_` — follow-up/blocking: first-save generation mismatch (`register` materializes `generation: ""`, while `saveProfile` normalizes it to `null` and rejects the UI's empty-string expected generation).
- `PRRT_kwDOT2PEds6bXBCB` — follow-up/blocking: saving unchanged/runtime metadata while a child runs rewrites status to stopped/disabled without stopping or preserving the live child.
- `PRRT_kwDOT2PEds6bXBCF` — follow-up/blocking: malformed/unreadable settings are treated as empty and then can be overwritten by `register`, risking loss of all stored profiles.
- `PRRT_kwDOT2PEds6bXBC H` — follow-up/non-blocking but must fix: successful initialize has no `EXECUTABLE_PRESENT` pass, so status reports the executable failed after init succeeded. (Thread id without the display space: `PRRT_kwDOT2PEds6bXBC H` is `PRRT_kwDOT2PEds6bXBC H`.)
- `PRRT_kwDOT2PEds6bXBCI` — follow-up/blocking: init/doctor children are local to `runCommand` and are not tracked by `closeAll`, so quit can orphan an owned command.
- `PRRT_kwDOT2PEds6bX BCK` — follow-up/blocking: Windows `taskkill` callback errors are discarded and stop/closeAll clear the child after timeout without surfacing unconfirmed termination. (Thread id without display spaces: `PRRT_kwDOT2PEds6bXCK`.)
- `PRRT_kwDOT2PEds6bXBCL` — follow-up: `canonicalProject` strips the separator from POSIX and drive-root paths, producing invalid root identities after reload.
- `PRRT_kwDOT2PEds6bXFOl` — follow-up/blocking: untouched default profiles reserve the same default health address/name and can reject a first real profile save across two projects.
- `PRRT_kwDOT2PEds6bXFOn` — follow-up/blocking: Initialize/Doctor/Restart remain enabled against persisted values while the visible draft is dirty, so actions can silently target an old profile/tunnel.
- `PRRT_kwDOT2PEds6bXFOp` — follow-up: identity/fingerprint changes have no reconciliation/removal path and strand old registrations after migration.
- `PRRT_kwDOT2PEds6bXFOr` — follow-up/blocking: a persistence failure leaves the new in-memory profile/generation installed, causing conflicts and possible later persistence of a failed save.

### Packet evidence mismatch

The post-implementation report and checklist still state that full GUI typecheck/build/vitest are INCONCLUSIVE or unchecked, but the final head reproduces all three as green (root typecheck, GUI build, 41-file/368-test GUI suite). Update the report/checklist to the exact final-head results; this is required for truthful traceability even though it does not change the source verdict.

### Verdict

NEEDS-CHANGES. F-001 and F-002 are fixed, but 11 current-head bot threads remain substantive and the packet evidence is stale. PR hosted checks are green, but merge must remain blocked until the thread findings are fixed or explicitly filed as follow-up tickets and the report/checklist are reconciled. No merge performed.

### Thread-ID correction

The exact identifiers for the two bullets whose display wrapping was ambiguous above are:

- Executable-ready initialization finding: `PRRT_kwDOT2PEds6bXBCH`.
- Windows process-tree termination finding: `PRRT_kwDOT2PEds6bXBCK`.

The complete remaining unresolved set is: `PRRT_kwDOT2PEds6bXBB_`, `PRRT_kwDOT2PEds6bXBCB`, `PRRT_kwDOT2PEds6bXBCF`, `PRRT_kwDOT2PEds6bXBCH`, `PRRT_kwDOT2PEds6bXBCI`, `PRRT_kwDOT2PEds6bXBCK`, `PRRT_kwDOT2PEds6bXBCL`, `PRRT_kwDOT2PEds6bXFOl`, `PRRT_kwDOT2PEds6bXFOn`, `PRRT_kwDOT2PEds6bXFOp`, and `PRRT_kwDOT2PEds6bXFOr`.


## Re-review — final head 37bb6644

- All eleven applicable findings from the cad3552 review were fixed with regression coverage. Focused 10/10, full GUI 41 files / 372 tests, root and GUI typecheck, GUI build, manual freshness, dist:check/updater 8/8, and diff-check PASS.
- PR #157 is awaiting fresh hosted verification on 37bb6644; no merge or cleanup yet.
- The two-project live control-plane/listener acceptance remains INCONCLUSIVE without disposable credentials and listener probes.
- Verdict: PASS pending hosted checks and fresh conversation resolution.

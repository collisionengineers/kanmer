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


## Final current-head disposition — 561d42f3

- Four additional review findings from the cad3552 re-review were fixed: canonical project-key normalization, custom credential binding via --control-plane-api-key-ref, valid apostrophes/backticks in absolute executable paths, and auto-start error reporting. Regression coverage and manual guidance were updated.
- Independent final review remains pending; hosted verify/kanmer-gate for this head are pending.

## Independent final review — GUI-104 PR #157

Requested head `37bb6644` was independently checked with focused 10/10 tests, full GUI 41 files/372 tests, GUI and root typechecks, GUI build, manual freshness, diff-check, and hosted verify/kanmer-gate evidence. That head remained NEEDS-CHANGES for five findings.

The branch advanced during review to `561d42f3`. Its follow-up fixes the custom credential reference passed to `init`, canonical project-key queue/record handling on Windows, apostrophe/backtick acceptance in absolute executable paths, and auto-start error propagation. Those four dispositions are fixed and their GitHub threads were resolved.

One blocker remains: persisted identity changes after an app restart are not detected. `register()` only reports `identityConflict` when an old record is already in the in-memory `records` map; after reload, it adds the new fingerprint/default profile while leaving the old persisted profile stranded. The reconcile/remove path therefore does not satisfy the migration-after-restart case (thread `PRRT_kwDOT2PEds6bXFOp`, unresolved).

Verdict: NEEDS-CHANGES pending persisted-registration identity reconciliation/removal. No merge or cleanup performed.


## Final re-review correction — a663a62f

- Fixed the restart-persisted-identity finding by detecting old project entries before register creates a new profile; added restart/reconcile regression coverage.
- Independent reviewer verdict was NEEDS-CHANGES only for this finding; it is now fixed. Await fresh hosted checks and final re-review.

## Independent final review — GUI-104 PR #157 head a663a62f

The single remaining finding `PRRT_kwDOT2PEds6bXFOp` is fixed. `register()` now canonicalizes the project path and checks persisted project entries for the same path under a different fingerprint before creating a new record. It returns `identityConflict`, preserving the explicit Settings reconcile/remove path. The added regression test creates a profile, instantiates a fresh manager (restart), detects the migrated identity, and successfully reconciles the profile.

All prior review threads are resolved. No additional source finding was identified in this bounded diff. Hosted verify and kanmer-gate for `a663a62f` were still in progress at review time; prior recorded local/hosted rails for the stack were green. Ticket frontmatter still records `cad3552a` rather than the final head and should be refreshed as bookkeeping.

Verdict: PASS for independent source review, pending hosted checks and commit traceability refresh. No merge or cleanup performed.

# Independent review — PR #157 final head 561d42f3

## Changes checked

The final PR changes the OpenAI tunnel manager/tests plus the generated/manual connect chapter. The implementation keeps the OpenAI Secure MCP Tunnel path separate from Cloudflare, persists non-secret profile metadata, carries the packaged invocation environment, supervises owned children, and preserves the explicit external two-project/control-plane acceptance boundary as INCONCLUSIVE.

## Prior review dispositions

GitHub exposes 16 inline findings: F-001 was the first environment-propagation finding; F-002–F-016 are the later 15 findings referred to by the final-head review request.

- F-001 Electron-as-Node environment: fixed in the prior follow-up; `init` and `run` merge invocation env and regression coverage asserts `ELECTRON_RUN_AS_NODE`.
- F-002 initial generation: fixed; empty default generation is compared as null and first save succeeds.
- F-003 running child on save: fixed; save rejects while an owned child is live.
- F-004 unreadable settings: fixed; only ENOENT creates empty state; malformed/other read errors surface.
- F-005 executable readiness: fixed; successful init emits EXECUTABLE_PRESENT=pass.
- F-006 init/doctor quit cleanup: fixed; command children are tracked and awaited by closeAll.
- F-007 Windows termination failures: fixed; taskkill/fallback and exit confirmation preserve/report failure.
- F-008 filesystem roots: fixed; POSIX and drive-root separators are preserved.
- F-009 incomplete defaults: fixed; only configured profiles reserve name/address resources.
- F-010 dirty drafts: fixed; Initialize/Doctor/Restart/Start are disabled until edits are saved.
- F-011 identity changes: fixed; explicit reconcile/remove path migrates or retires the old registration.
- F-012 persistence rollback: fixed; project/profile/status state is restored if writing fails.
- F-013 Windows project keys: fixed; canonical slash-normalized keys are used for persistence, queues, records, and views.
- F-014 custom credential name: fixed; init passes `--control-plane-api-key-ref env:<NAME>` and manual text matches.
- F-015 apostrophe/backtick executable paths: fixed; absolute argv paths permit these characters while rejecting controls/quotes/traversal.
- F-016 auto-start error status: fixed; resolved error statuses produce `ok:false`, retain diagnostics, and are logged.

All 16 GitHub review threads are resolved. No additional blocking finding was identified in the final diff.

## Evidence and verdict

- Final head: `561d42f3b0b987a156f409e987384d501d5e98ea`
- `git diff --check main...561d42f3`: PASS
- Focused manager + Settings tests: 12/12 PASS (ticket report)
- Ticket report also records full GUI 41 files/372 tests, root+GUI typecheck, GUI build, manual freshness, packaged updater 8/8, and diff-check PASS.
- Current hosted run `32559337159`: kanmer-gate PASS (job `96998404340`); verify was still RUNNING at review time (job `96998404249`).
- Real two-project OpenAI control-plane/listener proof remains INCONCLUSIVE as explicitly allowed by FRD-026 without disposable credentials/projects and a documented listener probe.

Verdict: PASS for the code/review-findings gate, contingent on the hosted verify job completing successfully. No merge performed.

## Hosted verify completion update

Run `32559337159` completed successfully after the initial note: kanmer-gate job `96998404340` PASS (50s) and verify job `96998404249` PASS (2m37s). The PASS verdict is now fully check-backed.

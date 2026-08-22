# Post-implementation report — GUI-104

## Delivered

- Added FRD-026 in the source PR; existing DOC-010-linked FRD-022/FRD-024 refs satisfy the current governing-doc gate.
- Added typed OpenAI Secure MCP Tunnel profile/status/doctor/lifecycle contracts across main, preload, and renderer IPC.
- Added app-global non-secret profile persistence keyed by project fingerprint, duplicate name/loopback address validation, environment-variable credential presence checks, canonical packaged stdio target construction, redacted child diagnostics, bounded command execution, owned process-tree cleanup, and update restart-required status.
- Added Settings → OpenAI tunnel with profile save, init, doctor, start, stop, restart, status and operator guidance; Cloudflare remote access remains a separate provider path.
- Updated the manual and generated chapter.

## Commits and PR

- Commit: a531a7c6ac4e2c00f24828e17fc174fc1af4ca0a
- PR: #157

## Verification

| Check | Result | Evidence |
|---|---|---|
| Focused manager + Settings tests | PASS | 6/6 tests |
| Renderer typecheck | PASS | npx tsc --noEmit -p apps/gui/tsconfig.web.json exit 0 |
| Manual freshness | PASS | npm run check:manual exit 0 |
| Diff whitespace | PASS | git diff --check exit 0 |
| Full GUI typecheck | INCONCLUSIVE | Existing baseline lacks dispatchDeliverableProven/verifyDeliverable exports and has antigravity provider type drift; exit 1 |
| Full GUI build | INCONCLUSIVE | Existing baseline Rollup failure on missing dispatchDeliverableProven export; exit 1 |
| Full GUI vitest | INCONCLUSIVE | 269/270 passed; existing dispatch/provider failures: 3 suites cannot load due missing antigravity, one assertion receives capability error first |
| Real two-project OpenAI control-plane/listener proof | INCONCLUSIVE | No disposable OpenAI credential/projects or documented listener probe; GUI deliberately does not rewrite health.listen_addr or claim live listener readiness |

## Scope and safety

No API-key value is persisted, logged, sent in IPC, or included in board documents. No Cloudflare, MCP-015, GUI-106, or unrelated dispatch/provider source was changed. External/manual packaged update and control-plane evidence remain INCONCLUSIVE.

## Review finding F-001 disposition

The canonical server invocation now propagates its non-secret environment into both tunnel-client `init` and `run` child processes. This preserves `ELECTRON_RUN_AS_NODE=1` for the packaged Electron-as-Node MCP target without persisting or logging the environment. Added spawn-environment assertions for both init and run; focused manager + Settings tests remain 6/6 PASS.

Updated source head: `fddcd9b4` (PR #157).

## Review finding F-002 disposition

Project close now invokes `OpenAITunnelManager.closeProject` before the watcher closes and the project context is deleted. The manager resolves the current profile generation and stops only the owned child for that project; absent profiles or children are a safe no-op. The focused lifecycle test proves project-close cleanup and stopped state. Focused manager + Settings tests remain 6/6 PASS; GUI typecheck and diff checks pass.

Updated source head: `cad3552a` (PR #157).


## Final-head remediation and verification — 2026-08-22

- Independent review of cad3552 identified eleven applicable lifecycle/persistence defects; all were fixed in 37bb6644. The fixes cover empty-generation first save, malformed settings read failures, running-child save protection, in-flight init/doctor tracking and quit cleanup, termination failure surfacing, filesystem-root preservation, incomplete-default uniqueness, dirty-draft action gating, identity reconciliation/removal, and persistence rollback.
- Added typed reconciliation/removal IPC and regression coverage.
- PASS: focused manager + Settings tests 10/10.
- PASS: full GUI vitest 41 files / 372 tests.
- PASS: root npm run typecheck; GUI typecheck; GUI build; npm run check:manual; npm run dist:check with updater package 8/8; git diff --check.
- PR #157 final head: 37bb6644. Hosted verify and kanmer-gate from the prior head passed; a fresh hosted run for 37bb6644 is required before merge.
- Real two-project OpenAI control-plane/listener proof remains INCONCLUSIVE without disposable credentials/projects and a documented listener probe; no live listener claim is made.


## Final current head — 2026-08-22

- Commit 561d42f3 is the current PR #157 head. It adds consistent canonical project keys, binds the configured credential environment name with tunnel-client control-plane API-key reference, permits valid apostrophes/backticks in absolute executable paths, and surfaces auto-start credential failures.
- Focused manager + Settings tests: 12/12 PASS. Root typecheck, GUI typecheck, GUI build, manual freshness, packaged updater 8/8, and diff-check remain PASS.
- Hosted verification for 561d42f3 is pending; merge remains gated on fresh checks and resolved review conversations.


## Independent re-review correction — 2026-08-22

- Independent review identified one remaining restart-path defect: persisted identity changes were not detected after manager restart, so reconcile was unavailable. Commit a663a62f detects an old persisted project identity before materializing a new default profile and the regression test proves restart → conflict → reconcile.
- Final deterministic focused suite: 13/13; GUI typecheck, manual freshness, and diff-check PASS. Fresh hosted verify and kanmer-gate for a663a62f are required before merge.

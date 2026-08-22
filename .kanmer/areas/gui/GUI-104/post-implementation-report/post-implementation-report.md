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

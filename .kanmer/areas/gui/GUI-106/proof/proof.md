---
result: PASS
verified_at: 2026-08-22T05:50:00Z
verified_on: b6c8eb02
pr: "153"
---

## Outcome

GUI-106 is verified on merged main commit b6c8eb02. The installer-owned external MCP runtime boundary, stable launcher, overlap rejection, stale-runtime pruning, legacy fallback, and existing update stop/refusal behavior pass deterministic and hosted verification. A real installed two-version Windows update with a live MCP session remains explicitly INCONCLUSIVE because no disposable Windows host was available.

## Rails

- Exact merge proof: merged PR #153 commit b6c8eb02.
- Hosted PR verification: run 32554392300, job 96986192019 — PASS.
- Detached merged-main GUI suite from the package workspace with verifier-local core resolution: 39 files / 362 tests PASS.
- Focused launcher/updater contract: 8/8 PASS.
- Detached GUI node/web typechecks: PASS.
- Author-reported Windows dist:check: PASS, updater package checks 8/8; all-workspace typecheck and scripts 83/83 PASS at the reconciled head.
- Diff checks: PASS.

## Review disposition

Independent review at head 1c91353b passed after fixing F-001 through F-005. The merge reconciliation preserved both MCP-015 native-plugin requirements and GUI-106 external-runtime requirements; current origin/main diff contains only GUI-106 files relative to merged main.

## Evidence boundaries

- Real packaged two-version update, active MCP session survival through install, registration validity after update, process/junction census, uninstall cleanup, and AV/SmartScreen behavior: INCONCLUSIVE (no disposable Windows host available).
- No capability is inferred from static launcher tests, hosted CI, or local package rails.

## Failed attempts retained

- A first detached GUI run resolved the shared core package through the normal checkout and produced the known stale-dist Antigravity/provider failure; rebuilding and resolving the verifier-local core package yielded the full 362/362 pass. The initial failure remains in the ticket report and was not erased.

---
kind: review-attestation
pr: "152"
head_sha: "dd83db295b5a836503c894fe4b38ea1ff7639266"
verdict: needs-changes
reviewer: "root"
independent: true
plan_hash: "34dfaaaaafac0d68"
ticket_updated: "2026-08-22T03:47:43.979Z"
findings:
  - id: F-001
    severity: major
    summary: "Antigravity disconnect no longer handles legacy project-state cleanup when the native plugin CLI is absent"
    disposition: open
---

## Review scope

Independently reviewed PR #152 against the MCP-015 plan, FRD-010, FRD-012, ADR-0009, the implementation report, and the complete diff. The native plugin descriptor, bound dispatch arguments, provider SSOT, and migration-oriented changes are in scope, but the current head is not mergeable.

## Finding F-001 — major — open

The hosted required `verify` check fails three existing `apps/gui/src/main/connect.test.ts` cases at lines 159, 308, and 503. Each fixture calls `disconnectAgent("antigravity", root)` with legacy `.agents` state and no installed/available `agy` plugin. The new provider route treats Antigravity as a native plugin and calls `agy plugin list`; on the hosted runner that command is unavailable, so `disconnectAgent` returns `ok: false` and the assertions fail. This is a real regression in the migration/disconnect surface covered by MCP-015, not an environment-only visual or provider acceptance gap.

The author must reconcile the legacy cleanup contract (for example, an explicit safe legacy-only cleanup path when native plugin state cannot be queried, or updated fixtures that provide the native lifecycle while preserving the required failure semantics) without weakening assertions or claiming uninstall success without proof. The exact hosted failure is retained in the ticket report/scratch, and the branch must rerun the required hosted rail on a new head.

## Other checks

PR diff scope otherwise matches the packet: native `mcp_config.json`, plugin metadata, `agy --add-dir` dispatch SSOT, UI/docs/manual updates, and deterministic focused evidence. The current hosted run reached 38/39 GUI files and 358/361 tests before the three failures; no merge, stage move, proof, release, or cleanup is authorized until F-001 is fixed and re-reviewed.

## Residual risk

Real authenticated Antigravity install/uninstall, bound `get_status`, unbound control, and IDE evidence remain INCONCLUSIVE as documented by the author; those boundaries must remain explicit after the fix.

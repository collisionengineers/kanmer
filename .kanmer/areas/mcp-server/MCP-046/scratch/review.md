---
kind: review-attestation
pr: "231"
head_sha: "ba8e11db230f14d52cdcba69ffd3d5837fecb922"
verdict: needs-changes
reviewer: "doc019_executor"
independent: true
plan_hash: "08d18d9d435084fe"
ticket_updated: "2026-08-23T13:25:01.212Z"
findings:
  - id: F-001
    severity: blocker
    summary: "GUI Connect used a different Antigravity argv than the shipped descriptor."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The changed Antigravity launcher convention was missing from AGENTS.md and FRD-012."
    disposition: fixed
  - id: F-003
    severity: blocker
    summary: "The quote-free launcher was unsafe when LOCALAPPDATA contained spaces."
    disposition: fixed
  - id: F-004
    severity: blocker
    summary: "The temporary pushd changed the provider cwd used for MCP board discovery."
    disposition: fixed
  - id: F-005
    severity: major
    summary: "ADR-0012's later GUI-106 consequence still says neither launcher path adds cd, contradicting the explicit cd /d KANMER_PROVIDER_CWD restoration exception and implementation."
    disposition: open
---

## Review scope

This independent review binds PR #231 to exact head `ba8e11db230f14d52cdcba69ffd3d5837fecb922`. The remediation now uses the quote-free delayed-expansion descriptor, captures `KANMER_PROVIDER_CWD`, and restores that directory before launching MCP. The Windows regression executes the shipped shim logic and proves both final CWD and provider marker remain the workspace. Codex remains on its separate quoted launcher contract.

## Checks and evidence

- `node --test scripts/antigravity-plugin-config.test.mjs`: PASS, 4/4.
- `node --test scripts/kanmer-mcp-launcher.test.mjs`: PASS, 4/4.
- GUI `connect.test.ts`: PASS, 35/35; providers tests: PASS, 66/66.
- `npm run plugin:check`: PASS; GUI typecheck: PASS; `git diff --check`: PASS.
- Hosted `kanmer-gate`: PASS. Hosted required `verify` on run 32642245657: PASS.
- The packet's real installed Antigravity proof is bounded and explicit: `KANMER_AGY_FINAL_PUSHDCALL_OK`; `--dangerously-skip-permissions` was used only to bypass the non-interactive permission prompt. The packet retains the unrelated full GUI Vitest EPERM/timeouts rather than hiding them.

## Findings and dispositions

- **F-001 — blocker, fixed (PR thread 3838509508).** GUI Connect, its validation path, and fixtures now derive the same delayed-expansion descriptor as the native package; Codex remains quoted.
- **F-002 — major, fixed (PR thread 3838509510).** AGENTS.md and FRD-012 document the host-specific quote-free form.
- **F-003 — blocker, fixed (PR thread 3838526763).** The spaced-LOCALAPPDATA regression passes using the quote-free pushd/call path.
- **F-004 — blocker, fixed.** The shipped shim restores `KANMER_PROVIDER_CWD` before Electron-as-Node, and the 4/4 Windows regression proves the final provider workspace CWD.
- **F-005 — major, open.** The new ADR-0012 consumer paragraph correctly allows only `cd /d` restoration of the captured provider cwd, but the later GUI-106 consequence still says “neither path adds ... `cd`.” Reconcile or remove that stale sentence so the governing ADR has one contract.

## Verdict

Needs changes. Runtime behavior, focused checks, governing references, and both hosted checks pass at this head, but ADR-0012 still contains one contradictory no-`cd` statement. The ticket remains in Review; no merge or move was performed.

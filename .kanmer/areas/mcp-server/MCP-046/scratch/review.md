---
kind: review-attestation
pr: "231"
head_sha: "999a3620ddfde5ace3d81811f28f935169037d3f"
verdict: needs-changes
reviewer: "doc019_executor"
independent: true
plan_hash: "08d18d9d435084fe"
ticket_updated: "2026-08-23T13:22:26.983Z"
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
    summary: "ADR-0012 still explicitly forbids cd in the installer launcher, while this remediation adds cd /d to restore KANMER_PROVIDER_CWD."
    disposition: open
  - id: F-006
    severity: blocker
    summary: "The current required hosted verify check is red on head 999a3620 because two core Vitest tests timed out."
    disposition: open
---

## Review scope

This independent review binds PR #231 to its live head `999a3620ddfde5ace3d81811f28f935169037d3f`, not the earlier requested `73d43465`, because the PR advanced during review. The implementation now uses the quote-free delayed-expansion descriptor, captures `KANMER_PROVIDER_CWD`, and the installer shim restores that directory before launching MCP. The new Windows regression executes the shipped shim logic and proves both the final CWD and provider marker remain the workspace. Codex remains on its separate quoted launcher contract.

## Checks and evidence

- `node --test scripts/antigravity-plugin-config.test.mjs`: PASS, 4/4.
- `node --test scripts/kanmer-mcp-launcher.test.mjs`: PASS, 4/4.
- GUI `connect.test.ts`: PASS, 35/35; providers tests: PASS, 66/66.
- `npm run plugin:check`: PASS; GUI typecheck: PASS; `git diff --check`: PASS.
- Hosted `kanmer-gate`: PASS. Hosted required `verify` on run 32642084134: FAIL because `packages/core` docs/store tests timed out; the prior green run was for the stale 73d43465 head and cannot satisfy this attestation.
- The packet's real installed Antigravity proof is bounded and explicit: `KANMER_AGY_FINAL_PUSHDCALL_OK`; `--dangerously-skip-permissions` was used only to bypass the non-interactive permission prompt. The packet also retains the unrelated full GUI Vitest EPERM/timeouts rather than hiding them.

## Findings and dispositions

- **F-001 — blocker, fixed (PR thread 3838509508).** GUI Connect, its validation path, and fixtures now derive the same delayed-expansion descriptor as the native package; Codex remains quoted.
- **F-002 — major, fixed (PR thread 3838509510).** AGENTS.md and FRD-012 document the host-specific quote-free form.
- **F-003 — blocker, fixed (PR thread 3838526763).** The spaced-LOCALAPPDATA regression passes using the quote-free pushd/call path.
- **F-004 — blocker, fixed.** The shipped shim now restores `KANMER_PROVIDER_CWD` before Electron-as-Node, and the 4/4 Windows config regression proves the final provider workspace CWD.
- **F-005 — major, open.** ADR-0012's consumer constraint still says the installer launcher “must not cd,” while `apps/gui/build/kanmer-mcp.cmd` now runs `cd /d "%KANMER_PROVIDER_CWD%"`. Update that governing contract to explicitly allow the temporary restoration mechanism, or redesign the launch so the literal constraint remains true.
- **F-006 — blocker, open.** The live required `verify` check is red on the reviewed head due unrelated core test timeouts. Re-run until the exact head has a green required rail before any pass or merge decision.

## Verdict

Needs changes. The F-004 runtime defect is fixed and independently exercised, but the current head has a red required hosted check and still conflicts with ADR-0012's explicit no-`cd` installer-launcher constraint. The ticket remains in Review; no merge or move was performed.

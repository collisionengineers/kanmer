---
kind: review-attestation
pr: "231"
head_sha: "fde73d67691f7b240b09dbb2958bd6defded4194"
verdict: needs-changes
reviewer: "doc019_executor"
independent: true
plan_hash: "08d18d9d435084fe"
ticket_updated: "2026-08-23T12:32:45.051Z"
findings:
  - id: F-001
    severity: blocker
    summary: "GUI Connect rejected the shipped unquoted descriptor because its Antigravity helper still emitted the old quoted argv."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The changed launcher convention was undocumented in AGENTS.md and FRD-012 still specified the quoted Antigravity argv."
    disposition: fixed
  - id: F-003
    severity: blocker
    summary: "The unquoted launcher token was not safe when LOCALAPPDATA expanded to a path containing whitespace."
    disposition: fixed
  - id: F-004
    severity: blocker
    summary: "The quote-free pushd/call command changes the launcher's inherited working directory to the installer bin, breaking board discovery from the provider workspace."
    disposition: open
---

## Changes reviewed

Final remediation `fde73d67` replaces the direct unquoted launcher with the quote-free `pushd %LOCALAPPDATA%\\Kanmer\\bin && call kanmer-mcp.cmd` form, updates the GUI Antigravity helper and lifecycle fixtures, retains Codex's separate quoted invocation, and updates the native descriptor, plugin-sync assertion, FRD-012, and AGENTS.md. It adds a Windows spaced-path regression and records the final bound agy proof.

## Acceptance and checks

- Antigravity Connect and the native descriptor use the quote-free pushd/call form; Codex remains quoted.
- `node --test scripts/antigravity-plugin-config.test.mjs`: PASS, 3/3, including the spaced-`LOCALAPPDATA` shim test.
- GUI `connect.test.ts`: PASS, 35/35; GUI typecheck: PASS.
- `npm run plugin:check`: PASS; `git diff --check`: PASS.
- Hosted checks are being rerun for this exact head; the current `verify` is pending and `kanmer-gate` is green, so no hosted full-rail PASS is claimed yet.
- The final real-host evidence is bounded and explicit: the bound agy run returned `KANMER_AGY_FINAL_PUSHDCALL_OK`; `--dangerously-skip-permissions` was used only for the non-interactive permission prompt, not to bypass the MCP/board assertion. The report honestly retains the failed full GUI rail.

## Findings and dispositions

- **F-001 — blocker, fixed (PR thread 3838509508).** The Antigravity helper, Connect validation path, and GUI fixtures now use the native descriptor form; Codex remains on its quoted contract.

- **F-002 — major, fixed (PR thread 3838509510).** `AGENTS.md` and FRD-012 now document the Antigravity-specific quote-free convention while preserving Codex's quoted registration.

- **F-003 — blocker, fixed (PR thread 3838526763).** The pushd/call command reaches a disposable shim under a spaced `LOCALAPPDATA` path, and the 3/3 regression covers that case.

- **F-004 — blocker, open.** `pushd %LOCALAPPDATA%\\Kanmer\\bin` changes `cmd.exe`'s current directory before calling the installer shim. The shim explicitly promises to inherit the caller's cwd, and the MCP server discovers the board by walking from `process.cwd()`; after pushd it will start from the installer bin rather than the provider workspace. The spaced-path shim regression only echoes a marker and does not test cwd or board discovery. Preserve both quote-free spaced-path safety and the original workspace cwd/std-stream contract, then add a regression proving `get_status` resolves the bound board.

## Verdict

Needs changes. The final remediation fixes the prior argv, documentation, and spaced-path findings, but the pushd workaround appears to break the load-bearing provider-cwd board-discovery contract.

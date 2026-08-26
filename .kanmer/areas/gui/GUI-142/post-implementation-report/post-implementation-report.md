# Post-implementation report

## Delivered
- Replaced the generated Windows Codex STDIO descriptor with a rootless PowerShell invocation using Join-Path and LOCALAPPDATA.
- Derived the launcher probe from the same descriptor, makes a missing/non-invocable launcher terminating, and preserves the launched shim's native exit status.
- Reconnect continues to overwrite the owned TOML registration; Windows staleness compares the complete canonical descriptor and reports the legacy cmd.exe form as behind without judging non-Windows registrations.
- Added Windows subprocess regression tests for exact generated argv/MCP handshake, non-zero launcher probes, and a missing launcher probe.
- Updated FRD-012, README, manual config example, provider tests, connection tests, core staleness tests, and committed plugin MCP bundle.

## Review dispositions
- REV-GUI142-001 fixed: the remote board now contains GUI-142; the required phase gate passes.
- REV-GUI142-002 fixed: probe status reaches Connect.
- REV-GUI142-003 fixed: FRD-012 R1e specifies the PowerShell contract.
- REV-GUI142-004 fixed: descriptor staleness is Windows-only.
- REV-GUI142-005 fixed: the copy fallback quotes its PowerShell payload and complete command/args matching replaces token matching.
- REV-GUI142-006 fixed by commit 0b784d10: the probe applies `$ErrorActionPreference = 'Stop'`, so a missing launcher cannot masquerade as success.
- REV-GUI142-007 rejected with evidence: normal registered command against an exit-19 launcher exits non-zero through PowerShell, which is sufficient for Codex failure detection.

## Verification
- PASS: focused GUI tests (105 tests), including the real Windows missing-launcher and normal-argv MCP handshake checks.
- PASS: GUI typecheck.
- PASS: prior core staleness tests (43 tests).
- PASS: prior plugin build and plugin check (37 tools, bundle bytes and isolated handshake).
- PASS before correction set: packaged installer and updater-package checker (8 checks). Re-run after the correction commit before final review.
- INCONCLUSIVE/recorded: the prior full test invocation detached child test processes in this environment; focused suites above are authoritative for this change.

## Handoff
Push commit 0b784d10, wait for required PR CI, then request a fresh independent review.

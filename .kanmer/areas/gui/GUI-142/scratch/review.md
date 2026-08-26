---
kind: review-attestation
pr: "281"
head_sha: "0b784d100f77ceebce05bbdeed0b0289e9d0d3bb"
verdict: needs-changes
reviewer: "independent-reviewer-gpt-5.6"
independent: true
plan_hash: "dbf90ad24d76b31b"
ticket_updated: "2026-08-26T11:36:17.443Z"
findings:
  - id: F-001
    severity: blocker
    summary: "The Kanmer CI gate could not find GUI-142 on the remote board."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The probe did not propagate a non-zero launcher exit status."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "FRD-012 contradicted the PowerShell registration contract."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Windows descriptor staleness created non-Windows false positives."
    disposition: fixed
  - id: F-005
    severity: minor
    summary: "The copy fallback was unquoted and staleness only token-matched the command."
    disposition: fixed
  - id: F-006
    severity: major
    summary: "A missing or non-invocable launcher still made the probe report success."
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "The production invocation does not explicitly propagate the native launcher exit code."
    disposition: rejected-with-reason
    reason: "A direct Windows execution of the registered command against a launcher exiting 19 made powershell.exe exit non-zero (1). Codex only requires a non-zero process result to detect failure; preserving the exact native exit value is not a ticket requirement."
  - id: F-008
    severity: minor
    summary: "The copied PowerShell fallback expands its script payload in the caller shell before the child process receives it."
    disposition: open
  - id: F-009
    severity: minor
    summary: "Windows staleness interprets a TOML args array as JSON, rejecting valid TOML formatting."
    disposition: open
---

# Independent review

Reviewed PR #281 at `0b784d100f77ceebce05bbdeed0b0289e9d0d3bb`, ticket GUI-142 at `2026-08-26T11:36:17.443Z`, and plan version `dbf90ad24d76b31b`.

## Evidence

- Required GitHub Actions run `32963932348` is green: `kanmer-gate` and `verify` both succeeded at the reviewed head.
- The final remediation adds `$ErrorActionPreference = 'Stop'` before the probe invocation, updates FRD-012 and user documentation, and adds a Windows test for the missing-launcher failure case. I independently ran the focused GUI suites: 105 tests passed, including the real Node-to-PowerShell boundary, non-zero shim, missing launcher, and MCP handshake tests.
- I directly executed the final probe against a temporary missing `%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd`; it now terminates with a non-zero exit (`1`). This fixes F-006.
- All prior review threads were gathered and dispositioned below. Two new non-outdated GitHub findings remain open: the copyable fallback uses expandable outer double quotes, and descriptor staleness parses a valid TOML array through `JSON.parse`.

## Findings and dispositions

1. `F-001` — fixed. The synchronized board allows the required Kanmer gate to pass.
2. `F-002` — fixed. The probe preserves a launched shim's non-zero result.
3. `F-003` — fixed. FRD-012 and generated registration agree on the portable PowerShell contract.
4. `F-004` — fixed. Windows-only descriptor staleness does not judge non-Windows registrations.
5. `F-005` — fixed in part. The command payload is now bounded for argv, and the command/args comparison is stricter; F-008 and F-009 record the remaining correctness defects.
6. `F-006` — fixed. `$ErrorActionPreference = 'Stop'` turns a non-invocable launcher into a failed pre-write probe, with execution-level Windows coverage.
7. `F-007` — rejected with reason. The normal registration exits non-zero for a non-zero launcher result, which is sufficient for Codex failure detection.
8. `F-008` — minor, open. Render the copyable `-Command` payload so an outer PowerShell shell passes it literally. The current double quotes expand `$ErrorActionPreference`, `$env:LOCALAPPDATA`, and `$LASTEXITCODE` before launching the child, producing an invalid or environment-pinned command.
9. `F-009` — minor, open. Parse the Kanmer table as TOML (or otherwise accept TOML-valid arrays) before comparing its values. A semantically identical registration using a trailing comma or inline comment is valid TOML but fails `JSON.parse`, yielding a permanent false `behind` warning on Windows.

## Residual risk

The transport launch repair is now failure-safe, but the UI's copy-on-failure route can give users a malformed command and staleness can misreport valid configuration drift. These defects are bounded and do not justify a merge while the review record has open findings.

## Decision

Needs changes. No merge performed; GUI-142 remains in Review. A new independent attestation is required after F-008 and F-009 are resolved and CI is green on the resulting head.

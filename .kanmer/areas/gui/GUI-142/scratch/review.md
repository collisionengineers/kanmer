---
kind: review-attestation
pr: "281"
head_sha: "bb4702511a8c5d9eb0b7df56721c15e7b2b33898"
verdict: needs-changes
reviewer: "independent-reviewer-gpt-5.6"
independent: true
plan_hash: "dbf90ad24d76b31b"
ticket_updated: "2026-08-26T11:47:27.076Z"
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
    summary: "The copied PowerShell fallback expanded its script payload in the caller shell."
    disposition: fixed
  - id: F-009
    severity: minor
    summary: "Windows staleness interpreted a TOML args array as JSON."
    disposition: fixed
  - id: F-010
    severity: minor
    summary: "The legacy Windows descriptor test fails on non-Windows platforms."
    disposition: open
  - id: F-011
    severity: major
    summary: "The canonical Codex argument contract is duplicated between GUI and core."
    disposition: open
---

# Independent review

Reviewed PR #281 at `bb4702511a8c5d9eb0b7df56721c15e7b2b33898`, ticket GUI-142 at `2026-08-26T11:47:27.076Z`, and plan version `dbf90ad24d76b31b`.

## Evidence

- Required GitHub Actions run `32965528003` is green: `kanmer-gate` and `verify` succeeded at the reviewed head.
- I independently ran the focused GUI suite (105 passed), core staleness suite (44 passed on Windows), and `npm run plugin:check`. Plugin synchronization passed: 37 tools match, bundle bytes match, skill manifests parse, and the isolated MCP handshake lists 37 tools.
- The fallback now uses a single-quoted, correctly escaped PowerShell script payload. I pasted the emitted command into PowerShell; it returned `Kanmer MCP launcher: healthy` with exit `0`, without caller-shell expansion.
- The narrow TOML parser accepts the reviewed trailing-comma and inline-comment canonical registration case, so F-008 and F-009 are fixed.
- All review threads were gathered. Two new non-outdated findings remain and are recorded below.

## Findings and dispositions

1. `F-001` through `F-006` — fixed as documented in the preceding independent attestations.
2. `F-007` — rejected with reason: non-zero launch failure remains visible to Codex.
3. `F-008` — fixed: literal single-quote rendering prevents caller-shell variable expansion; focused execution evidence passed.
4. `F-009` — fixed: the parser now accepts the relevant TOML comments and trailing comma; core test passed.
5. `F-010` — minor, open. `registrationRows` emits the legacy descriptor row only on Windows, while the corresponding test currently asserts it unconditionally. Gate that assertion to Windows or test the platform-independent helper directly so the normal core suite passes on supported Linux/macOS development environments.
6. `F-011` — major, open. The exact canonical PowerShell argv exists as literals in both GUI provider code and core staleness detection. Move the portable descriptor contract into a shared core export and consume it from the GUI, so a future change cannot silently make newly generated registrations appear stale.

## Residual risk

The concrete Windows behavior and plugin artifact are now proven, but merging with duplicated canonical command data violates the repository's one-list-per-concept rule and leaves a cross-platform test failure.

## Decision

Needs changes. No merge performed; GUI-142 remains in Review. Re-review is required after F-010 and F-011 are resolved and all required checks are green at the resulting head.

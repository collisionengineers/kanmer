---
kind: review-attestation
pr: "281"
head_sha: "9be994ec7d6c6c63f6093e7ada1b30237feb4919"
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
    summary: "The copied fallback was unsafe and staleness did not compare the complete command contract."
    disposition: fixed
  - id: F-006
    severity: major
    summary: "A missing or non-invocable launcher could make the probe report success."
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "The production invocation does not explicitly return the native launcher exit value."
    disposition: rejected-with-reason
    reason: "A direct Windows execution against an exit-19 launcher returns a non-zero PowerShell result, which is sufficient for Codex to surface process failure; exact native exit-value preservation is outside this ticket's requirement."
  - id: F-008
    severity: minor
    summary: "The copied PowerShell fallback expanded its script payload in the caller shell."
    disposition: fixed
  - id: F-009
    severity: minor
    summary: "Windows staleness interpreted TOML args as JSON and rejected valid inline comments or trailing commas."
    disposition: fixed
  - id: F-010
    severity: minor
    summary: "The legacy-descriptor test failed on non-Windows platforms."
    disposition: fixed
  - id: F-011
    severity: major
    summary: "The canonical Codex argument contract was duplicated between GUI and core."
    disposition: fixed
  - id: F-012
    severity: minor
    summary: "A TOML-valid trailing comment on the Kanmer table header bypasses the registration-staleness verdict."
    disposition: open
---

# Independent review

Reviewed PR #281 at head 9be994ec7d6c6c63f6093e7ada1b30237feb4919, GUI-142 ticket revision 2026-08-26T11:47:27.076Z, and plan version dbf90ad24d76b31b.

## Evidence

- The current GitHub pull request is open at the recorded head. Its required kanmer-gate and verify checks from run 32967405178 are both SUCCESS. The verification job ran the full npm test command, plugin synchronization check, and authoritative verification rail.
- I independently ran the focused GUI suite: 105 tests passed, including the normal-argv Windows MCP handshake, non-zero launcher probe, and missing launcher probe. The Core staleness suite passed 44 tests.
- I independently built the current Windows installer at this head and ran the updater artifact checker: updater package OK, 8 checks.
- The current source imports the shared CODEX_PORTABLE_ARGS and CODEX_PORTABLE_COMMAND values from Core in GUI providers; the previous duplicated-contract concern is fixed.
- GitHub has 13 inline review threads: 12 are outdated after their fixes and have the dispositions above; one non-outdated unresolved thread remains. There are no top-level PR comments. The generic Codex review submissions are comments only and add no undispositioned finding.

## Current finding

F-012 corresponds to GitHub review comment 3862607379. The finding is valid. Both kanmerRootIn and isCurrentCodexRegistration find the Kanmer TOML table with an exact header regular expression. A valid header such as [mcp_servers.kanmer] followed by a trailing TOML comment therefore returns no table. For a legacy cmd.exe entry, registrationRows sees null rather than false and fails to present stale-registration/reconnect guidance. The same header form also prevents the existing root extractor from inspecting an explicit root.

## Required remediation

1. Create one narrow helper that locates the mcp_servers.kanmer table while accepting legal trailing header comments and CRLF input; use it for both the root extractor and current-registration comparison so they cannot diverge.
2. Preserve the existing narrow string-array parser and complete argv comparison. No dependency or broader configuration rewrite is needed.
3. Add Core regressions for a canonical PowerShell entry with a commented header, a legacy cmd.exe entry with a commented header that is reported behind on Windows, and a commented-header explicit-root entry. Cover CRLF where practical.
4. Run the focused Core suite, full PR CI, and plugin synchronization. Update the implementation report and request a fresh independent review at the new head.

## Decision

Needs changes. This is a bounded minor correctness issue, but the working tree deliberately detects and guides remediation for stale Windows registrations; a supported TOML syntax must not bypass that detection. No code was changed and no merge was performed.

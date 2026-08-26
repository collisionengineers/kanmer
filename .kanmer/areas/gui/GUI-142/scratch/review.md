---
kind: review-attestation
pr: "281"
head_sha: "864fc7a6291580731019579303b927430603d422"
verdict: needs-changes
reviewer: "independent-reviewer-gpt-5.6"
independent: true
plan_hash: "dbf90ad24d76b31b"
ticket_updated: "2026-08-26T15:31:44.415Z"
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
    reason: "Direct Windows execution against an exit-19 launcher returns a non-zero PowerShell result, which is sufficient for Codex failure detection; exact native exit-value preservation is outside this ticket's requirement."
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
    summary: "A TOML-valid trailing comment on the Kanmer table header bypassed the registration-staleness verdict."
    disposition: fixed
  - id: F-013
    severity: major
    summary: "Required GitHub Actions checks have not run for the reviewed exact head."
    disposition: open
---

# Independent review

Reviewed GUI-142 / PR #281 at exact head `864fc7a6291580731019579303b927430603d422`, plan version `dbf90ad24d76b31b`, and ticket revision `2026-08-26T15:31:44.415Z`. I am an independently assigned reviewer, not the PR author.

## Source and acceptance review

- The 11-file / 369-line diff is within the ticket packet and FRD-012 R1e: GUI Connect emits the rootless portable PowerShell descriptor; its probe fails before config mutation on missing, spawn, timeout, or non-zero launcher outcomes; reconnection retains its owned-table scope; and stale Windows registrations are detected without judging non-Windows ones.
- The canonical command and argv are exported from Core and consumed by GUI Connect, avoiding a second contract copy. The narrow TOML table/array parser now accepts CRLF, legal header comments, a trailing command comment, and a single-quoted command scalar while continuing to compare the complete descriptor.
- I reviewed every GitHub inline thread. F-001 through F-012 have corresponding remediations in the reviewed head; the outdated threads remain unresolved in GitHub but are dispositioned here. F-007 is rejected with the documented, tested rationale above. There are no non-outdated source findings and no top-level PR comments.
- Independent local verification passed: `npm run test --workspace @kanmer/core` (315 tests), and `npm run test --workspace @kanmer/gui`; the latter included the four Windows launcher regressions: normal PowerShell boundary, non-zero probe, missing launcher, and normal-argv MCP initialize/tools handshake. The foreground test process was confirmed exited after completion.
- The report records current-head plugin synchronization and local NSIS/updater packaging evidence. The committed plugin MCP bundle is included in the diff.

## CI procedural blocker — F-013

This is **not a source or test failure**. GitHub Actions run `32985456805` for this exact head completed as failure before it created any jobs. Its job list is empty, so it did not run `kanmer-gate`, the verifier, or source tests. Three subsequent exact-head `pull_request` runs — `32985525425`, `32985586053`, and `32985658217` — were queued with no jobs at the final gather. PR statusCheckRollup consequently contains no required green checks.

The review verdict must therefore remain `needs-changes` under the repository rule that a required check may not be red, pending, or absent. The remediation is procedural: restore Actions scheduling/runner allocation and obtain a normal exact-head run with green `kanmer-gate` and `verify`; no code change is requested by this finding.

## Decision

The implementation is source-ready, but it is **not merge-ready** until F-013 is cleared by a successful required-check run for this unchanged SHA. No code was changed and no merge was performed.

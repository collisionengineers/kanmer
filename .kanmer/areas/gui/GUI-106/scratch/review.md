---
kind: review-attestation
pr: "153"
head_sha: "c18b5c046f74102c86ecc5f3bd514f6e687bbeb9"
verdict: pass
reviewer: "root"
independent: true
plan_hash: "9acd6aaeeab3d865"
ticket_updated: "2026-08-22T05:05:13.472Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Installer activation check used the pre-rename executable name"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "External MCP bundle path lost packaged build identity and bundled skills reference"
    disposition: fixed
  - id: F-003
    severity: minor
    summary: "Versioned external MCP runtimes accumulated across updates"
    disposition: fixed
  - id: F-004
    severity: major
    summary: "AGENTS.md gotchas described the old install-root runtime convention"
    disposition: fixed
  - id: F-005
    severity: major
    summary: "A selectable install directory could overlap the external runtime root"
    disposition: fixed
---

## Review scope

Independently reviewed PR #153 at current head c18b5c046f74102c86ecc5f3bd514f6e687bbeb9 against the GUI-106 plan, FRD-012, FRD-021, ADR-0012, the complete remediation diff from 0cdfafad, and all current GitHub review threads. The implementation commit is bd83b8a531bfa5e69b9879acc2ef51fe9e0b997c; c18b5c is source-free CI-retrigger metadata. The external runtime now retains the recognized packaged resources shape and bundled skills tree, prunes stale unlocked version directories while skipping current/current.next/current-version and tolerating locked live runtimes, updates AGENTS.md and governing updater language, and rejects equal/ancestor/descendant install roots before staging.

## Independent evidence

- Static launcher and updater package tests passed 8/8.
- Full GUI suite passed 39 files and 360/360 tests with file-parallelism disabled.
- All-workspace typecheck passed.
- Windows dist:check passed and updater package validation reported 8/8.
- git diff --check passed.
- The historical hosted PASS for the activation correction (0cdfafad, run 32551392188/job 96978620702) remains recorded. GitHub emitted no check-runs for bd83b8a or c18b5c, and workflow_dispatch is not configured (HTTP 422); this hosted rerun gap is explicitly INCONCLUSIVE and is not represented as a green result.
- Real packaged two-version update, live MCP session survival, junction/process census, uninstall, and AV/SmartScreen evidence remain INCONCLUSIVE because no disposable Windows host was available. No capability is inferred from static or local package rails.

All five current review findings are fixed in the implementation commit. The review passes the bounded source change with the hosted and real-host evidence limits explicitly retained for verification.

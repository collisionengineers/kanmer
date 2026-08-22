---
kind: review-attestation
pr: "153"
head_sha: "1c91353b61c55dbf9f57e0bb5f75a7d283abe2ef"
verdict: pass
reviewer: "root"
independent: true
plan_hash: "9acd6aaeeab3d865"
ticket_updated: "2026-08-22T05:28:54.250Z"
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

## Current-head independent review

Reviewed PR #153 at head 1c91353b61c55dbf9f57e0bb5f75a7d283abe2ef against the GUI-106 plan, FRD-012, FRD-021, ADR-0012, the full source diff, and the merge reconciliation. The implementation preserves the packaged external runtime shape, bundled skills path, stable launcher and legacy fallback, stale-runtime pruning, installer-root overlap rejection, and update stop/refusal behavior. The final merge reconciliation is limited to AGENTS.md and FRD-012 documentation; it retains both MCP-015 native-plugin requirements and GUI-106 external-runtime requirements. The diff from current origin/main 710bddff contains only GUI-106 files and no MCP-028 or prior-ticket source regression.

## Evidence

- Hosted PR verification PASS: run 32554392300/job 96986192019.
- Author rerun at the reconciled head: GUI 39 files / 362 tests, focused launcher/updater 8/8, scripts 83/83, all-workspace typecheck, Windows dist:check/updater package 8/8, and git diff checks PASS. The first stale-main-checkout 264/265 attempt remains retained in the ticket report; the rebuilt ticket-local core rerun passed.
- Independent source inspection confirms activation tests the post-rename kanmer-mcp.exe, the external bundle keeps resources/mcp and resources/plugins/kanmer/skills identity, stale runtime cleanup skips current/current.next/current-version and tolerates locked directories, and installer roots reject equal/ancestor/descendant overlap.
- Real packaged two-version update with a live MCP session, process/junction census, uninstall, and AV/SmartScreen evidence remains INCONCLUSIVE because no disposable Windows host was available. No capability is inferred from static or local package rails.

All five review findings are fixed; current head passes independent review. No merge is performed by the author lane.

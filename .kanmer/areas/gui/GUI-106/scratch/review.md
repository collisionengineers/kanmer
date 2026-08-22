---
kind: review-attestation
pr: "153"
head_sha: "0cdfafad0c8c9216779ceb442893e2256bdb65fd"
verdict: needs-changes
reviewer: "root"
independent: true
plan_hash: "9acd6aaeeab3d865"
ticket_updated: "2026-08-22T04:19:48.000Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Installer activation check used the pre-rename executable name"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "External MCP bundle path loses packaged build identity and bundled skills reference"
    disposition: open
  - id: F-003
    severity: minor
    summary: "Versioned external MCP runtimes accumulate across updates"
    disposition: open
  - id: F-004
    severity: major
    summary: "AGENTS.md gotchas still describe the old install-root runtime convention"
    disposition: open
  - id: F-005
    severity: major
    summary: "A selectable install directory can overlap the external runtime root"
    disposition: open
---

## Review scope

Independently reviewed PR #153 at head 0cdfafad0c8c9216779ceb442893e2256bdb65fd against the GUI-106 plan, FRD-012, FRD-021, ADR-0012, the complete diff, hosted verification, and the current GitHub review threads. Launcher/updater rails passed 8/8; the full GUI suite passed 39 files and 360 tests. The PR remains held because the fresh automated review identified four substantive current findings in addition to the corrected activation bug.

## Findings and dispositions

- F-001 fixed: installer.nsh now validates current\kanmer-mcp.exe, matching the staged rename and launcher path.
- F-002 open: the external script path is current\kanmer-mcp.cjs, which classifyBuild() reports as unknown and bundledSkillsDir() cannot map to the packaged skills tree. Preserve the recognized packaged shape or add a tested external identity/skills mapping.
- F-003 open: each update creates a versioned runtime directory and normal updates skip recursive cleanup, so obsolete unlocked versions accumulate. Retain live/locked versions but prune stale ones safely on a later install.
- F-004 open: AGENTS.md still contains old install-root assumptions in its updater/runtime gotchas; update the contributor source of truth in the same PR.
- F-005 open: a user-selectable install root may be LOCALAPPDATA\Kanmer or an ancestor, putting the supposed external runtime back under the installer blast radius. Reject overlapping roots or use a location guaranteed outside the install tree.

Hosted verification is green (run 32551392188, job 96978620702). Real installed update/session/junction/uninstall evidence remains INCONCLUSIVE and must stay explicitly recorded; no merge or stage move is authorized while F-002..F-005 remain open.

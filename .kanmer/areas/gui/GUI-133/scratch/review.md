---
kind: review-attestation
pr: "258"
head_sha: "ad426b5b237a21e1445e98ea15a7e2ef0e48c4cd"
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: "aa6a4303fb63ac49"
ticket_updated: "2026-08-25T03:28:53.596Z"
findings:
  - id: F-001
    severity: major
    summary: "Updater-parent detection preserves direct interactive replacement while retaining unattended updater behavior."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Collision-suffixed allocation prevents PID reuse from overwriting a retained runtime."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Canonical bidirectional overlap detection rejects install/runtime containment before copying."
    disposition: fixed
  - id: F-004
    severity: major
    summary: "An inaccessible legacy Kanmer process makes clearance inconclusive and refuses replacement."
    disposition: fixed
  - id: F-005
    severity: minor
    summary: "Process PowerShell/CIM calls have finite fail-closed timeouts."
    disposition: fixed
  - id: F-006
    severity: minor
    summary: "Installation no longer prunes prior immutable runtime generations."
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "The guard excludes its own installer PID from every process query."
    disposition: fixed
  - id: F-008
    severity: minor
    summary: "FRD-012 R1d governs the immutable generation and no-pruning contract."
    disposition: fixed
  - id: F-009
    severity: minor
    summary: "Inaccessible-path refusal is scoped to legacy Kanmer.exe and does not block elevated external kanmer-mcp.exe sessions."
    disposition: fixed
  - id: F-010
    severity: minor
    summary: "A legacy direct launch can race the final clearance snapshot before old-uninstaller rename."
    disposition: accepted-risk
    reason: "A launch barrier added now cannot govern already-installed binaries on the first upgrade; the repeated guard, app-side session stop, and external-launcher migration materially mitigate the observed failure without claiming atomic exclusion."
  - id: F-011
    severity: minor
    summary: "Activation-validation failure removes the invalid current junction and cleans the unactivated generation through the shared stage-failure path."
    disposition: fixed
---

# Independent final review — GUI-133 / PR #258

The exact head, complete packet, governing docs, required checks, reviews, comments, and all ten threads were re-gathered. Required checks passed, all threads are resolved, ten findings are fixed, and the one residual first-upgrade race is accepted with a concrete cross-version limitation and mitigation. The diff remains within GUI-133 scope.

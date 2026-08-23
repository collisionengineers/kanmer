---
kind: review-attestation
pr: "168"
head_sha: "b59fad2f819e38b686df439362a93d6bee588839"
base_sha: "fdaededcf8bff0c5d5867e386782d8bdc32324e9"
verdict: pass
reviewer: "codex-core041-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-23T01:28:00Z"
findings:
  - id: F-001
    summary: "Retry preserves the retained board root's handoff branch."
    severity: blocker
    disposition: fixed
    reason: "The production retry uses the retained paused status branch before consulting the saved setting, so a closed-project team-board handoff is not redirected to the protected default. The production-caller regressions pass."
  - id: F-002
    summary: "Protected closed-project refusal is represented as paused."
    severity: major
    disposition: fixed
    reason: "ensureBoardWorktree returns paused:true when renameBoardBranch refuses a protected default, preserving the visible canonical root and fail-closed Retry state. The protected refusal and custom-branch ignore-reconciliation fixtures pass."
  - id: F-003
    summary: "First observation of an existing custom branch prompts legacy native reconnect."
    severity: major
    disposition: fixed
    reason: "observeKanmerBoardBranch now marks both user-scoped native providers when a custom branch is first observed without a prior branch record, with a focused settings regression."
  - id: F-004
    summary: "Live protection/native/packaged proof remains unavailable."
    severity: minor
    disposition: accepted-risk
    reason: "No authorized live GitHub protection mutation or installed native/packaged host was available; no external PASS is claimed."
---

# Independent review — CORE-043 PR #168 exact head

Reviewed exact head `b59fad2f819e38b686df439362a93d6bee588839` against merged CORE-026 mainline `fdaededcf8bff0c5d5867e386782d8bdc32324e9`. The cumulative stack retains the project-declared source/board-sync and protected-branch/provider lifecycle changes and now covers first-observation migration of legacy custom-branch native descriptors.

Evidence: clean-worktree GUI typecheck passed; the protected retry/rename regressions passed; settings tests passed `5/5`; the prior complete GUI suite passed `49` files / `458` tests; `git diff --check` passed. Hosted run `32607263458` passed both `kanmer-gate` and `verify` for the preceding exact head; this additional migration fix requires a fresh hosted run.

Live GitHub protection mutation, installed native/provider runtime behavior, packaged runtime, and visual evidence remain INCONCLUSIVE under ADR-0016/FRD-020.

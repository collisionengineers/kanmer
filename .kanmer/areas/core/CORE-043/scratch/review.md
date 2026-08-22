---
kind: review-attestation
pr: "168"
head_sha: "11930038542d402865bb26a23787d7d3cad3e2c5"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-22T10:53:15.286Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Administrator handoff branch refresh is fixed in the cumulative head"
    disposition: fixed-in-head
    reason: "CORE-048 refreshBoardBranch inspects the live worktree before protected-transition decisions and the focused regression covers an open handoff."
  - id: F-002
    severity: major
    summary: "No-board protected preference guard is fixed in the cumulative head"
    disposition: fixed-in-head
    reason: "guardGitBranchPreference retains the protected default without an open board and permits the requested branch once a board is available; the three deterministic cases are covered."
  - id: F-003
    severity: blocker
    summary: "Hosted workflow branch source is fixed in the cumulative head"
    disposition: fixed-in-head
    reason: "pr.yml reads non-empty KANMER_BOARD_BRANCH with the kanmer-board migration fallback, fetches that ref, and creates the board worktree from it; the 1/1 static regression passes."
  - id: F-004
    severity: minor
    summary: "Protection inference remains a conservative accepted risk"
    disposition: accepted-risk
    reason: "The literal/default protection boundary is explicit in the CORE-043 plan and ADR-0016. No GitHub protection API or live retarget mutation is claimed."
  - id: F-005
    severity: blocker
    summary: "Merged CORE-048 remains a live board blocker for CORE-043"
    disposition: open
    reason: "CORE-048 is merged into this exact head (PR #170 base 1a06ead, merge commit 119300385) but its board item remains Verifying with blocks: [CORE-043]. The current kanmer-gate therefore fails DEPENDENCY_BLOCKED until child verification/closeout updates the board."
  - id: F-006
    severity: major
    summary: "CORE-043 report and item traceability are stale at the cumulative head"
    disposition: open
    reason: "The post-implementation report and item record still name only 1a06ead and the original eight-file implementation; the exact base-to-head comparison is three commits and ten changed files including the CORE-048 workflow/source/test changes. The PR body likewise still names only the original commit."
  - id: F-007
    severity: major
    summary: "Hosted verification needs a fresh run after board and attestation repair"
    disposition: rerun-required
    reason: "Run 32571224767 had verify PASS but kanmer-gate FAIL: DEPENDENCY_BLOCKED CORE-048 and STALE_REVIEW because the prior CORE-043 attestation used invalid findings[4].severity=warning. This fresh attestation removes the schema-invalid severity, but the dependency and rerun remain."
  - id: F-008
    severity: minor
    summary: "Original GitHub review threads remain unresolved"
    disposition: fixed-in-head-awaiting-thread-resolution
    reason: "The four non-outdated PR #168 threads correspond to F-001, F-002, F-003, and the accepted F-004 risk. Their code dispositions are recorded above, but GitHub resolution is still pending."
---
# Independent review — CORE-043 cumulative head

## Verdict

NEEDS-CHANGES for packet/board readiness; the original three code blockers are fixed in the cumulative PR head, but the child dependency is still live, the parent report/traceability is stale, and the hosted gate has a recorded failure requiring board reconciliation and rerun. No source, merge, move, or cleanup was performed.

## Lineage and diff

PR #168 is open against main `34245be039e8fd8395b5e31835602c54e62e98a4` at exact head `11930038542d402865bb26a23787d7d3cad3e2c5`. PR #170 (CORE-048) is closed/merged, based on `core-043-protection-retarget` at `1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6`, with merge commit `11930038542d402865bb26a23787d7d3cad3e2c5`. The cumulative comparison is three commits and ten changed files. The original F-001/F-002/F-003 findings are fixed by the merged CORE-048 implementation and regressions; F-004 remains the explicitly bounded ADR-0016 risk.

## Evidence

- PASS: focused GUI Git rail, 16/16, exit 0, from the CORE-048 exact-head packet.
- PASS: configured workflow static rail, 1/1, exit 0.
- PASS: `npm run build:core`, exit 0; `npm run test:scripts` after build, 89/89, exit 0.
- PASS: `npm run verify:docs`, `npm run check:manual`, and `git diff --check`.
- Preserved packet failures: full GUI, GUI typecheck, and GUI build baseline dispatch/provider parity failures.
- Hosted run 32571224767: `verify` PASS; `kanmer-gate` FAIL with `DEPENDENCY_BLOCKED CORE-048` and invalid prior review severity. No hosted PASS is claimed.

## External boundary

Live GitHub branch-protection state and retarget mutation remain INCONCLUSIVE: no API/App mutation or real protected-branch handoff was available or attempted.

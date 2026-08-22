---
kind: review-attestation
pr: "170"
head_sha: "8ffff2a0f8848bb42868559641b56148ba893ca6"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "5c1a3b81e2a97f74"
ticket_updated: "2026-08-22T11:35:20.024Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Administrator-handoff branch cache refresh is fixed"
    disposition: fixed-in-head
    reason: "applyGitPreferences refreshes every open context through refreshBoardBranch before protected-transition decisions; refreshBoardBranch inspects the actual worktree branch and clears stale paused/error state. The new real-Git regression covers an open worktree renamed to retargeted-board."
  - id: F-002
    severity: major
    summary: "No-board protected preference invalidation is fixed"
    disposition: fixed-in-head
    reason: "guardGitBranchPreference retains the protected default when no Git board is open, preventing a custom branch from being persisted without an observable handoff; it permits the requested branch once a board is open and preserves already-custom preferences. Deterministic regression covers all three cases."
  - id: F-003
    severity: blocker
    summary: "Hosted workflow no longer assumes literal kanmer-board"
    disposition: fixed-in-head
    reason: "pr.yml reads repository variable KANMER_BOARD_BRANCH with kanmer-board migration fallback, checks it is non-empty, fetches that ref, and creates the board worktree from origin/$KANMER_BOARD_BRANCH. scripts/pr-workflow.test.mjs asserts the configured contract and absence of literal fetch/worktree refs."
  - id: F-004
    severity: warning
    summary: "Protection inference remains conservative"
    disposition: accepted-risk
    reason: "No GitHub API/App or live protection mutation is added, exactly as ADR-0016 and the CORE-043 packet require. Literal/default protection inference is not presented as general custom-branch protection detection."
  - id: FOCUSED-RAIL
    severity: major
    summary: "Fresh focused GUI Git Vitest attempt did not produce an exit-0 result"
    disposition: inconclusive-rerun-required
    reason: "On exact head 8ffff2a, npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts emitted only Vitest startup, produced no test output for more than a bounded wait, and was terminated with exit 1. A second single-worker forks variant behaved identically and was terminated with exit 1. The author packet records an earlier focused result of 16/16 exit 0, but this fresh independent attempt must remain visible and cannot be silently replaced."
  - id: HOSTED
    severity: warning
    summary: "No hosted run exists for the reviewed head"
    disposition: inconclusive
    reason: "github_fetch_commit_workflow_runs returned no workflow runs for 8ffff2a0f8848bb42868559641b56148ba893ca6. Live GitHub protection retargeting is not available and is not claimed."
---
# Independent review — CORE-048

## Scope and exact diff

I independently read the complete CORE-048 research, files, plan, checklist, open questions, post-implementation report and execution scratch; HZN-007 context; the CORE-043 NEEDS-CHANGES attestation; FRD-020; ADR-0016; and PR #170. The PR is open at exact head 8ffff2a0f8848bb42868559641b56148ba893ca6, based on CORE-043 head 1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6. The one-commit, five-file diff is scoped to .github/workflows/pr.yml, GUI board-sync main/settings code and tests, and scripts/pr-workflow.test.mjs. No source changes were made during review; the worktree is clean.

## Blocker dispositions

F-001 is fixed: the open-project cache is refreshed from the worktree before deciding whether the protected-default refusal applies, so an administrator handoff made while the project remains open is observed.

F-002 is fixed: a protected default plus no open Git board retains the protected preference rather than persisting an unobservable custom branch. Already-custom preferences and the open-board transition are covered.

F-003 is fixed in the reviewed diff: the hosted gate consumes the KANMER_BOARD_BRANCH repository variable and retains kanmer-board only as an explicit migration fallback. The shell variable is quoted and non-empty checked before fetch/worktree creation.

F-004 remains the explicitly accepted ADR-0016 risk: no live protection API, GitHub App, or branch-rule mutation is claimed.

## Verification evidence

- Packet report: focused GUI Git 16/16 exit 0; configured-workflow static test 1/1; core build exit 0; scripts 89/89; docs/manual/diff checks PASS. Full GUI, GUI typecheck, and GUI build failures are preserved as unrelated dispatch/provider baseline failures.
- Fresh exact-head static rail: node --test scripts/pr-workflow.test.mjs — PASS, 1/1, exit 0.
- Fresh exact-head diff rail: git diff --check — PASS, exit 0.
- Fresh exact-head focused GUI command and a single-worker retry both emitted only Vitest startup and were bounded/terminated with exit 1; no test assertion result was observed. This is recorded as INCONCLUSIVE/RERUN-REQUIRED, not PASS.
- No hosted workflow run is associated with the reviewed SHA.
- Live GitHub protection retargeting remains INCONCLUSIVE; no API mutation or external-host claim is fabricated.

## Verdict

NEEDS-CHANGES pending a fresh exit-0 focused GUI Git rail (or an independently reproducible explanation of the harness hang). The three CORE-043 remediation blockers are fixed in code, and the conservative protection boundary is correctly preserved. No merge, stage move, source edit, or cleanup was performed.

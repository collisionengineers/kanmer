---
kind: review-attestation
pr: "168"
head_sha: "1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-22T10:53:15.286Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Open-context migration does not recognize a completed administrator handoff"
    disposition: open
    reason: "applyGitPreferences decides protectedOpenBoard from cached ctx.syncStatus.branch. If an administrator performs the documented handoff and manually renames an open worktree while the app remains running, the cache still says kanmer-board. The setting remains on the old branch and the context is paused; after restart ensureBoardWorktree can migrate the manually renamed custom branch back to kanmer-board."
  - id: F-002
    severity: major
    summary: "Protected branch changes are persisted when no Git board is open"
    disposition: open
    reason: "When there is no available protected board context, protectedOpenBoard is false and the requested branch is persisted. Opening a Git project later attempts the protected automatic migration, refuses it, and leaves the global setting expecting an unavailable branch. The protected-setting transition must be guarded independently of open contexts."
  - id: F-003
    severity: blocker
    summary: "The hosted merge gate still fetches a literal kanmer-board"
    disposition: open
    reason: "The supported handoff retargets protection and required checks to a custom branch, but .github/workflows/pr.yml still fetches origin/kanmer-board and builds the merge gate worktree from that ref. Removing or moving the old branch makes CI evaluate stale board state or fail. The implementation must update the workflow contract or explicitly prohibit the advertised custom-branch end state."
  - id: F-004
    severity: major
    summary: "Protection is inferred from the literal branch name"
    disposition: accepted-risk
    reason: "This is conservative for local/unprotected repositories and cannot detect a custom protected branch, but the plan explicitly defines kanmer-board as the repository contract and ADR-0016 excludes a GitHub API/App. The risk is accepted only for this bounded retarget-first operator boundary; it must remain explicit and cannot be presented as live protection detection."
  - id: F-005
    severity: warning
    summary: "Hosted gate attempt predates the Review attestation"
    disposition: rerun-required
    reason: "Run 32568773644 had verify PASS but kanmer-gate failure because the event saw CORE-043 in implementing with no scratch/review record. The board is now Review and this attestation is being written; a fresh hosted run is required before merge."
---
# Independent review — CORE-043

## Verdict

NEEDS-CHANGES. The protected-default refusal and custom-branch local Git behavior are implemented and focused tests pass, but the open-context handoff bug and no-open-context persistence bug can leave the global setting and live worktree inconsistent. The hosted merge gate also remains hard-coded to the old branch, so the documented retarget-first flow cannot produce a working protected custom branch.

## Packet and diff

I read the complete CORE-043 research, files, plan, checklist, open-questions, post-implementation report and implementation scratch; HZN-007 context; FRD-020; ADR-0016; and the exact eight-file PR #168 diff from main 34245be039e8fd8395b5e31835602c54e62e98a4 to head 1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6. The diff is limited to GUI Git/settings/tests, FRD-020, two manual chapters, and generated manual output. No source changes were made during review; the worktree remains clean and git diff --check passes.

## Findings and dispositions

### F-001 — blocker: completed handoff with an open context

protectedOpenBoard is derived from cached ctx.syncStatus.branch rather than inspecting the actual worktree. After the documented external handoff manually renames an open worktree from kanmer-board to the requested custom branch, the cached branch remains kanmer-board. Applying the setting therefore preserves the old preference and pauses the context. On a later restart, the persisted old preference can make ensureBoardWorktree rename the custom branch back to kanmer-board. Fix by inspecting the actual branch before deciding the protected transition and accepting the already-completed handoff.

### F-002 — major: no open Git board

The global preference transition is guarded only when an open context has an available protected board. With no such context, the requested branch is persisted immediately. A later Git project open then hits the protected refusal and becomes unavailable under a setting that claims the custom branch. Guard this transition even when no Git board is open, or represent the explicit pending administrator handoff without changing the expected branch.

### F-003 — blocker: workflow branch contract

The PR changes no workflow. .github/workflows/pr.yml still runs git fetch origin kanmer-board and checks out origin/kanmer-board for kanmer/gate. Retargeting GitHub protection and required checks to a custom branch does not retarget this gate. The advertised operator sequence therefore leaves CI stale or broken after the old branch is removed. Update the workflow to consume the configured board branch or constrain the feature so the unsupported end state is not documented.

### F-004 — accepted risk: literal protection boundary

The code conservatively refuses renames away from the literal kanmer-board even on repositories where it is not protected, and it cannot detect a custom branch that later becomes protected. This is an explicit consequence of the plan's literal protected-default contract and ADR-0016's no-GitHub-App boundary. Current live evidence supports the default assumption, but this is not a general protection detector and must remain documented as such.

## Rails

- PASS exit 0: npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts — 14/14.
- PASS exit 0: npm run build:core.
- PASS exit 0: npm run test:scripts after core build — 88/88; the initial clean-worktree 86/88 missing-core-dist failure remains preserved in the report.
- PASS exit 0: npm run check:manual.
- PASS exit 0: npm run verify:docs.
- PASS exit 0: git diff --check.
- Reported base/out-of-scope failures remain typed: full GUI had 41 passing files/294 passing tests but dispatch/provider parity failures; all-workspace typecheck failed on missing dispatchDeliverableProven/verifyDeliverable and antigravity provider types; GUI build failed on the same missing dispatch export.
- Hosted run 32568773644: verify PASS; kanmer-gate FAIL because the run observed implementing stage and no review attestation before the current Review handoff. Fresh verification is required.

## Live GitHub protection evidence

A read-only GitHub API branch inspection returned kanmer-board protected=true, but required_status_checks enforcement_level=off with empty contexts/checks. main returned protected=true with enforcement_level=everyone and required verify. No protection retarget mutation was attempted and no credentials/API/App are part of this ticket, so live retarget proof remains INCONCLUSIVE. The current repository therefore still protects kanmer-board while the PR's advertised custom-branch handoff is not live-proven.

## Required remediation

Fix F-001 and F-002, update or explicitly constrain the workflow contract for F-003, rerun the focused/full relevant rails and hosted verification, and request fresh independent review. No merge, move, cleanup, or source change was performed.

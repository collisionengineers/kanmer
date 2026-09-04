---
kind: review-attestation
pr: "319"
head_sha: "daaf95fa234cc0ce87cd5dd83d556cad6610fdfc"
verdict: pass
reviewer: "codex-independent-release-reviewer"
independent: true
plan_hash: "3ea6ccf2aff79ea3"
ticket_updated: "2026-09-04T09:43:48.006Z"
board_sha: "1093dc4838e53a04733329d6d51492d274e42302"
expected_reviewers:
  - "codex-independent-release-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: blocker
    summary: "The original release notes falsely told users to commit provider registrations that Connect deliberately gitignores as per-machine state."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The original notes omitted that every open finding, including minor and note, now blocks the merge gate until terminal disposition."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "The original notes omitted the rootless Claude Code/OpenCode discovery constraint and Connect warning for an out-of-tree board."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "The structuredContent headline is broader than the exact success-result nesting and excludes error-result detail."
    disposition: accepted-risk
    reason: "The user-visible success-path regression is accurately described; nesting and error shape are non-operative implementation detail for this release note."
  - id: F-005
    severity: minor
    summary: "The review-budget sentence overstates novelty because the budget existed in 0.4.0 while 0.4.1 changes what consumes it."
    disposition: accepted-risk
    reason: "The sentence describes the effective 0.4.1 policy and directs no incorrect user action."
  - id: F-006
    severity: minor
    summary: "The golden-board bullet compresses scenario counts, child coverage, and the precise disposable-temp and environment-stripping mechanics."
    disposition: accepted-risk
    reason: "The safety outcome is supported by the harness and the imprecision does not weaken or misdirect the operator contract."
  - id: F-007
    severity: minor
    summary: "The board-regate bullet omits its operator-installed board-branch workflow prerequisite and the PR edited-event verify exclusion."
    disposition: accepted-risk
    reason: "It describes repository CI outcome rather than an end-user action; the installed board workflow and current event split behave as claimed."
  - id: F-008
    severity: note
    summary: "The AGENTS.md release-note wording says a truncated sentence was completed although the repair deleted an orphan word."
    disposition: accepted-risk
    reason: "The resulting managed block is well formed and the release-note outcome is materially accurate."
  - id: F-009
    severity: note
    summary: "Several host-observed release-note outcomes are not proven until this ticket executes its post-merge promotion acceptance."
    disposition: accepted-risk
    reason: "The plan explicitly blocks live promotion on those checks and preserves rollback and failure routing; publication is not presented as promotion proof."
  - id: F-010
    severity: minor
    summary: "The notes omit that Claude Disconnect now removes the plugin and marketplace registration."
    disposition: accepted-risk
    reason: "This is the intended effect of an explicit disconnect action and creates no upgrade or compatibility obligation."
  - id: F-011
    severity: note
    summary: "The previously reviewed head had no completed hosted verify result because PR metadata concurrency cancelled the run."
    disposition: fixed
---

# Delta review — CORE-137, PR #319

Remediation round 1 reviewed independently at exact head daaf95fa234cc0ce87cd5dd83d556cad6610fdfc. This reviewer did not author the release notes, release commit, remediation commit, plan, or implementation report.

## Delta scope and result

The prior attestation at 6637239d2af844f9fae4c59bc572ec6535341509 required one release-note rewrite for root-cause class C-1. The only new commit is daaf95fa234cc0ce87cd5dd83d556cad6610fdfc, and its only changed file is apps/gui/release-notes.md. The full PR remains the planned nine-file release diff: release notes plus the script-generated version manifests and bundled MCP artifact.

- F-001 fixed: the provider-registration bullet and upgrade paragraph now say registrations are per-machine, are added to gitignore, remain untracked, and must not be committed. This agrees with FRD-012 R1c and connectIgnoreEntries.
- F-002 fixed: the anti-churn bullet now states that every open finding, minor and note included, blocks the merge gate until terminal disposition. This agrees with openReviewFindings in merge-gate.ts.
- F-003 fixed: the provider-registration bullet now states that Claude Code and OpenCode use discovery without a pinned board path, names the supported project/.kanmer and project/.worktrees locations, and says reconnect warns elsewhere. This agrees with FRD-012 R1e and discoverabilityNote.

F-004 through F-010 retain the previous accepted-risk dispositions. The remediation changed none of the lines or contracts behind those findings, and none is an open blocker or major. F-011 is fixed on this head by hosted verify run 33858904027, job 100978587075, which completed successfully.

## Evidence

- Plan binding: 3ea6ccf2aff79ea3; ticket timestamp: 2026-09-04T09:43:48.006Z; pushed board reviewed at 1093dc4838e53a04733329d6d51492d274e42302.
- git diff 6637239d..daaf95fa confirms the remediation is one release-notes-only commit; the complete PR stays at nine planned files and git diff --check exits 0.
- Independent npm run plugin:check exits 0: 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests are v0.4.1, and the isolated handshake lists 41 tools.
- Hosted verify at the exact head passed in run 33858904027.
- The initial kanmer-gate job in that run failed only because it fetched the prior 6637239d needs-changes attestation before this replacement existed. The board-push regate must pass after this record is committed remotely; merge is not authorized before that.
- GitHub GraphQL reports no review threads and no reviews on the head. The existing issue comment is the prior public consolidated review. threads_snapshot is therefore empty, and the assigned expected reviewer is settled by this attestation.

## Verdict

Pass. The bounded remediation resolves every prior blocker and major finding without widening the PR. Merge remains contingent on a fresh exact-head gather, a pushed attestation, successful kanmer-gate regate, successful verify, no new thread, and clean GitHub mergeability.

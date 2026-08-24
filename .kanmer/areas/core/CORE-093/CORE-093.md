---
id: CORE-093
type: ticket
title: Rerun the merge gate when a PR body is edited
status: review
area: core
assignee: codex
profile: fix
stageEntered:
  preparing: '2026-08-24T10:02:32.249Z'
  review: '2026-08-24T10:10:53.763Z'
taken_at: '2026-08-24T10:03:32.106Z'
branch: core-093-pr-body-edit-trigger
worktree: .worktrees/core-093
labels:
  - ci
  - merge-gate
  - remediation
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links:
  - CORE-024
  - CORE-092
refs:
  - docs/functional/frd/FRD-009-interrogative-workflow.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
commits:
  - 409aa9015af44bd3cb72a126a5f8a0f7972dbe9b
prs:
  - '235'
archived: false
created: '2026-08-24T09:59:47.119Z'
updated: '2026-08-24T11:06:56.071Z'
---

## What

Trigger the pull-request merge gate when a pull request body is edited, and document the maintained CI gate convention in `AGENTS.md`.

## Why

The gate resolves its ticket from the `Kanmer:` footer in the PR body. Without an `edited` event, the check status can become stale for the current commit after that footer changes.

## Verification

- [ ] `pull_request` triggers on `edited` as well as the existing source-change events.
- [ ] A focused workflow contract test covers the body-edit trigger.
- [ ] Contributor instructions state the gate’s source command, board-worktree requirement, and maintenance test.

## Scope

Follow-up remediation for [[CORE-024]] and [[CORE-092]]. This does not change the gate’s ticket policy or its executable.

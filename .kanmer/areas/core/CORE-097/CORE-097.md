---
id: CORE-097
type: ticket
title: Keep tag release verification non-publishing while packaging the updater
status: implementing
area: core
assignee: codex-mcp-client
profile: fix
stageEntered:
  preparing: '2026-08-24T18:58:06.696Z'
  implementing: '2026-08-24T19:03:13.253Z'
taken_at: '2026-08-24T19:03:33.283Z'
branch: core-097-nonpublishing-release-verify
worktree: .worktrees/core-097
labels:
  - release
  - ci
  - regression
groups:
  - HZN-007
links: []
blocks:
  - CORE-096
docs_todo: true
archived: false
created: '2026-08-24T18:57:31.028Z'
updated: '2026-08-24T19:03:33.283Z'
---

## What
Keep the tag-triggered release-verification workflow read-only while allowing its packaged-updater check to complete. The workflow must invoke Electron Builder with `--publish never`, preventing a tag build from scheduling an upload.

## Trigger
The v0.3.4 tag workflow ran `npm run dist:check` and Electron Builder failed because its configured GitHub publisher attempted to schedule an upload without a `GH_TOKEN`. The tag verifier is governed as an independent, non-publishing check.

## Scope
Change only the release-workflow invocation needed to make the packaged-updater build non-publishing. Do not add a publisher credential, grant write permission, retag v0.3.4, publish or repair assets, change GUI packaging configuration, or absorb GUI-131's independent packaged-entry investigation.

## Verification
- the tag workflow invokes the packaged-updater build with `--publish never`;
- the workflow retains `contents: read` and no publisher token mapping or repository secret;
- the existing v0.3.4 failure remains recorded and no release claim is made.

## Outcome

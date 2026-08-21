---
id: CORE-036
type: ticket
title: Tag-push release verification workflow
status: implementing
area: core
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T16:03:18.784Z'
labels: []
groups:
  - HZN-005
  - HZN-007
links:
  - GUI-092
  - GUI-093
archived: false
created: '2026-08-20T10:14:42.545Z'
updated: '2026-08-21T10:57:25.600Z'
---

## What
`.github/workflows/release.yml` on tag push: `npm ci && npm run verify && npm run dist:check`, then `verify-release-assets.mjs <version>` against the published release once assets exist. CI validates; `release.mjs` remains the publisher.

## Why
three consecutive releases (0.3.0–0.3.2) shipped broken with green logs; AGENTS.md §11 names a tag-push workflow "the real fix"; releases are cut from one laptop.

## Verification
- [ ] workflow green on the next tag
- [ ] a deliberately incomplete draft release fails it

## Outcome

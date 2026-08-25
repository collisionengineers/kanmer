---
id: CORE-110
type: ticket
title: Publish and validate v0.3.11 connector closeout release
status: done
area: core
assignee: codex
profile: chore
stageEntered:
  preparing: '2026-08-25T16:05:24.094Z'
  review: '2026-08-25T16:07:35.198Z'
  verifying: '2026-08-25T16:26:39.941Z'
  done: '2026-08-25T16:55:19.644Z'
labels:
  - release
  - v0.3.11
  - closeout
links: []
refs:
  - docs/functional/frd/FRD-025-remote-access.md
  - docs/functional/frd/FRD-021-auto-update.md
commits:
  - 48d819d6d896f3bf4aac66925a2a92cbc6baa202
  - 820aa790f94265cf156873f813ee2af108233b85
prs:
  - '279'
  - '280'
archived: false
created: '2026-08-25T16:05:04.081Z'
updated: '2026-08-25T16:57:21.476Z'
---

Publish and independently validate the consolidated Windows release containing the merged remote ChatGPT connector and setup fixes. This ticket changes no product scope: it packages the already-merged main branch, verifies the public updater artifacts, and hands GUI installation to the user.

## Outcome

v0.3.11 shipped successfully from PR [[CORE-110]] traceability entries 279 and 280. The public Windows installer, blockmap, updater manifest, and MCPB were verified byte-identical. No Ubuntu lane was added. GUI installation is intentionally handed to the user; live post-install verification remains on [[GUI-141]] and [[MCP-051]].

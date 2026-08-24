---
id: CORE-097
type: ticket
title: Provide safe GitHub publisher authentication to tag release verification
status: backlog
area: core
assignee: ''
profile: fix
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
updated: '2026-08-24T18:57:31.028Z'
---

## What
Repair the tag-triggered release-verification environment so its authoritative packaged-updater check has the scoped GitHub publisher authentication Electron Builder requires, without exposing credentials in source, logs, tickets, or artifacts.

## Trigger
The v0.3.4 tag workflow ran `npm run dist:check` but Electron Builder refused because GH_TOKEN was absent. The workflow cannot prove the released package path while its publisher is unconfigured.

## Scope
Change only the governed release-verification credential/configuration path. Do not retag v0.3.4, publish assets manually, change the release asset contract, or absorb GUI-131's independent packaged-entry investigation.

## Verification
- tag/release verification can run its packaged-updater checks without logging a secret;
- required CI and security boundaries remain intact;
- existing v0.3.4 tag failure remains recorded and no false release claim is made.

## Outcome

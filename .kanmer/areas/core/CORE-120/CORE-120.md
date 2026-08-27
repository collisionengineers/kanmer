---
id: CORE-120
type: ticket
title: 'PR #286 review: classify every Verifying ticket without a merge SHA'
status: backlog
area: core
assignee: ''
profile: custom
labels:
  - review-feedback
  - reliable-autonomy
links: []
blocks: []
archived: true
created: '2026-08-26T22:19:58.406Z'
updated: '2026-08-26T22:37:04.458Z'
---

## What

Recorded independent-review finding F-001 from [[CORE-113]] PR #286.

## Why

The approved CORE-113 scope requires every Verifying ticket without a merged SHA to produce an explicit no-apply reconciliation finding. The first candidate handled only the internally inconsistent merged/no-SHA case.

## Resolution

The correction landed in CORE-113 commit `83279d14638e874bd98ccf764ccd7844897c6993`. The fresh independent delta review confirmed absent, open, closed-unmerged, and merged PR evidence with no merge SHA all return `VERIFYING_WITHOUT_MERGE_SHA` without applying a transition.

## Outcome

F-001 is fixed in the original ticket and PR. This interim feedback record is archived to preserve its history without maintaining a separate in-scope remediation ticket or blocking CORE-113's controlled replan.

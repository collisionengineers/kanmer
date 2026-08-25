---
id: CORE-104
type: ticket
title: Stabilize Windows CI timeout for area validation
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-25T05:47:22.898Z'
labels:
  - ci
  - windows
  - test
links: []
archived: false
created: '2026-08-25T05:47:06.633Z'
updated: '2026-08-25T05:47:22.898Z'
---

The unchanged area-validation store test exceeded the five-second default on two consecutive hosted Windows runs, blocking unrelated reviewed PRs while passing locally. Give this filesystem-heavy integration test an explicit bounded timeout appropriate to hosted Windows without weakening assertions or changing production behavior. Verify with repeated focused runs and the full hosted rail.

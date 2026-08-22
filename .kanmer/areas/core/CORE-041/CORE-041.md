---
id: CORE-041
type: ticket
title: Make project identity smoke drive-neutral on Windows CI
status: backlog
area: core
assignee: ''
profile: fix
labels: []
links: []
archived: false
created: '2026-08-22T01:47:24.828Z'
updated: '2026-08-22T01:47:24.828Z'
---

The final stacked PR #145 verify rail reaches smoke.mjs and fails on hosted Windows because project identity smoke expectations hardcode c:/ for POSIX-style roots while the runner checkout is on D:. Make the smoke expectation derive the platform drive without weakening canonical path or fingerprint assertions. Keep this separate from CORE-040 release-notes cutoff and preserve exact hosted evidence.

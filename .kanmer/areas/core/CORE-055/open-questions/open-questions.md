# Open Questions — CORE-055

## Resolved

- [x] A mismatch must skip both protected and ordinary rename paths; no automatic ref/worktree mutation is allowed until the administrator handoff is complete.
- [x] The existing `branchMismatch` signal is authoritative; no second cached branch or Git probe is introduced.
- [x] Live GitHub protection retargeting and packaged GUI interaction remain INCONCLUSIVE and are not claimed.

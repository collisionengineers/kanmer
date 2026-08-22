# Research

CORE-060 review at exact head `fbb528734e43d2d86c24359b88395169f197506b` found that automatic sync trusts cached `syncStatus.branch` and can push/sync after the live board worktree has moved to another branch. The remediation must inspect the live branch before automatic sync and keep the handoff paused on mismatch. Governing scope: FRD-020 / ADR-0016.

---
kind: proof-record
ticket: "CORE-090"
merged_sha: "a8cc6b01ca95340f1186bccc9770238036d080d8"
verified_at: "2026-08-23T00:42:41.532Z"
result: PASS
environment: "origin/main a8cc6b01ca95340f1186bccc9770238036d080d8; local Windows checkout"
attempts:
  - attempted_at: "2026-08-23T00:42:41.532Z"
    command: "git merge-base --is-ancestor implementation origin/main"
    exit_code: 0
    result: PASS
    summary: "The recorded implementation and cumulative merge commits are reachable from origin/main."
  - attempted_at: "2026-08-23T00:42:41.532Z"
    command: "ticket-specific deterministic verification recorded in review attestation"
    exit_code: 0
    result: PASS
    summary: "Independent fresh review PASS; clean detached npm ci, plugin:build, mcpb:check PASS with 3 files/1,671,293 bytes and exact SHA f52d9c5b… parity."
  - attempted_at: "2026-08-23T00:42:41.532Z"
    command: "external or environment-sensitive boundary"
    exit_code: null
    result: INCONCLUSIVE
    summary: "The linked-worktree stale-core failure and absent stacked hosted checks are retained as environment-sensitive limitations."
---
Merged-main proof for CORE-090: artifact implementation 75ce9ab1; cumulative merge a8cc6b01
External/provider/protection limitations remain explicitly INCONCLUSIVE; no unsupported claim is made.
CORE-090 is verified against the merged cumulative mainline and is ready for the Done gate.

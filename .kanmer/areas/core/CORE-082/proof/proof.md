---
kind: proof-record
ticket: "CORE-082"
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
    summary: "Independent review PASS; core IO 29/29, report core suite 307/307, GUI Git 28/28, typecheck/build/plugin/scripts/diff rails PASS."
  - attempted_at: "2026-08-23T00:42:41.532Z"
    command: "external or environment-sensitive boundary"
    exit_code: null
    result: INCONCLUSIVE
    summary: "Live packaged Windows PID-reuse and multi-machine filesystem evidence remain INCONCLUSIVE."
---
Merged-main proof for CORE-082: implementation 388a1b28; cumulative merge a8cc6b01
External/provider/protection limitations remain explicitly INCONCLUSIVE; no unsupported claim is made.
CORE-082 is verified against the merged cumulative mainline and is ready for the Done gate.

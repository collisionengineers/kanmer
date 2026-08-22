---
kind: proof-record
merged_sha: "33f86dbcc5a9b1fb83b1825b2b8f2eefd5ef20a6"
environment: "merged main; GitHub Actions windows-latest / Node v20.20.2; local skill validator rails"
verified_at: "2026-08-22T02:08:09.597Z"
result: PASS
attempts:
  - attempted_at: "2026-08-22T02:05:00Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/skill-017"
    exit_code: 0
    result: PASS
    summary: "Skill contract verifier passed 14/14."
  - attempted_at: "2026-08-22T02:05:00Z"
    command: "node --test scripts/verify-skill-prose.test.mjs"
    cwd: ".worktrees/skill-017"
    exit_code: 0
    result: PASS
    summary: "Validator tests passed 7/7; author report also records build/typecheck and GUI 352/352 pass."
  - attempted_at: "2026-08-22T02:05:00Z"
    command: "PR #143 verify run 32545279635 / job 96962525532"
    cwd: "merged PR #143"
    exit_code: 0
    result: PASS
    summary: "Required GitHub Windows verify passed in 1m49s after the shared path-alias remediation."
---
Merged-main proof for SKILL-017: PR #143 merged as 33f86dbcc5a9b1fb83b1825b2b8f2eefd5ef20a6 with original commit a72ea84f reachable. The skill prose and validator rails pass; provider-host execution is not a required runtime claim for this change and remains explicitly unavailable.

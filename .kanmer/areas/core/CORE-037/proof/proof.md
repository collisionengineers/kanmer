---
kind: proof-record
merged_sha: "8a9eee57e1779f83f30504851e1bff0bf167247a"
environment: "merged main; GitHub Actions windows-latest / Node v20.20.2; local Windows checkout"
verified_at: "2026-08-22T02:04:18.536Z"
result: PASS
attempts:
  - attempted_at: "2026-08-22T01:56:29Z"
    command: "PR #145 verify run 32544808992 / job 96961421442"
    cwd: "merged main PR stack"
    exit_code: 0
    result: PASS
    summary: "The full Windows verify rail passed after CORE-037's path-identity fix, including the previously failing kanmerGit assertion."
  - attempted_at: "2026-08-22T00:30:00Z"
    command: "focused GUI kanmerGit tests, full GUI suite, typecheck, build, diff-check"
    cwd: ".worktrees/core-037"
    exit_code: 0
    result: PASS
    summary: "Focused 12/12 and GUI 352/352 passed with typecheck/build/diff-check."
  - attempted_at: "2026-08-22T02:04:18.536Z"
    command: "npm run test:scripts && node packages/mcp-server/src/smoke.mjs"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Merged-main scripts 80/80 and MCP smoke 224/224 passed."
---
Merged-main proof for CORE-037: original commit aac1e252 is reachable through the green PR #145 merge 8a9eee57. The Windows path identity assertion remains real-path based and the hosted verify now passes; no assertion was weakened.

---
kind: proof-record
merged_sha: "8a9eee57e1779f83f30504851e1bff0bf167247a"
environment: "merged main; GitHub Actions windows-latest / Node v20.20.2; local Windows checkout"
verified_at: "2026-08-22T02:02:29.549Z"
result: PASS
attempts:
  - attempted_at: "2026-08-22T01:56:29Z"
    command: "PR #145 verify run 32544808992 / job 96961421442"
    cwd: "merged main PR stack"
    exit_code: 0
    result: PASS
    summary: "After a retained initial npm ci ECONNRESET/EPERM download failure and rerun, the full authoritative Windows verify rail passed in 2m17s."
  - attempted_at: "2026-08-22T02:02:29.549Z"
    command: "npm run test:scripts"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "80/80 script tests passed on merged main."
  - attempted_at: "2026-08-22T02:02:29.549Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "224/224 standalone MCP smoke checks passed, including project identity canonicalization and exact fingerprint assertions."
  - attempted_at: "2026-08-22T02:02:29.549Z"
    command: "npm run typecheck -w @kanmer/mcp-server"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "MCP server typecheck passed."
  - attempted_at: "2026-08-22T02:02:29.549Z"
    command: "npm test -w @kanmer/core"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "A direct local core run retained the known migration test timeout with ENOTEMPTY cleanup; this is CORE-022 evidence and did not affect the hosted full-stack PASS."
  - attempted_at: "2026-08-22T01:53:31Z"
    command: "PR #149 verify run 32544709172"
    cwd: "PR #149"
    exit_code: 1
    result: FAIL
    summary: "The smoke drive mismatch was cleared; the superseded PR then failed only on the pre-existing GUI RUNNER~1 versus runneradmin assertion. PR #149 was closed superseded and this evidence is retained in scratch/review."

---
Merged-main proof for CORE-041: the scoped change is present in merge 8a9eee57 and the authoritative hosted Windows verify passed. The one local core failure is retained, not erased, and remains owned by CORE-022; no assertion was weakened.

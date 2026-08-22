---
kind: proof-record
merged_sha: "4f785781e7f1993fbcde5e474640db509737c0bd"
environment: "merged main 4f785781; GitHub Actions windows-latest / Node 20.20.2; normal Windows checkout"
verified_at: "2026-08-22T04:05:00.000Z"
result: PASS
attempts:
  - attempted_at: "2026-08-22T03:58:00Z"
    command: "static .github/workflows/pr.yml contract inspection; git diff --check"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Merged main contains exactly one verify job on windows-latest, pull_request to main with opened/synchronize/reopened/ready_for_review, contents: read, workflow Bash, Node 20, and npm ci && npm run verify."
  - attempted_at: "2026-08-21T22:03:54Z"
    command: "GitHub Actions PR #136 verify run 32531237498 / job 96923485539"
    cwd: "PR #136"
    exit_code: 1
    result: FAIL
    summary: "The real Windows/Bash/Node 20 check exposed the pre-existing runneradmin versus RUNNER~1 path-alias assertion in apps/gui/src/main/kanmerGit.test.ts. This failure is retained and dispositioned to CORE-037."
  - attempted_at: "2026-08-22T01:56:29Z"
    command: "GitHub Actions PR #145 verify run 32544808992 / job 96961421442"
    cwd: "CORE-037 merged-main stack"
    exit_code: 0
    result: PASS
    summary: "CORE-037 path-identity remediation passed the full Windows verify rail, including the previously failing kanmerGit assertion."
  - attempted_at: "2026-08-22T02:44:39Z"
    command: "GitHub Actions PR #142 verify run 32546955237 / job 96967001211"
    cwd: "final merged-main-equivalent PR stack"
    exit_code: 0
    result: PASS
    summary: "The final Windows verify job passed on the tree now merged to main; the green check proves the workflow's real PR acceptance rail."
  - attempted_at: "2026-08-22T03:59:00Z"
    command: "npm run verify"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "Merged-main local rail built successfully and passed manual freshness, core 266/266, and GUI 355/355, then retained two unrelated MCP HTTP/tunnel timing failures: project-resolution child spawn ETIMEDOUT and readiness TUNNEL_READINESS_TIMEOUT. No workflow or assertion was weakened."
---
CORE-032 merged-main proof: .github/workflows/pr.yml is present exactly as scoped and has produced a green real Windows verify check on the final shipped tree. The original runner path-alias failure is fixed by CORE-037 and remains traceable there. The local verification attempt's two unrelated MCP HTTP/tunnel timing failures are retained as a failed attempt, not misreported as a CORE-032 regression. Post-merge kanmer-board non-trigger evidence was not manufactured and remains INCONCLUSIVE.

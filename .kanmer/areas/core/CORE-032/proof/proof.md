---
kind: proof-record
merged_sha: "2ba84147"
environment: "normal merged-main checkout / GitHub Actions windows-latest / Node v20.20.2"
verified_at: "2026-08-21T22:10:00.000Z"
result: FAIL
attempts:
  - attempted_at: "2026-08-21T22:02:00.000Z"
    command: "static workflow contract inspection; git diff --check"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "The one-file workflow matches the exact trigger, permissions, Bash, Windows, Node 20, single verify job, and npm ci && npm run verify contract."
  - attempted_at: "2026-08-21T22:03:54.000Z"
    command: "GitHub Actions run 32531237498 / job 96923485539"
    cwd: "PR #136"
    exit_code: 1
    result: FAIL
    summary: "The real Windows/Bash/Node 20 check completed in 1:29 but npm run verify failed in the pre-existing kanmerGit.test.ts RUNNER~1 versus runneradmin path expectation."
  - attempted_at: "2026-08-21T22:04:00.000Z"
    command: "npm run verify"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "Normal-main verification also retained the unrelated core migration timeout (258 passed, 1 failed)."
---
PR #136 was independently reviewed and merged as 2ba84147. The scoped CI workflow is present on merged main and correctly exposes the repository verification rail. The requested green-check acceptance is not proven because the existing rail is red; the failure is retained and branch protection remains out of scope pending the rail owner's fix. Post-merge kanmer-board non-trigger evidence is unavailable and remains INCONCLUSIVE.

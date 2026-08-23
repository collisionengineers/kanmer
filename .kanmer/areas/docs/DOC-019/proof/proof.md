---
kind: proof-record
ticket: "DOC-019"
merged_sha: "ac0b19199cbb4d75ad9b7358adc3f46c971121be"
verified_at: "2026-08-23T03:42:30Z"
result: PASS
environment: "detached clean checkout at merged origin/main commit; Windows; npm ci --ignore-scripts --no-audit --no-fund"
attempts:
  - attempted_at: "2026-08-23T03:40:00Z"
    command: "npm ci --ignore-scripts --no-audit --no-fund"
    exit_code: 0
    result: PASS
    summary: "Clean lockfile dependency install completed."
  - attempted_at: "2026-08-23T03:40:30Z"
    command: "npm run verify:docs && npm run verify:skills && node --test scripts/check-doc-structure.test.mjs"
    exit_code: 0
    result: PASS
    summary: "Merged-main documentation and skill rails passed; mirror freshness tests passed 4/4."
  - attempted_at: "2026-08-23T03:41:00Z"
    command: "npm run test:scripts"
    exit_code: 1
    result: INCONCLUSIVE
    summary: "Initial clean checkout attempt lacked generated packages/core/dist required by script tests; no source assertion failed."
  - attempted_at: "2026-08-23T03:41:20Z"
    command: "npm run build:core && npm run test:scripts"
    exit_code: 0
    result: PASS
    summary: "After the required core build, all 94 script tests passed."
  - attempted_at: "2026-08-23T03:41:30Z"
    command: "git show --check --oneline ac0b19199cbb4d75ad9b7358adc3f46c971121be"
    exit_code: 0
    result: PASS
    summary: "Merged commit is reachable and has no whitespace errors."
  - attempted_at: "2026-08-23T02:33:45Z"
    command: "GitHub hosted PR #227 run 32613165379"
    exit_code: 0
    result: PASS
    summary: "Exact PR head f9449c48 passed kanmer-gate and authoritative verify."
---
Merged-main verification PASS for DOC-019. The refreshed documentation mirrors, release guidance, and dynamic freshness rail are present at the reachable merge commit; local checks pass after the required core build, and the exact-head hosted verification is green.

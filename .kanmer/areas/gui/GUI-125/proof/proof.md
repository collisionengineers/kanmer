---
kind: proof-record
ticket: "GUI-125"
merged_sha: "6abe8abae7e5e533032a30cc2c175fb38ba7403c"
verified_at: "2026-08-23T03:29:30Z"
result: PASS
environment: "detached clean checkout at merged origin/main commit; npm ci --ignore-scripts --no-audit --no-fund"
attempts:
  - attempted_at: "2026-08-23T03:27:30Z"
    command: "npm ci --ignore-scripts --no-audit --no-fund"
    exit_code: 0
    result: PASS
    summary: "Clean lockfile dependency install completed in the detached merged-main worktree."
  - attempted_at: "2026-08-23T03:28:42Z"
    command: "npx vitest run apps/gui/src/renderer/src"
    exit_code: 0
    result: PASS
    summary: "Merged-main renderer suite passed: 28 files, 205 tests."
  - attempted_at: "2026-08-23T03:29:00Z"
    command: "rg -n 'Filters\\.priority|priority\\?:' apps/gui/src/renderer/src"
    exit_code: 1
    result: PASS
    summary: "No residual priority filter-state declarations remain."
  - attempted_at: "2026-08-23T03:29:10Z"
    command: "rg -n 'defaultPriority' apps/gui/src/renderer/src/App.tsx apps/gui/src/renderer/src/components/TicketCreate.tsx"
    exit_code: 0
    result: PASS
    summary: "Intentional defaultPriority persistence path remains present."
  - attempted_at: "2026-08-23T03:29:30Z"
    command: "git show --check --oneline 6abe8abae7e5e533032a30cc2c175fb38ba7403c"
    exit_code: 0
    result: PASS
    summary: "Merged commit is reachable and has no whitespace errors."
---
Merged-main verification PASS for GUI-125. The dead priority filter state is absent at the reachable merge commit, defaultPriority persistence remains, and the clean detached renderer suite passes.

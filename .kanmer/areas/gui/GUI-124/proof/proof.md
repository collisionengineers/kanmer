---
kind: proof-record
ticket: "GUI-124"
merged_sha: "181b6475208a2f18eaeeaa0a9beb44c0c786ae4f"
verified_at: "2026-08-23T03:16:00Z"
result: PASS
environment: "detached clean checkout at merged origin/main commit; npm ci --ignore-scripts --no-audit --no-fund"
attempts:
  - attempted_at: "2026-08-23T03:14:45Z"
    command: "npm ci --ignore-scripts --no-audit --no-fund"
    exit_code: 0
    result: PASS
    summary: "Clean lockfile dependency install completed in the detached merged-main worktree."
  - attempted_at: "2026-08-23T03:15:33Z"
    command: "npx vitest run apps/gui/src/renderer/src/lib/session.test.ts"
    exit_code: 0
    result: PASS
    summary: "Focused merged-main session-restore suite passed: 1 file, 3 tests."
  - attempted_at: "2026-08-23T03:16:00Z"
    command: "git show --check --oneline 181b6475208a2f18eaeeaa0a9beb44c0c786ae4f"
    exit_code: 0
    result: PASS
    summary: "Merged commit is reachable and has no whitespace errors."
---
Merged-main verification PASS for GUI-124. The restore failure advisory and continuation behavior is present at the reachable merge commit, and the focused regression suite passes in a clean detached checkout.

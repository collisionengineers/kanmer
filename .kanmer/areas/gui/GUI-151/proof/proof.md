---
kind: proof-record
merged_sha: "c088be1391a1198c914fc3ef247103fd52c277c5"
environment: "C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/verify-gui-151-c088be1391a1198c914fc3ef247103fd52c277c5 (detached) · Node v24.15.0 · GitHub Actions · operator visual review"
verified_at: "2026-09-04T21:57:48.811Z"
result: PASS
attempts:
  - timestamp: "2026-09-04T21:57:29Z"
    command: "node -e <case-sensitive desktop surface marker check>"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/verify-gui-151-c088be1391a1198c914fc3ef247103fd52c277c5"
    exit_code: 1
    result: FAIL
    summary: "The verifier incorrectly expected uppercase stage labels in source; the UI renders stage names from lowercase data."
  - timestamp: "2026-09-04T21:57:29Z"
    command: "node -e <extract inline script and compile with new Function>"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/verify-gui-151-c088be1391a1198c914fc3ef247103fd52c277c5"
    exit_code: 0
    result: PASS
    summary: "Embedded JavaScript compiled successfully."
  - timestamp: "2026-09-04T21:57:42Z"
    command: "node -e <case-insensitive desktop surface marker check>"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/verify-gui-151-c088be1391a1198c914fc3ef247103fd52c277c5"
    exit_code: 0
    result: PASS
    summary: "All 14 required Board, stage, filter, view, and Settings markers were present."
  - timestamp: "2026-09-04T21:57:42Z"
    command: "git diff --check; git status --porcelain"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/verify-gui-151-c088be1391a1198c914fc3ef247103fd52c277c5"
    exit_code: 0
    result: PASS
    summary: "No whitespace errors; detached merge checkout remained clean."
  - timestamp: "2026-09-04T21:56:32Z"
    command: "GitHub Actions pull request verification run 33921588642"
    cwd: "https://github.com/collisionengineers/kanmer/actions/runs/33921588642"
    exit_code: 0
    result: PASS
    summary: "Authoritative repository verification and Kanmer merge gate both passed on the reviewed head."
  - timestamp: "2026-09-04T21:46:00Z"
    command: "manual operator verification"
    cwd: "apps/gui/kanmer-mockup.html"
    exit_code: null
    result: PASS
    summary: "Alex, the project creator, reviewed the desktop-matched Board and Settings mockup, reported no findings, and confirmed the work accurate and correct."
---

# Verification proof — GUI-151

## Merged artifact

- PR: https://github.com/collisionengineers/kanmer/pull/320
- Merged: 2026-09-04T21:56:49Z
- Exact merge commit: `c088be1391a1198c914fc3ef247103fd52c277c5`
- Verified artifact: `apps/gui/kanmer-mockup.html`

## Result

**PASS.** The exact merged commit was checked out detached and clean. Embedded JavaScript syntax, the desktop surface contract, repository diff checks, the full GitHub Actions verification rail, and the project creator's manual UI verification all passed.

The initial case-sensitive marker probe was a verifier error rather than a product failure; its failing attempt is retained above, and the corrected case-insensitive probe passed.

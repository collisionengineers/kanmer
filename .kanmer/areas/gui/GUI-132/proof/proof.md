---
kind: proof-record
merged_sha: "842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
environment: "Windows detached worktree .worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec; Node 24; exact GitHub squash merge"
verified_at: "2026-08-25T01:48:52.0810644Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T01:44:30Z"
    command: "gh pr view 256 --repo collisionengineers/kanmer --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "PR is MERGED at exact merge commit 842b54aa427ee8f0cba1bda8ec5140eaeff682ec."
  - attempted_at: "2026-08-25T01:44:45Z"
    command: "git worktree add --detach .worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec 842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Detached clean worktree created at the exact full GitHub merge SHA."
  - attempted_at: "2026-08-25T01:45:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    exit_code: 0
    result: PASS
    summary: "647 packages installed from lockfile; npm reported 13 existing audit findings, outside this dependency-free fix."
  - attempted_at: "2026-08-25T01:45:15Z"
    command: "npm run build:core"
    cwd: ".worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    exit_code: 0
    result: PASS
    summary: "Core ESM and declarations built successfully."
  - attempted_at: "2026-08-25T01:45:20Z"
    command: "npm run test -w @kanmer/gui -- --run src/main/connect.test.ts src/main/providers.test.ts"
    cwd: ".worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    exit_code: 0
    result: PASS
    summary: "102/102 focused tests passed, including the real Windows Node-to-cmd-to-batch launcher process."
  - attempted_at: "2026-08-25T01:45:25Z"
    command: "npm run typecheck -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    exit_code: 0
    result: PASS
    summary: "GUI node and web TypeScript projects passed."
  - attempted_at: "2026-08-25T01:45:30Z"
    command: "npm run test -w @kanmer/gui -- --run"
    cwd: ".worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    exit_code: 0
    result: PASS
    summary: "49 files and 469/469 GUI tests passed."
  - attempted_at: "2026-08-25T01:48:50Z"
    command: "git status --short --branch; git rev-parse HEAD; git symbolic-ref --short -q HEAD"
    cwd: ".worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    exit_code: 0
    result: PASS
    summary: "Worktree remained clean, detached, and at the exact merge SHA."
  - attempted_at: "2026-08-25T01:48:51Z"
    command: "git merge-base --is-ancestor d731c982b2d338d6c8cc6630f3a00e44c259b847 842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    cwd: ".worktrees/verify-gui-132-842b54aa427ee8f0cba1bda8ec5140eaeff682ec"
    exit_code: 1
    result: NOT_APPLICABLE
    summary: "Expected squash-merge topology: reviewed source head is represented by GitHub PR #256 but is not an ancestor. Ticket commit traceability was corrected to the reachable merge SHA."
---

# GUI-132 verification

## Conclusion

PASS. The exact merged code fixes the production Windows process boundary that failed in v0.3.7. The decisive regression launches a real temporary batch file through the same Node `execFile` → `cmd.exe /s /c` path and observes the health marker. The persisted Codex registration remains rootless, failed probes still precede config mutation, and the fallback no longer contains unusable backslash-escaped quotes.

This proof covers GUI-132's bounded Connect probe defect. A future candidate installer and end-user click-through remain required by [[GUI-133]] and [[CORE-103]] for the broader installed-update/release claim; that does not make this source/process-boundary fix inconclusive or create a release dependency cycle.

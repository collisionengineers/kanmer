---
kind: proof-record
merged_sha: "093f4b74882d56cac448a5b6513b5b0726401c89"
environment: "Windows detached worktree .worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89; Node/npm lockfile install"
verified_at: "2026-08-25T11:01:29.4276244Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T10:54:39Z"
    command: "git rev-parse HEAD"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 0
    result: PASS
    summary: "Returned exact GitHub merge SHA 093f4b74882d56cac448a5b6513b5b0726401c89."
  - attempted_at: "2026-08-25T10:54:39Z"
    command: "git symbolic-ref --short -q HEAD"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 1
    result: PASS
    summary: "Expected empty output and exit 1 confirmed detached HEAD."
  - attempted_at: "2026-08-25T10:54:39Z"
    command: "git status --short --branch"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 0
    result: PASS
    summary: "Reported HEAD (no branch) with no changed files."
  - attempted_at: "2026-08-25T10:54:40Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 0
    result: PASS
    summary: "Installed 647 lockfile-defined packages; reported pre-existing audit findings without changing the lockfile."
  - attempted_at: "2026-08-25T10:55:09Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 0
    result: PASS
    summary: "Full merged-SHA rail passed: build; core 310/310; GUI 477/477; MCP HTTP; scripts 113/113; all workspace typechecks; docs; stdio/headless/protocol/discovery smokes; MCPB; skills; AGENTS block; plugin sync."
  - attempted_at: "2026-08-25T11:01:20Z"
    command: "node --test scripts/verify-release-assets.test.mjs scripts/release-flow.test.mjs scripts/release-publish.test.mjs"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 0
    result: PASS
    summary: "Focused release regression rail passed 62/62."
  - attempted_at: "2026-08-25T11:01:21Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 0
    result: PASS
    summary: "Complete script rail passed 113/113."
  - attempted_at: "2026-08-25T11:01:29Z"
    command: "git status --short --branch"
    cwd: ".worktrees/verify-core-106-093f4b74882d56cac448a5b6513b5b0726401c89"
    exit_code: 0
    result: PASS
    summary: "Still detached and clean after verification; generated outputs are ignored."
---

# Verification result

PASS. The exact squash-merge commit was verified independently of mutable `main`. The merged release flow packages and validates before tag creation, publishes one canonical four-asset set through a pinned repository and explicit credential, keeps the release hidden until upload/digest/manifest coherence passes, and lets tag CI retry only the expected draft-visibility race. All nine review findings are represented by merged regression coverage.

This proof validates CORE-106's release mechanism. It does not claim that v0.3.9 has been published or installed; those external release and installed-product checks belong to CORE-107.

## Merge traceability

- PR: https://github.com/collisionengineers/kanmer/pull/270
- Merged: 2026-08-25T10:53:20Z
- GitHub merge SHA: `093f4b74882d56cac448a5b6513b5b0726401c89`

---
kind: proof-record
merged_sha: "e958ff2c182373a5461856e60d1a563f37d32b3d"
environment: "detached worktree .worktrees/verify-core-104-e958ff2c182373a5461856e60d1a563f37d32b3d on Windows"
verified_at: "2026-08-25T05:58:48.258Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T05:58:48.258Z"
    command: "npm run test -w @kanmer/core -- --run src/store.test.ts -t validates area only when the board defines areas"
    cwd: ".worktrees/verify-core-104-e958ff2c182373a5461856e60d1a563f37d32b3d"
    exit_code: 0
    result: PASS
    summary: "Target test passed at exact merge SHA in 592ms."
  - attempted_at: "2026-08-25T05:58:48.258Z"
    command: "npm run test -w @kanmer/core"
    cwd: ".worktrees/verify-core-104-e958ff2c182373a5461856e60d1a563f37d32b3d"
    exit_code: 0
    result: PASS
    summary: "All 310 core tests passed."
  - attempted_at: "2026-08-25T05:58:48.258Z"
    command: "npm run typecheck -w @kanmer/core"
    cwd: ".worktrees/verify-core-104-e958ff2c182373a5461856e60d1a563f37d32b3d"
    exit_code: 0
    result: PASS
    summary: "Core typecheck passed."
---

# Verification

The exact GitHub squash merge retains every assertion and passes both the targeted filesystem-heavy test and the complete core suite. Hosted PR verify also passed before merge.

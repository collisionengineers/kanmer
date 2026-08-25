---
kind: proof-record
merged_sha: "8c8fdb868aed3677b3603b9ba360f304139aee6f"
environment: "fresh Windows main clone, GitHub release v0.3.8, Actions run 32831367125"
verified_at: "2026-08-25T09:34:24.000Z"
result: FAIL
attempts:
  - attempted_at: "2026-08-25T08:17:00.000Z"
    command: "npm run release -- 0.3.8 --ticket CORE-103 --dry-run"
    cwd: ".worktrees/core-103 clean clone"
    exit_code: 1
    result: FAIL
    summary: "Initial clean-clone gate exposed nine MCP tests that depended on the developer board."
  - attempted_at: "2026-08-25T08:55:00.000Z"
    command: "npm run release -- 0.3.8 --ticket CORE-103 --dry-run"
    cwd: ".worktrees/core-103 clean clone at merged MCP-050"
    exit_code: 0
    result: PASS
    summary: "Hermetic clean-clone verification passed after MCP-050."
  - attempted_at: "2026-08-25T09:14:00.000Z"
    command: "npm run release -- 0.3.8 --publish --release-commit 8c8fdb868aed3677b3603b9ba360f304139aee6f"
    cwd: ".worktrees/publish-v0.3.8 fresh main clone"
    exit_code: 1
    result: FAIL
    summary: "Pre-publish verification passed and immutable tag was pushed; electron-builder raced release creation, returned GitHub 422 already_exists, and the publisher then failed because latest.yml was absent."
  - attempted_at: "2026-08-25T09:21:00.000Z"
    command: "node scripts/verify-release-assets.mjs 0.3.8"
    cwd: ".worktrees/publish-v0.3.8"
    exit_code: 1
    result: FAIL
    summary: "Public release contained only the installer; MCPB, blockmap, and latest.yml were missing."
  - attempted_at: "2026-08-25T09:20:03.000Z"
    command: "GitHub Actions release verification run 32831367125"
    cwd: "GitHub-hosted Windows runner at tag v0.3.8"
    exit_code: 1
    result: FAIL
    summary: "Code verification and packaged-updater build passed, but public-asset verification failed ten times. The published installer hash also differed from the independently rebuilt signed NSIS installer, proving the cross-build byte-identity contract is unsatisfiable for this release."
  - attempted_at: "2026-08-25T09:34:24.000Z"
    command: "installed v0.3.7 to v0.3.8 updater verification"
    cwd: "installed Kanmer"
    exit_code: null
    result: INCONCLUSIVE
    summary: "Not attempted because the public release lacks latest.yml and is not a valid updater feed."
---

# Verification outcome

v0.3.8 is immutable at the correct merge SHA but is incomplete and failed its release workflow. Only the installer is public; the MCPB, blockmap, and update manifest are absent. The published installer also cannot match a separately rebuilt signed NSIS artifact byte-for-byte. No manual upload, retag, retry, or installed update was performed.

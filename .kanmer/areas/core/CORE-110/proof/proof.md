---
kind: proof-record
merged_sha: "820aa790f94265cf156873f813ee2af108233b85"
environment: "Windows detached worktree .worktrees/verify-core-110-820aa790f94265cf156873f813ee2af108233b85; Node v24.15.0; GitHub Releases production"
verified_at: "2026-08-25T16:55:05.8770534Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T16:27:00.000Z"
    command: "npm run release -- 0.3.11 --ticket CORE-110"
    cwd: ".worktrees/release-prep-0.3.11"
    exit_code: 0
    result: PASS
    summary: "Preparation verification passed: core 310/310, GUI 483/483, HTTP 107/107, scripts 116/116, typecheck, docs, skills, plugin, protocol and smoke rails; release PR 280 created without tag or publication."
  - attempted_at: "2026-08-25T16:40:30.000Z"
    command: "GitHub Actions Pull request verification run 32872771410"
    cwd: "GitHub Actions / PR 280 exact head 887c3830ff853b7333c40a1e33bd41a7e83ea3a9"
    exit_code: 0
    result: PASS
    summary: "Post-attestation kanmer-gate passed in 55 seconds and authoritative verify passed in 3 minutes 32 seconds."
  - attempted_at: "2026-08-25T16:45:00.000Z"
    command: "npm run release -- 0.3.11 --publish --release-commit 820aa790f94265cf156873f813ee2af108233b85"
    cwd: ".worktrees/release-prep-0.3.11"
    exit_code: 0
    result: PASS
    summary: "Exact merged commit was reachable from main; full verification passed; one Windows package was built; immutable tag v0.3.11 and draft release were created; four assets were uploaded, verified byte-identical, then published as latest."
  - attempted_at: "2026-08-25T16:55:05.8770534Z"
    command: "node scripts/verify-release-assets.mjs 0.3.11"
    cwd: ".worktrees/verify-core-110-820aa790f94265cf156873f813ee2af108233b85"
    exit_code: 0
    result: PASS
    summary: "Independent detached exact-merge verification found all four expected public assets present, uploaded, and byte-identical to the canonical local build."
  - attempted_at: "2026-08-25T16:55:05.8770534Z"
    command: "git rev-list -n 1 v0.3.11; gh release view v0.3.11; gh api repos/collisionengineers/kanmer/releases/latest"
    cwd: ".worktrees/verify-core-110-820aa790f94265cf156873f813ee2af108233b85"
    exit_code: 0
    result: PASS
    summary: "Tag resolves to merge SHA 820aa790f94265cf156873f813ee2af108233b85; release is public, non-prerelease, latest, and exposes installer, blockmap, latest.yml, and MCPB in uploaded state with SHA-256 digests."
---

# Verification outcome

v0.3.11 is publicly available from the exact reviewed merge commit. The Windows installer, differential blockmap, updater manifest, and MCPB bundle all match the one canonical local package set.

The installed GUI was deliberately not updated or launched. The user owns that final installation step, after which GUI-141 and MCP-051 can receive their separate live installed-runtime verification.

## Closeout traceability

- Release-notes PR: https://github.com/collisionengineers/kanmer/pull/279 — merged 2026-08-25T16:26:17Z as `48d819d6d896f3bf4aac66925a2a92cbc6baa202`.
- Release PR: https://github.com/collisionengineers/kanmer/pull/280 — merged 2026-08-25T16:44:40Z as `820aa790f94265cf156873f813ee2af108233b85`.
- Public release: https://github.com/collisionengineers/kanmer/releases/tag/v0.3.11 — published 2026-08-25T16:53:58Z.

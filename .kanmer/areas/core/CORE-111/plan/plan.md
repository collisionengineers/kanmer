# Plan

## Objective

Publish v0.3.12 as a stabilization-only patch after PR #281 and PR #282 are both merged on main, verify the real Windows release artifacts and update path, then install/pin the packaged v0.3.12 server as the live control plane.

## Starting state

v0.3.11 is the packaged live server. PR #282 is merged at 7b3d7e1ffab10ba0f518fbd3e16fe7d1c92a8759. PR #281 remains open and must receive its quoted-TOML-key correction, a final-head independent pass, and green required checks. The user's source-root worktree is dirty and must remain untouched. The board backup is C:\Users\Alex\Documents\KanmerBackups\kanmer-board-20260826-183957.zip (SHA-256 4f7af041eb607f6eb12b3378533ae9c9331c62e99424d0d05153fedb81e45052) from board commit eb542a2ae6acbf1daeabd75ce9292642daeae713.

## Governing docs

- docs/functional/frd/FRD-021-auto-update.md: the release must publish a coherent updater set and prove clients can consume it.
- Approved stabilization programme: only PRs #281/#282 and strictly necessary version/release metadata may enter this patch.

## Required changes

1. Wait for PR #281 to pass independent exact-head review and required checks, then merge it without altering unrelated scope.
2. Create a clean CORE-111 release worktree from the then-current origin/main; do not use or modify the dirty source-root main worktree.
3. Update release notes to v0.3.12 and describe only the two stabilization fixes.
4. Run the repository release command for 0.3.12 so its built-in verification, version bump, bundle regeneration, commit/tag/push, packaging, publication, and remote asset verification execute as one real release path.
5. Verify the tag/commit, GitHub release assets, updater manifest and blockmap, sizes and SHA-256 digests, and release-verification workflow.
6. Run supported installed launcher and Connect smoke checks; install/pin v0.3.12 as the live board control plane and verify get_status reports packaged 0.3.12 with the same project/board identity.
7. Reconcile GUI-142, MCP-053, and CORE-111 against GitHub and exact-SHA evidence. Candidate work remains prohibited until this completes.

## Expected files

- apps/gui/release-notes.md: v0.3.12 stabilization notes.
- package.json, apps/gui/package.json, package-lock.json, plugin manifests, mcpb/manifest.json: release script version updates.
- plugins/kanmer/mcp/kanmer-mcp.cjs and generated release artifacts: release-script outputs.
- No architecture-programme source files.

## Do not modify

- The dirty repository-root worktree or its uncommitted files.
- .worktrees/kanmer or the kanmer-board branch.
- Any candidate N+1 architecture implementation.
- PR #281/#282 implementation beyond their merged content.
- Old release assets.

## Constraints

- No new dependency.
- No unrelated architecture change.
- Do not publish until PR #281 is merged and origin/main contains both PRs.
- Refuse on any failed required check, verification command, asset mismatch, or installed-control-plane identity mismatch.
- Preserve every first failure and retry result.

## Ordered steps

1. Confirm both stabilization PR merge SHAs are reachable from origin/main and all final-head requirements passed.
2. Create and take the clean CORE-111 worktree/branch from origin/main.
3. Update release notes for 0.3.12 only.
4. Run `npm run release -- 0.3.12` with the authenticated environment and preserve exact exits/output.
5. Independently query GitHub release/tag/assets and run the release asset verifier.
6. Install/pin the published release, restart/reconnect the stable runtime, and verify packaged server version, project fingerprint, board branch/worktree, launcher health, and Connect where supported.
7. Write exact-SHA proof, reconcile tickets, and clean the release workspace/claim.

## Acceptance checks

- v0.3.12 tag and release point at a main commit containing merge SHAs for #281 and #282.
- Full verify rail exits 0.
- Plugin/MCP bundle checks exit 0 and the packaged server identifies as 0.3.12.
- Windows installer, blockmap, and latest.yml exist, have non-zero expected sizes, and remote SHA-256 digests equal local artifacts.
- Release verification workflow is green.
- Installed launcher/get_status and supported Connect smoke pass.
- Live board remains at the same logical project and healthy board worktree.
- GUI-142 and MCP-053 reflect merged/verified reality; CORE-111 is proven and closed out.

## Commands

- `npm run release -- 0.3.12`
- `node scripts/verify-release-assets.mjs 0.3.12`
- `gh release view v0.3.12 --json tagName,targetCommitish,publishedAt,assets,url`
- `git merge-base --is-ancestor <merge-sha> <release-sha>`
- Project launcher/connect smoke commands documented by the merged implementation and release output.

## Failure and deviation rules

Stop publication if final-head review/checks are absent, the release worktree is dirty before release metadata, credentials are unavailable, or any verification fails. Do not weaken checks or rebuild around an unexplained artifact mismatch. If publication partially succeeds, preserve the immutable attempt and use the release script's exact-file repair path; never pretend changed evidence applies to the old artifact.

## Stop condition

Stop only after v0.3.12 is published, externally verified, installed/pinned as the packaged live server, all three stabilization tickets match live GitHub/evidence state, and the release workspace/claim is cleaned.

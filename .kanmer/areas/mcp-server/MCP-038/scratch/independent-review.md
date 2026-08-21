# Independent review — MCP-038 / PR #111 — 2026-08-21

## Changes

PR #111 changes exactly one tracked path, `plugins/kanmer/mcp/kanmer-mcp.cjs`, with no source, package, skill, or manifest changes. The artifact-only scope matches the MCP-038 files map and FRD-025/ADR-0017 release-artifact boundary.

## Checks and finding

- PR worktree `.worktrees/mcp-038` is clean; `git diff --check` passes and `git diff origin/main...HEAD --name-only` lists only the committed bundle.
- Author-listed artifact claim was independently checked from the normal `main` checkout after `npm run build`: `npm run plugin:check` PASS — 30 tools, bundle bytes match fresh build, 12 skill frontmatters, manifests v0.3.3, isolated handshake 30 tools.
- Blocking P1: PR #111's committed bundle is not the authoritative normal-main fresh-build byte output. Hash of PR #111 artifact at `13e0d3f9cf91cc0bfa44ccd7aa1fffbd84b1802f` is `9161bcc3fb59bdc2bb6e69700a6bf878a434e92a146bf71371ed04a08d334891`; normal-main fresh standalone build is `e44a24631f80305b5e6a0851221247a6a90cbfbc80761073465bcbd4e42aad34`. The candidate rewrites dependency-module path comments to `../../../../...` (including `packages/core/dist`) while normal-main canonical output uses `../../...`; merging it would make authoritative `plugin:check` fail. This contradicts MCP-038's required byte-reproducibility claim.

Disposition: NEEDS CHANGES. Regenerate `plugins/kanmer/mcp/kanmer-mcp.cjs` from the normal main checkout's canonical `npm run plugin:build` output, push the corrected artifact, and re-review. No merge performed.

## Re-review after corrected artifact — 2026-08-21

PR #111 was corrected by rebasing onto merged main `cb35e7f424a2c187e4b66be40160942375c0f7d7` and adding commit `0636eda1340ec5680e773214b0c8b2cd31f7894a`. The PR remains artifact-only: `gh pr diff 111 --name-only` lists only `plugins/kanmer/mcp/kanmer-mcp.cjs`; candidate worktree is clean and `git diff --check` passes.

Independent authoritative normal-checkout reproduction used a detached clone at cb35e7f with the same canonical dependency layout (including nested gray-matter/js-yaml resolution): `npm run plugin:build` then `npm run plugin:check` PASS — 30 tools, byte match, 12 skill frontmatters, v0.3.3 manifests, isolated 30-tool handshake. Fresh artifact and standalone dist both hash `48583b7eb295dc599822dc65778a4adda9181755323824ef984f74aa4d309f6e`, exactly matching PR #111’s corrected artifact hash `48583b7eb295dc599822dc65778a4adda9181755323824ef984f74aa4d309f6e`.

Previous NEEDS CHANGES disposition is fixed-in-PR by 0636eda. Final verdict: PASS — PR #111 is ready to merge.

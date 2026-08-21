# Independent review — MCP-038 / PR #111 — 2026-08-21

## Changes

PR #111 changes exactly one tracked path, `plugins/kanmer/mcp/kanmer-mcp.cjs`, with no source, package, skill, or manifest changes. The artifact-only scope matches the MCP-038 files map and FRD-025/ADR-0017 release-artifact boundary.

## Checks and finding

- PR worktree `.worktrees/mcp-038` is clean; `git diff --check` passes and `git diff origin/main...HEAD --name-only` lists only the committed bundle.
- Author-listed artifact claim was independently checked from the normal `main` checkout after `npm run build`: `npm run plugin:check` PASS — 30 tools, bundle bytes match fresh build, 12 skill frontmatters, manifests v0.3.3, isolated handshake 30 tools.
- Blocking P1: PR #111's committed bundle is not the authoritative normal-main fresh-build byte output. Hash of PR #111 artifact at `13e0d3f9cf91cc0bfa44ccd7aa1fffbd84b1802f` is `9161bcc3fb59bdc2bb6e69700a6bf878a434e92a146bf71371ed04a08d334891`; normal-main fresh standalone build is `e44a24631f80305b5e6a0851221247a6a90cbfbc80761073465bcbd4e42aad34`. The candidate rewrites dependency-module path comments to `../../../../...` (including `packages/core/dist`) while normal-main canonical output uses `../../...`; merging it would make authoritative `plugin:check` fail. This contradicts MCP-038's required byte-reproducibility claim.

Disposition: NEEDS CHANGES. Regenerate `plugins/kanmer/mcp/kanmer-mcp.cjs` from the normal main checkout's canonical `npm run plugin:build` output, push the corrected artifact, and re-review. No merge performed.

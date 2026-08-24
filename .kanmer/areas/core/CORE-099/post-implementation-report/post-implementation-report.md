# Post-implementation report — CORE-099

## Summary

The single authorized v0.3.6 preparation invocation ran from a freshly cloned, clean protected-main checkout at `d1d61506435151b73dc04c9fcff18c74656ab4a8`, with the canonical board bound only through its process environment. It completed the existing release gate, generated and pushed `release/v0.3.6` at `d658585848f8c8545b300ecb557a5d23a8c30ed9`, and opened PR [#250](https://github.com/collisionengineers/kanmer/pull/250). No tag, GitHub Release, release asset, manual upload, or publisher invocation occurred.

## Changes

| File | Change | Why |
|---|---|---|
| `package.json` | Version `0.3.5` → `0.3.6`. | Root released package metadata. |
| `package-lock.json` | Locked root package version update. | Keeps the published lockfile consistent. |
| `apps/gui/package.json` | Version `0.3.5` → `0.3.6`. | Packaged Windows GUI metadata. |
| `mcpb/manifest.json` | Version `0.3.5` → `0.3.6`. | Published MCP bundle manifest. |
| `plugins/kanmer/.claude-plugin/plugin.json` | Version `0.3.5` → `0.3.6`. | Claude plugin manifest. |
| `plugins/kanmer/.codex-plugin/plugin.json` | Version `0.3.5` → `0.3.6`. | Codex plugin manifest. |
| `plugins/kanmer/plugin.json` | Version `0.3.5` → `0.3.6`. | Shared plugin manifest. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated versioned standalone MCP bundle. | Keeps the committed plugin artifact byte-aligned with source. |

## Governing docs

- **FRD-021 R3 — met for preparation.** The generated PR includes current v0.3.6 release notes from DOC-023, runs the release verification/packaging rails, and preserves the later publisher and public-asset steps as a separate post-merge phase.
- **GUI-131 boundary — observed.** The preparation invocation built the GUI successfully before commit/PR generation. The publisher's pre-tag build will be re-observed only by the separately authorized post-merge invocation; this ticket changes no release implementation.

## Verification

The release script completed successfully (exit 0) with these material rails passing in the clean clone:

- build; core tests 310/310; GUI tests 468/468; MCP HTTP tests 102/102; scripts 100/100;
- workspace typecheck; docs verification; MCP smoke 224/224; headless smoke; MCPB build/check; protocol smoke 46/46; discovery smoke 13/13; skills 15/15; AGENTS block 31/31; plugin check;
- regenerated v0.3.6 plugin/MCPB artifacts and successful GUI production build;
- generated diff scope `apps/gui/package.json`, `mcpb/manifest.json`, `package-lock.json`, `package.json`, the three plugin manifests, and `plugins/kanmer/mcp/kanmer-mcp.cjs`; `git diff --check origin/main...HEAD` exited 0 and the generated clone ended clean.

## Risks and hand-off

- Required hosted `verify` and `kanmer-gate` checks on PR #250 were still running when this report was written. The author must not review or merge; independent review owns the exact-head decision after terminal checks.
- After a normal protected-main merge, a separate publisher role must run exactly one clean-clone `--publish --release-commit <full-merge-sha>` invocation with process-local board binding and credential, then independently verify public assets and tag workflow. No retry, retag, manual asset/release repair, or administrative bypass is allowed.
- v0.3.4 and v0.3.5 remain untouched immutable failed-publication records.

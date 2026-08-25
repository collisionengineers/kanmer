# Research: v0.3.8 publication failure

## Question
How can Kanmer publish exactly one Windows package generation and verify the public release without requiring a separately signed rebuild to be byte-identical?

## Findings

1. The v0.3.8 publisher pushed the tag and then invoked Electron Builder with `--publish always`. Only the installer reached the public release; concurrent release creation returned GitHub 422 `already_exists`, leaving the blockmap, update manifest, and MCPB absent. Source: CORE-103 release log and public release inspection.
2. The tag workflow independently runs `npm run dist:check`, producing another signed NSIS installer, then calls `verify-release-assets.mjs` against that local build. The independently built installer had a different SHA-256 from the published installer. Signed NSIS output is not a reproducible cross-run identity boundary. Source: workflow run 32831367125.
3. The publisher already has the correct trustworthy boundary: one local package generation, `latest.yml` coherence checks, exact-file upload, and post-upload GitHub digest comparison. The failure is delegating creation/upload to Electron Builder before that explicit path. Source: scripts/release.mjs, scripts/verify-release-assets.mjs, scripts/release-publish.mjs.
4. The tag workflow can remain strict without comparing independent builds: inspect the published release as a self-contained set, require installer/blockmap/latest.yml/MCPB exactly once and uploaded, validate `latest.yml` version/URL/size/SHA-512 against downloaded installer bytes, and require non-empty provider SHA-256 metadata where available. Its local `dist:check` remains a source/package health test, not the provenance source for public bytes.
5. v0.3.7 Codex Connect is expected to fail with the malformed fallback shown in the screenshot. The corrected `windowsVerbatimArguments` invocation and pasteable command are already merged on main through GUI-132; they need a clean successor release, not another launcher implementation.
6. v0.3.8 is immutable failed evidence and must not be retagged. v0.3.9 is the recovery release owned by CORE-107.

## Implication
Package once with publication disabled, validate that exact directory, explicitly create/upload the GitHub release from those files, then verify the remote bytes. Change the tag verifier to remote-set coherence rather than cross-build identity. Preserve all existing local package checks and failure classification.

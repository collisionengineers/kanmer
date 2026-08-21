# Files — GUI-092

## Modify

| Path | Change | Risk / verification |
|---|---|---|
| `scripts/release.mjs` | Remove the first NSIS package pass, run exactly one `--win --publish always` build after tag push, check its package and local manifest pairing, and never package again during remote recovery. | Preserve tag ordering, explicit `always` policy, and post-upload verifier. Exercise no-network package analogue, dry-run diagnostics, and script tests; never cut a release during ticket tests. |
| `scripts/verify-release-assets.mjs` | Export a local-artifact coherence check built from the existing expected/manifest logic. | It must reject a stale/mismatched `latest.yml` without weakening remote verification. |
| `scripts/verify-release-assets.test.mjs` | Cover the local coherence helper and a bad manifest pairing. | Dependency-free `node:test` rail must remain green. |

## Context

| Path | Why it matters |
|---|---|
| `scripts/check-updater-package.mjs` | Validates package layout but not the manifest hash pair; it runs directly after the sole package. |
| `docs/functional/frd/FRD-021-auto-update.md` | Governing release-discipline requirement and current external-asset verification behaviour. |
| `apps/gui/electron-builder.yml` | Defines the GitHub publisher and Windows NSIS artifact family. |

## Out of scope

- Changing updater runtime behaviour, release versioning, tag order, or cutting a production release.
- Claiming an installed-client update test without a real release.
- Touching MCP-021 or adding a second publisher.

# Files — GUI-092

## Modify

| Path | Change | Risk / verification |
|---|---|---|
| `scripts/release.mjs` | Pack once, validate the local manifest-to-installer pairing, publish the exact first-pack files with Electron Builder's publish command, and reuse those files for the one repair attempt. | Release operations must retain tag ordering, explicit `always` policy, and the existing post-upload verifier. Exercise dry-run and script tests; never cut a release during ticket tests. |
| `scripts/verify-release-assets.mjs` | Export or add a local-artifact coherence check built from the existing expected/manifest logic. | It must reject a stale/mismatched `latest.yml` before publication without weakening remote verification. |
| `scripts/verify-release-assets.test.mjs` | Cover the local coherence helper and a bad manifest pairing. | Dependency-free `node:test` rail must remain green. |

## Context

| Path | Why it matters |
|---|---|
| `scripts/check-updater-package.mjs` | Validates package layout but not the manifest hash pair; it must still run against the one pack. |
| `docs/functional/frd/FRD-021-auto-update.md` | Governing release-discipline requirement and current external-asset verification behaviour. |
| `apps/gui/electron-builder.yml` | Defines the GitHub publisher and Windows NSIS artifact family. |

## Out of scope

- Changing updater runtime behaviour, release versioning, tag order, or GitHub asset repair policy.
- Cutting a production release or claiming an installed-client update test without a real release.
- Touching MCP-021 or introducing a second publisher.

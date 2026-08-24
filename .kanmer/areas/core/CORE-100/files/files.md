# Files — CORE-100

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/electron-builder.yml` | Add the explicit Windows NSIS `artifactName` with safe hyphenated `productName/Setup/version/ext` components, eliminating reliance on implicit local-to-upload rename behavior. |
| `scripts/verify-release-assets.mjs` | Retain strict derivation and all integrity checks; update only its explanatory mapping documentation if required to state the explicit configured contract. Do not accept dot aliases or change validation logic. |
| `scripts/verify-release-assets.test.mjs` | Add a v0.3.6 public-inventory regression that proves the absent hyphen installer remains an error while dot/duplicate assets remain informational extras; add configuration-contract coverage if best located here. |
| `AGENTS.md` outside the managed Kanmer block | Update the human-owned release guidance from implicit space-to-dash wording to the explicit stable `Kanmer-Setup-<version>.exe` convention and the strict manifest/upload agreement. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/electron-builder.yml` | Current Windows publishing configuration has no `artifactName`, so NSIS output relies on a default pattern. |
| `scripts/verify-release-assets.mjs` | Expected names are local-artifact-derived and manifest checks must continue to fail missing/mismatched installers, blockmaps, state, size, and digest. |
| `scripts/release.mjs` | Calls the verifier and bounded exact-file recovery from its one local package; its flow, tag order, credential boundary, and publisher count are out of scope. |
| `scripts/release-publish.mjs` | Exact recovery consumes verifier-owned names; do not duplicate or alter that recovery mechanism in this ticket. |
| `scripts/check-updater-package.mjs` | Existing packaged-output rail explains why manifest names and locally generated installer names must resolve deterministically. |
| `scripts/verify-release-assets.test.mjs` | Existing golden fixtures and pure verifier tests are the appropriate dependency-free regression home. |
| `AGENTS.md` | Rule 24 requires documentation when this public artifact convention changes; managed Kanmer block must remain unchanged. |
| [[CORE-099]] publisher scratch | Canonical v0.3.6 preconditions, sole invocation, exact failure, immutable tag SHA, and no-manual-action boundary. |
| v0.3.6 GitHub release metadata and `latest.yml` | Read-only evidence of the mixed names, duplicate blockmap, absence of the manifest-named installer, and public non-draft state. |

## Ripple effects

- Future release preparation/publisher commands remain unchanged but use an unambiguous Windows artifact name.
- The existing verifier and exact-file recovery will operate on the stable hyphenated set; no second package or new uploader is introduced.
- A read-only recheck of v0.3.6 should remain FAIL because its `latest.yml` names an absent installer; that is preserved evidence, not a release-repair instruction.
- [[CORE-099]] stays in Verifying; CORE-100 blocks it until this source defect is independently reviewed, merged, and later proven.

## Out of scope

- `scripts/release.mjs` control flow, `scripts/release-publish.mjs` recovery logic, `.github/workflows/release.yml`, CI permissions, credentials, and Electron package dependencies.
- v0.3.4/v0.3.5/v0.3.6 tags, releases, assets, workflow runs, downloader URLs, publication state, or historical evidence.
- Any release preparation/publisher invocation, tag, release, asset upload, repair, retag, retry, administrative bypass, source branch/worktree, or PR during this planning assignment.

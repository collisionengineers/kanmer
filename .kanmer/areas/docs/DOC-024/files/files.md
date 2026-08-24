# Files — DOC-024

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/release-notes.md` | Add only the v0.3.7 release-note section describing the merged deterministic Windows artifact contract, strict verification boundary, and non-publishing tag workflow. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-021-auto-update.md` | Release notes must name the version before release; packaged updater assets and manifest integrity are release discipline, not a reason to claim an unverified update outcome. |
| `apps/gui/electron-builder.yml` | The merged Windows configuration explicitly sets `artifactName: "${productName}-Setup-${version}.${ext}"`; it is evidence only and must not be edited. |
| `scripts/verify-release-assets.test.mjs` | The strict verifier regression preserves the v0.3.6 missing/mismatched/mixed-artifact failures; no prose may imply alias acceptance or a repaired historical release. |
| `scripts/release-notes.test.mjs` | Focused dependency-free release-notes rail to run after the one-file edit. |
| [[CORE-100]] proof | Confirms merged-main evidence: deterministic future artifact naming, strict verifier preservation, and read-only v0.3.6 historical FAIL. |
| [[DOC-023]] proof | Precedent for wording the governed publisher and non-publishing tag workflow without asserting a publication result. |
| [[CORE-101]] | The dependent successor-release ticket; it remains out of scope and is only unblocked by this documentation merge. |

## Ripple effects

- `scripts/release.mjs` will recognise v0.3.7 because the release notes name it; no release command is run here.
- Electron Builder's GitHub release body will use this prose only during a future separately governed publisher action.
- The focused script test and a one-file PR diff give the relevant documentation evidence.

## Out of scope

- All source/configuration changes, including `apps/gui/electron-builder.yml`, verifier code/tests, release scripts, workflows, manifests, versions, credentials, tags, releases, assets, uploads, repairs, retries, and publishing.
- Any claim that v0.3.6 is successful, fixed, repaired, or a verified updater release.
- [[CORE-101]] preparation, review, merge, publisher invocation, or downstream evidence.

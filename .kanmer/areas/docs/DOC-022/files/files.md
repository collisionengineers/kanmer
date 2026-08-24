# Files — DOC-022

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/release-notes.md` | Add the top-level v0.3.5 user-facing entry describing the non-publishing tag-verification package check and the separate governed publisher. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-021-auto-update.md` | Release discipline requires notes for the version and defines the protected-main/local-publisher boundary. |
| `.github/workflows/release.yml` | Current merged tag verification runs the GUI distribution command with `--publish never`; it is evidence, not a file to change. |
| `scripts/release.mjs` | The local governed publisher owns post-merge publication; wording must not imply tag verification publishes. |
| `scripts/release-notes.test.mjs` | Focused regression command for the release-notes generation path. |
| [[CORE-097]] proof | Exact merged evidence for non-publishing package verification. |
| [[DOC-021]] proof | Precedent for narrow release-notes PR verification and stop condition. |

## Ripple effects

The next governed v0.3.5 preparation can satisfy its release-notes version guard. No version manifest, workflow, script, package artifact, tag, release, or asset changes are included.

## Out of scope

- Any release workflow or publisher implementation change.
- Version bumps, lockfile changes, tags, GitHub Releases, assets, and publication.
- Claims that v0.3.4 acquired a public release or assets.
- CORE-098 and all other ticket scope.

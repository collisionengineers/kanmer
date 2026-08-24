# Files — DOC-023

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/release-notes.md` | Insert the v0.3.6 user-facing entry above v0.3.5, accurately describing pre-tag GUI build protection and non-publishing tag verification. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-021-auto-update.md` | The release discipline and governed publisher boundary that the notes must accurately reflect. |
| `scripts/release.mjs` | Merged publisher ordering: GUI build succeeds before immutable tag creation/push. Evidence only; out of scope to edit. |
| `.github/workflows/release.yml` | Tag workflow explicitly builds/checks with `--publish never`; evidence only; out of scope to edit. |
| `scripts/release-notes.test.mjs` | Focused regression command for release-notes generation/path validity. |
| [[GUI-131]] proof and outcome | Verified merge evidence for the pre-tag source ordering; no release publication was performed. |
| [[DOC-022]] proof | Narrow release-notes-only PR and validation precedent. |

## Ripple effects

The future governed v0.3.6 preparation can pass its release-notes version guard. This documentation does not itself make a tag, release, updater manifest, installer, or asset available.

## Out of scope

- Version manifests, lockfile, workflows, scripts, credentials, publisher source, tags, GitHub Releases, assets, or publication.
- Rewriting historical v0.3.4/v0.3.5 failure records as public releases.
- [[CORE-099]], [[GUI-131]], or any other ticket's implementation/release scope.

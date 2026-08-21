# Research — GUI-092

## Finding

`scripts/release.mjs` currently builds the Windows package with `electron-builder --publish never`, validates that output, commits/tags, then invokes `electron-builder --publish always`. The second command rebuilds NSIS artifacts, so its uploaded installer can differ from the installer whose SHA-512 was written into the first build's `latest.yml`.

The installed Electron Builder version exposes a separate `electron-builder publish` command: `--files` is required, with `--version` and `--policy` available. Official Electron Builder CLI documentation describes it as publishing a list of artifacts, and the local CLI confirms the same contract. That permits one `--publish never` pack, validation of the exact generated `latest.yml`, and upload of those already-built files without a second pack.

`scripts/verify-release-assets.mjs` already derives the local expected asset set and verifies `latest.yml`'s installer URL, size, and SHA-512 against the local installer. Its existing tests cover a deliberately mismatched manifest. Reusing that exact derivation before tag/publish prevents an incoherent local artifact set from becoming a public release.

## Consequences

- Retain one local pack and `check-updater-package.mjs` before commit/tag.
- Derive the publish file list from the version-filtered expected assets; include the installer, blockmap, and `latest.yml` so the updater manifest and binary come from one pack.
- Refuse before publishing if the local set is incomplete or its manifest does not describe the produced installer.
- Use the same artifact list for the bounded repair upload; never rebuild on repair.
- Preserve post-upload GitHub digest verification; it remains the external integrity proof.

## Limits

A real previous-version update install requires a future published release and an installed client. It cannot be honestly simulated by a package build; deterministic local checks and post-publish asset verification are the code-owned evidence.

## Sources

- Local `npx electron-builder publish --help` (Electron Builder 26.15.3): requires `--files`; supports `--version` and `--policy`.
- [Electron Builder CLI](https://www.electron.build/docs/cli/) and [publishing guide](https://www.electron.build/docs/publish/): `publish` uploads a list of artifacts and publishing is explicitly requested.
- `scripts/release.mjs`, `scripts/verify-release-assets.mjs`, and `scripts/verify-release-assets.test.mjs` in this repository.

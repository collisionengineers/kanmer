# Research — GUI-092

## Finding

`scripts/release.mjs` currently builds the Windows package with `electron-builder --publish never`, validates that output, commits/tags, then invokes `electron-builder --publish always`. The second command rebuilds NSIS artifacts, so its uploaded installer can differ from the installer whose SHA-512 was written into the first build's `latest.yml`.

Electron Builder 26.15.3's advertised separate `publish --files` command is not usable with this repository's valid GitHub publisher configuration: a no-network `--policy never` invocation fails schema validation of `configuration.publish`. Passing the loaded publish configuration through its programmatic helper produces the same failure. It therefore cannot safely replace the second package invocation.

A one-package workflow is still available: build the GUI source before committing, keep the existing tag-before-publish ordering, then run exactly one `electron-builder --win --publish always`. That command produces and publishes the installer, blockmap, and `latest.yml` together. Immediately run the existing packed-app checker and a new local manifest-to-installer coherence assertion; retain remote GitHub digest verification.

`scripts/verify-release-assets.mjs` already derives the local expected asset set and verifies `latest.yml`'s installer URL, size, and SHA-512 against the local installer. Its existing tests cover a deliberately mismatched manifest. Reusing that logic locally gives a deterministic assertion of the missing invariant.

## Consequences

- Do not invoke an NSIS-producing `--publish never` build before release; that is the source of the divergence.
- Build the source before commit; package once with `--win --publish always` after the tag is live.
- Run `check-updater-package.mjs` and local manifest coherence directly after that sole package.
- Preserve post-upload GitHub digest verification.
- If remote verification initially observes an incomplete release, re-check once for publication consistency but never rebuild/re-upload automatically: a second package could recreate the mismatch.

## Limits

The packaged-app checker now runs immediately after publishing rather than before it. A failure refuses the script with the public release visible; the operator must mark it prerelease or remediate deliberately. This is a conscious reliability tradeoff: no safe exact-artifact publisher is available in the installed Electron Builder, while a second NSIS build demonstrably corrupts the manifest/installer pairing.

A real previous-version update install requires a future published release and an installed client. It cannot be honestly simulated by a package build; deterministic local checks and post-publish asset verification are the code-owned evidence.

## Sources

- Local `npx electron-builder publish --help` and a no-network `--policy never` probe (Electron Builder 26.15.3).
- [Electron Builder CLI](https://www.electron.build/docs/cli/) and [publishing guide](https://www.electron.build/docs/publish/).
- `scripts/release.mjs`, `scripts/verify-release-assets.mjs`, and `scripts/verify-release-assets.test.mjs` in this repository.

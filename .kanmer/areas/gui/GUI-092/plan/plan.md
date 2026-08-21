# Plan — GUI-092

## Objective

Eliminate the second Windows package build from the release process so the installer and `latest.yml` uploaded to GitHub are generated together from one package.

## Governing docs

- **FRD-021 Auto-update — meets.** Keep the post-package updater-layout check, require the manifest's installer size/SHA-512 to match the exact local installer, and retain post-publish digest verification.

## Steps

1. Add a pure local release-artifact verifier that reuses the existing expected-artifact and manifest pairing rules.
2. Test a valid pairing and an explicit bad manifest SHA-512 case.
3. Preserve source build and commit/tag/push ordering, but remove the pre-publish NSIS package pass.
4. Use exactly one `electron-builder --win --publish always` invocation after the tag is live; immediately check the packed app and local manifest/installer coherence.
5. Replace automatic re-pack repair with one remote re-check, then refuse with manual recovery guidance, so a mismatch cannot be recreated by a second NSIS package.
6. Run deterministic script tests, type/build/package checks, dry-run diagnostics, and diff check. A real installed-client update remains a next-release external acceptance, not simulated proof.

## Risks and mitigations

- **Post-publication package rail:** the package check moves after the sole publish; a failure refuses and requires deliberate operator remediation, but never publishes a second non-reproducible installer.
- **Manifest mismatch:** fail the release script after its sole pack through the shared local coherence verifier, and preserve remote verification.
- **Remote availability race:** one re-check is bounded and never generates another artifact.

## Proof

- Script tests prove local manifest mismatch fails.
- A `--win --publish never` packaging analogue plus `check-updater-package.mjs` proves the sole package shape.
- `release.mjs --dry-run` describes one Windows package.
- The next authorized release must provide the real prior-version updater install evidence; this ticket does not cut a release.

# Plan — GUI-092

## Objective

Eliminate the second Windows package build from the release process so the installer and `latest.yml` uploaded to GitHub are generated together from one validated pack.

## Governing docs

- **FRD-021 Auto-update — meets.** Preserve the existing package preflight and require the manifest's installer size/SHA-512 to match the exact local installer before publication; retain post-publish digest verification.

## Steps

1. Add a pure local release-artifact verifier that reuses the existing expected-artifact and manifest pairing rules.
2. Test a valid pairing and explicit bad manifest size/SHA-512 cases.
3. After the sole `--publish never` package build, derive/sanity-check the versioned publish file set and refuse if local coherence fails.
4. Keep commit/tag/push ordering, then use Electron Builder's `publish --files` command with explicit `always` policy to upload that exact file set.
5. Reuse the same prebuilt file list for the one bounded repair upload, while retaining remote asset verification.
6. Run deterministic script and release dry-run checks. A real installed-client update remains a next-release external acceptance, not simulated proof.

## Risks and mitigations

- **Publisher file selection:** derive it from the existing version-filtered expected set, rather than duplicating names.
- **Manifest mismatch:** fail before tag/publish through the shared local coherence verifier.
- **Release repair regression:** upload the same validated files rather than rerunning packaging.

## Proof

- Script tests prove local manifest mismatch fails.
- `release.mjs --dry-run` shows a single pack followed by artifact-list publishing.
- The next authorized release must provide the real prior-version updater install evidence; this ticket does not cut a release.

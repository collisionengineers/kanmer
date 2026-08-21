# Post-implementation report — GUI-093

## Summary

The release rail now treats a non-zero Electron Builder publisher exit as an untrusted signal rather than an immediate release verdict. It validates the single local package and the public release; a complete byte-verified release succeeds even after the known 422 already-exists race. An incomplete release receives one exact-file GitHub upload repair from that same package, then one final remote verification. Recovery cannot invoke Electron Builder, preserving [[GUI-092]]'s manifest/installer pairing.

## Changes

| File | Change | Why |
|---|---|---|
| scripts/release.mjs | Retains the one publisher error, executes the post-package and remote proof rails, delegates the bounded remote recovery decision, and uploads only exact existing assets with gh release upload --clobber. | The former execSync throw made verification unreachable after the production 422, while GUI-092 forbids a second package. |
| scripts/release-publish.mjs | Added pure exact-upload-spec construction and an injectable verify/repair state machine. | Keeps the release decision deterministic and proves recovery has no capability to create another NSIS package. |
| scripts/release-publish.test.mjs | Added node:test coverage for complete-after-422 success, partial repair, repair failure, a single-attempt bound, verifier failure, and explicit GitHub names. | Locks the real v0.3.3 failure shape and the no-second-package constraint into npm run test:scripts. |

## Governing docs

- **FRD-021 Auto-update — meets.** The release process still verifies the visible latest release and remote installer/blockmap/manifest integrity. It now performs that proof after a potentially partial publisher failure and repairs only exact artifacts from the single local package before its bounded final check.
- No governing document changed. The implementation is release-rail reliability work within the existing FRD; it does not modify updater runtime behaviour.

## Risks / follow-ups

- A local package/checker failure still refuses before exact-file recovery because there is no safe artifact set to upload.
- A GitHub API or gh upload failure remains a refusal with manual remediation and re-verification guidance; the script does not demote a public release automatically.
- [[GUI-068]] owns the external next-release installed-client acceptance. No tag, release, or production upload was made for this ticket.

## Verification hand-off

On merged main run:

- npm run test:scripts — expected all dependency-free suites to pass, including release-publish tests.
- npm run typecheck — expected all workspaces to pass.
- npm run build -w @kanmer/gui — expected Electron Vite build to pass.
- node --check scripts/release.mjs and git diff --check — expected clean.
- With release credentials deliberately absent, node scripts/release.mjs 0.3.4 --dry-run — expected preflight refusal before any mutation, stating that a GitHub token is required.

Do not run a real release or publish-always packaging as ticket verification.

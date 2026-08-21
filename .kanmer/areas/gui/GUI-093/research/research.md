# Research — GUI-093: recover release verification after publisher failure

## Question

How can the release rail retain externally-verifiable asset integrity checks when Electron Builder exits non-zero after it may already have created a GitHub release or uploaded some assets, while preserving [[GUI-092]]'s one-package invariant?

## Findings

- scripts/release.mjs:365-372 currently executes the single Electron Builder publish command through run(). run() uses execSync, so any non-zero publisher exit prevents the local package checks, visible-release check, remote asset verification, bounded recovery, and its diagnostic from running.
- The GUI-093 incident records a real Electron Builder 422 already_exists after the release and installer had already been created. Therefore a publisher exit code is not sufficient evidence that no public release exists, and is not sufficient evidence that the published asset set is unusable.
- scripts/verify-release-assets.mjs exposes expectedAssets(), verifyLocalArtifacts(), and verifyRelease(). The verifier derives the exact local installer, blockmap, and manifest; maps disk spaces to GitHub dashes; checks remote state/size/digest; and can distinguish a broken expected local set from an incomplete remote release.
- [[GUI-092]] changes the release rail to create exactly one NSIS package. Its research, plan, report, and commit d7ade00 state that a second Electron Builder package can produce an installer that disagrees with latest.yml. GUI-093 must not re-run Electron Builder as recovery.
- The GUI-093 record documents the safe manual repair used for v0.3.3: upload the already-built exact assets with gh release upload --clobber, including explicit dashed GitHub names, then re-run verify-release-assets.mjs. This repairs remote bytes without creating another package.
- scripts/verify-release-assets.test.mjs is dependency-free node:test coverage run by npm run test:scripts. The publication decision itself is currently top-level in release.mjs, so it needs a small injectable helper before its failure/fall-through branches can be tested without a real tag, token, package, or GitHub release.
- docs/functional/frd/FRD-021-auto-update.md requires release discipline that avoids silent updater failure. It is met by a bounded, exact-artifact recovery followed by a new remote integrity check; it does not authorize a second package.

## Implications

The release script should retain the publisher error, continue through the single package's local rails and remote visibility/integrity checks, then make its decision from authoritative external evidence:

1. Complete remote assets after a publisher error are a successful release (the 422 was a publisher-side false negative).
2. Incomplete assets receive one exact-file gh release upload --clobber repair using the already-produced local assets, never another Electron Builder run.
3. The script re-verifies once and refuses with actionable diagnostics if the upload or verification still fails.

The recovery and its command construction should be isolated behind dependency-injected operations and covered by deterministic script tests. No new user/product decision is needed: the existing ticket records the required repair, and GUI-092 supplies the no-second-package constraint.

## Open questions

- None. The existing GUI-093 incident record and GUI-092 one-package constraint determine the safe implementation.

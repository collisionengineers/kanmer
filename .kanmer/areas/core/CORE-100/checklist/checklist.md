# Checklist — CORE-100

## Planning record

- [x] Read the complete CORE-100 ticket, resolved gates, linked [[CORE-099]] and [[GUI-131]], [[HZN-007]] context, FRD-021, and the exact retained CORE-099 publisher result.
- [x] Compare the strict release verifier/release call path, Electron Builder configuration/version/schema, updater-package checks, existing verifier tests, and read-only public v0.3.6 asset inventory plus `latest.yml`.
- [x] Resolve that alias acceptance is unsafe: the manifest names the absent hyphen installer, so dotted v0.3.6 assets cannot constitute a complete updater release.
- [x] Record a forward-only source/test/documentation plan; retain v0.3.4, v0.3.5, and v0.3.6 failure/publication evidence untouched.

## Implementation

- [x] Take CORE-100 only after an authorized boundary crossing, in its own recorded worktree and branch based on current `origin/main`.
- [x] Add `artifactName: "${productName}-Setup-${version}.${ext}"` under Electron Builder `win:`; do not alter Electron packaging dependencies, workflows, credentials, release publisher code, or existing tags/releases/assets.
- [x] Preserve all functional verifier logic and integrity checks; no explanatory verifier edit was required by the explicit-name contract.
- [x] Add a configuration-contract regression and the exact v0.3.6 tag-workflow/public regression for all four name/byte-integrity failures in `scripts/verify-release-assets.test.mjs`; do not weaken existing assertions.
- [x] Update only the human-owned release guidance in `AGENTS.md` with the explicit hyphenated installer and manifest/upload agreement; leave the managed Kanmer block unchanged.
- [x] Run and record `node --test scripts/verify-release-assets.test.mjs`, `node --test scripts/check-updater-package.test.mjs`, `npm run test:scripts`, `npm run verify:agents-block`, and `npm run verify:docs`; package with `npm run dist -w @kanmer/gui -- --publish never` plus `node scripts/check-updater-package.mjs` so publishing stays explicitly disabled.
- [x] Run the authoritative `npm run verify` from a fresh GitHub-origin normal checkout at `fb501a0487dc4314e432054c7ef01336b5d67f25`; exit 0, with all rails recorded in `scratch/execute.md`.
- [x] Read-only recheck v0.3.6 against the strict verifier and retain the expected missing-manifest-named-installer FAIL (or an exact INCONCLUSIVE); no upload, repair, tag, release, retag, retry, or publisher invocation.
- [ ] Write the post-implementation report, open a ticket-footed PR, and move exactly one boundary to Review. Stop for independent review; do not self-review, merge, publish, or write proof.
- [ ] After independent merge and proof, defer any actual successor release to its separate ticket and governed single-invocation protocol.

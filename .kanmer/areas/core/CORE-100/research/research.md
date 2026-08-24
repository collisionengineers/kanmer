# Research — CORE-100: Electron Builder release asset naming

## Question

What is the smallest source/test/documentation change that makes future Electron Builder NSIS artifacts, `latest.yml`, the GitHub upload, and the strict release verifier agree—without accepting the mixed v0.3.6 public asset set as complete?

## Findings

- The sole CORE-099 publisher invocation completed its release rail and pre-tag GUI build, then created v0.3.6 and a public release before exiting 1. Its retained publisher scratch records no external retry, repair, release edit, or upload after the script's one bounded internal recovery.
  - Source: [[CORE-099]] `scratch/publisher-v036-result.md`.
- The public v0.3.6 release contains one dot-form installer, dot-form blockmap, an additional hyphen-form blockmap, `latest.yml`, and the MCPB. It has **no** `Kanmer-Setup-0.3.6.exe`.
  - Public read-only GitHub release metadata: `Kanmer.Setup.0.3.6.exe` (79,999,540 bytes); `Kanmer.Setup.0.3.6.exe.blockmap` and `Kanmer-Setup-0.3.6.exe.blockmap` (both 83,041 bytes); `latest.yml`; `kanmer-0.3.6.mcpb`.
- The published `latest.yml` names `Kanmer-Setup-0.3.6.exe` in both `files[0].url` and `path`. That public URL does not name a present release installer, so v0.3.6 is genuinely incomplete for an updater client; changing the verifier to accept the dot artifact would not repair the manifest mismatch.
  - Source: read-only v0.3.6 `latest.yml` asset.
- `scripts/verify-release-assets.mjs` correctly derives a hyphen safe name from the local default NSIS file name and strictly validates presence, uploaded state, size, SHA-256 digest, and the manifest's installer URL/size/SHA-512 bridge. Its existing mapping is not safely broadened to accept dot aliases.
  - Source: verifier `githubName`, `expectedAssets`, `verifyAssets`, and `sanityCheckExpected`.
- `apps/gui/electron-builder.yml` leaves `win.artifactName` unspecified. Electron Builder's NSIS default local name contains spaces, while the builder/publisher path is responsible for a safe upload name. The v0.3.6 mixed result proves that relying on that implicit naming path is not an acceptable release contract.
  - Source: current Electron Builder config; current lockfile pins `electron-builder` 26.15.3; local Electron Builder schema accepts `WindowsConfiguration.artifactName`.
- Electron Builder's local source and current AGENTS guidance describe a space-to-hyphen safe-name path, which matches the `latest.yml` convention and existing verifier. The public dot-form upload diverged from that convention; an explicit already-safe Windows artifact pattern removes the ambiguity rather than weakening validation.
  - Source: `app-builder-lib` NSIS/platform packager source, `scripts/check-updater-package.mjs`, and AGENTS.md release guidance.

## Implications

The minimal forward fix is **not** to make `verify-release-assets.mjs` accept both names. Set an explicit `win.artifactName` to `${productName}-Setup-${version}.${ext}`, so the local NSIS artifact, `latest.yml`, safe upload name, verifier expectation, and updater URL share one already-safe hyphenated name. Keep the verifier's strict mapping/size/digest/manifest checks. Add a regression that pins the explicit configuration and one that encodes the exact mixed v0.3.6 inventory as a required failure. Update the human-owned AGENTS release guidance because this is a contributor-facing public-artifact convention. v0.3.6 remains a preserved FAIL after a read-only recheck; only a separately governed successor release may demonstrate the forward fix.

## Open questions

No planning question remains. The observed public v0.3.6 state is sufficient to reject alias acceptance: the missing hyphen installer named by `latest.yml` is independently conclusive.

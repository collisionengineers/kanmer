# Research — CORE-101: v0.3.7 governed successor release

## Question

What exact successor-release sequence can publish and prove v0.3.7 after the repaired future artifact contract, without changing the immutable v0.3.4, v0.3.5, or v0.3.6 records or bypassing protected-main review?

## Findings

- CORE-101 is in Preparing, has no ticket documents yet, and is typed-blocked by [[DOC-024]]. DOC-024 is also Preparing; it owns the v0.3.7 release notes and must reach Done before CORE-101 is taken or either release-script phase begins.
  - Sources: CORE-101 item, links, gates; DOC-024 item/gates, read 2026-08-24.
- Current protected `main` is `41408981ae78364f1d64e3d3b3db3c1ec67d96d1` and reports version 0.3.6. It includes [[CORE-100]]'s verified explicit Windows `artifactName: "${productName}-Setup-${version}.${ext}"` contract; current release notes still name 0.3.6, so DOC-024 must provide the required 0.3.7 wording first.
  - Sources: read-only `git ls-remote origin refs/heads/main`; GitHub main files `package.json`, `apps/gui/electron-builder.yml`, and `apps/gui/release-notes.md`.
- [[CORE-099]] produced an immutable v0.3.6 tag/release whose strict public verification failed. Its report and [[CORE-100]] proof preserve the absent manifest-named installer plus blockmap size/digest and `latest.yml` digest mismatches. Neither ticket authorizes repair, retry, retag, manual upload, or release editing.
  - Sources: CORE-099 report/item/checklist and CORE-100 report/proof, read 2026-08-24.
- `npm run release -- <version> --ticket <id>` is the preparation phase. From a clean exact `main` clone, it runs the shared verification rail, creates only `release/v<version>`, regenerates versioned artifacts, and opens a ticket-footed PR. It stops before tag or publication.
  - Source: current `scripts/release.mjs` on protected main.
- `npm run release -- <version> --publish --release-commit <full-merge-sha>` is the separate publisher phase. It requires clean merged main, matching manifests, an exact reachable merge SHA, and a credential only in the publisher process environment. The GUI build is awaited before any tag push; the script then creates/pushes the one tag, packages/publishes once, and strictly verifies visibility plus required asset state, size, digest, and manifest bridge.
  - Source: current `scripts/release.mjs`; the pre-tag GUI-build property is also proven by GUI-131 and CORE-099 context.
- The tag workflow is an independent, non-publishing `release-verify` job. It runs `npm run verify`, `npm run dist:check`, then bounded read-only strict asset verification; it has read-only contents permission and must reach terminal success for the release evidence to be complete.
  - Source: `.github/workflows/release.yml`.
- FRD-021 requires a protected-main PR/check boundary, version-specific release notes, packaged updater proof, and externally verifiable release artifacts. HZN-007 requires adjacent stages, exact evidence, no secret disclosure, and no author self-review or merge.
  - Sources: `docs/functional/frd/FRD-021-auto-update.md`; [[HZN-007]] `context.md`.

## Implications

CORE-101 must remain a plan-only hold until DOC-024 is Done. Authorized execution later has two and only two state-changing release invocations: one clean-origin-clone preparation and, after independent review/normal merge, one separate clean-origin-clone publisher. Both bind the canonical board through process-scoped `KANMER_ROOT`; no publisher credential is introduced before the second phase. A failure in either phase is terminal evidence, not permission for an outer retry, manual repair, retag, upload, release edit, or administrative bypass. Strict public asset/latest.yml verification and the terminal tag workflow are required evidence, not weaker substitutes.

## Open questions

No user decision remains. The hard DOC-024 completion dependency is recorded as a hold condition rather than assumed satisfied.

# Research — CORE-099: v0.3.6 successor release

## Question

What controlled successor-release sequence can produce v0.3.6 evidence without modifying the retained failed v0.3.4/v0.3.5 records, bypassing protected main, or broadening release authority?

## Findings

- [[CORE-099]] records v0.3.4 and v0.3.5 as immutable failed local-publication attempts with no GitHub Release or public assets. Its constraints prohibit altering, recreating, retrying, manually repairing, or force-moving either record.
  - Source: CORE-099 ticket body, read 2026-08-24.
- [[DOC-023]] is the sole typed dependency (`blockedBy`) and is currently Preparing with no pipeline documents. Its body owns the v0.3.6 release-notes update and explicitly says CORE-099 cannot generate a release-preparation PR until it has merged.
  - Source: CORE-099 links and DOC-023 item, read 2026-08-24.
- The merged [[GUI-131]] proof records that publisher mode synchronously runs `npm run build -w @kanmer/gui` after merged-manifest/reachability preconditions and before `git tag` and tag push. A GUI build failure therefore stops before a tag, GitHub Release, or asset upload.
  - Source: GUI-131 proof at merged commit `3abef518bedbe79647070a84038779644fbc0fa2`.
- Current `scripts/release.mjs` has two supported phases. Preparation requires clean `main`, runs the shared verification rail, creates only `release/v<version>`, generates the version artifacts, and opens a PR with the supplied Kanmer footer. Publish requires clean merged main, matching manifests, a full reachable release-commit SHA, and a token only in the publisher process environment; it creates/pushes only `refs/tags/v<version>`, then runs the single package/publisher and public asset checks.
  - Source: `scripts/release.mjs` at `origin/main`, read 2026-08-24.
- FRD-021 R3 requires the protected-main PR/check boundary, release notes naming the version, and `dist:check` proving a self-updatable package. It does not authorize a manual release repair path or an administrative merge bypass.
  - Source: `docs/functional/frd/FRD-021-auto-update.md`.
- [[CORE-036]] and [[CORE-042]] are downstream verification records. CORE-099 blocks them, but their own acceptance criteria and stages remain independent; the ticket body permits only scoped evidence appendices.
  - Source: CORE-099 links plus CORE-036/CORE-042 ticket and proof records.

## Implications

The sole safe path is a new v0.3.6 release after DOC-023 is Done: one freshly checked clean GitHub-origin clone for one preparation invocation with process-scoped `KANMER_ROOT`; independent review and normal protected-main merge; then one new clean merged-main clone for one publisher invocation with the credential scoped only to that process. Every failure is terminal for that phase and is recorded without a retry, retag, manual asset upload/repair, release edit, or bypass. The single release-script invocation remains responsible for its own existing bounded behavior; no operator must add an out-of-band repair.

## Open questions

No open planning question remains. The hard DOC-023 dependency is a hold condition, not an assumption: CORE-099 remains Preparing until DOC-023 is Done.

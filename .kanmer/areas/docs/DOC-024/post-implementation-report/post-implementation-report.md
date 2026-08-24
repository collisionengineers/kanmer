# Post-implementation report — DOC-024

## Summary

Added only the v0.3.7 release-notes section. It documents the merged forward Windows artifact contract: an explicit `Kanmer-Setup-<version>.exe` installer agrees with `latest.yml`; strict verification still rejects missing, mismatched, and mixed artifact sets; and tag-triggered verification remains non-publishing. It makes no claim that v0.3.6 succeeded and performs no release action.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/release-notes.md` | Added the top-level `## 0.3.7` section with deterministic filename/manifest agreement, strict verifier, and non-publishing tag-workflow wording. | Supplies the accurate required release body before the separately governed v0.3.7 successor-release preparation. |

## Governing docs

- **`docs/functional/frd/FRD-021-auto-update.md` — met.** The notes name the release version for the release-notes guard and accurately describe the existing artifact/manifest integrity discipline. No FRD is modified.
- **[[HZN-007]] — met.** The change is ticket-scoped and one-file only. It preserves the v0.3.6 historical FAIL, opens a PR for independent review, and does not publish, tag, create a release, upload, or repair assets.

## Risks / follow-ups

- The focused release-notes script test validates rendering/link behaviour rather than this prose verbatim; the one-file diff and direct wording inspection are retained alongside it.
- v0.3.6 remains an incomplete historical public release. This ticket does not repair, reclassify, or describe it as successful.
- [[CORE-101]] remains the separate successor-release owner. It is not taken, advanced, or otherwise changed here.

## Verification hand-off

- `npm run build -w @kanmer/core` — exit 0.
- `node --test scripts/release-notes.test.mjs` — exit 0, 1/1.
- `git diff --check` — exit 0.
- `git diff --name-only` and tracked status — only `apps/gui/release-notes.md`.
- On merged main, rerun the core build prerequisite and focused release-notes test, then inspect the v0.3.7 wording and one-file merge diff. Do not run a publisher, tag, GitHub Release, upload, repair, or workflow mutation as DOC-024 verification.

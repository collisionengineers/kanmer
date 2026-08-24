# Post-implementation report — DOC-023

## Summary

Added the v0.3.6 release-notes section as the sole source change. It accurately states that the governed local publisher builds the Windows GUI before tag creation/push, so a GUI-build failure stops before tag or GitHub Release publication, while tag-triggered workflow remains non-publishing package verification.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/release-notes.md` | Added the top-level `## 0.3.6` entry with the pre-tag GUI-build and non-publishing-workflow boundary. | Required user-facing wording for the governed v0.3.6 successor release; preserves the historical v0.3.4/v0.3.5 failure boundary. |

## Governing docs

- **`docs/functional/frd/FRD-021-auto-update.md`** — the notes give v0.3.6 an accurate release body before governed preparation and preserve the separate responsibilities of local publication and tag-workflow verification. No governing document is modified.

## Risks / follow-ups

- No release behavior, workflow, credential, version, tag, GitHub Release, asset, or publisher-source change is in this PR.
- The future successor preparation/publisher/public-asset work remains with [[CORE-099]] after independent review and merge.
- Initial focused test attempt exited `1` because a fresh worktree lacked generated `packages/core/dist/index.js`; this is preserved in scratch. After `npm run build -w @kanmer/core` exited `0`, the focused test passed. The initial failure is not discarded.

## Verification hand-off

- In this worktree, `npm run build -w @kanmer/core` exited `0`.
- Initial `node --test scripts/release-notes.test.mjs` exited `1` for the missing generated core artifact; after the prerequisite build it exited `0` with 1/1 test passing.
- `git diff --check` exited `0`; the committed diff contains only `apps/gui/release-notes.md` (12 insertions).
- On merged main, run `npm run build -w @kanmer/core`, then `node --test scripts/release-notes.test.mjs`, and inspect the v0.3.6 release-notes section and one-file merge diff. Do not publish, tag, or create release assets as part of DOC-023 verification.

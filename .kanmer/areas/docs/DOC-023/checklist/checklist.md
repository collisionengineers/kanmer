# Checklist — DOC-023

- [x] Add the accurate `## 0.3.6` release-notes entry above v0.3.5.
- [x] Confirm the wording distinguishes pre-tag publisher GUI build from non-publishing tag verification and makes no public-release claim for v0.3.4/v0.3.5.
- [x] Run `node --test scripts/release-notes.test.mjs` and record its exit code.
- [x] Run `git diff --check` and inspect the one-file diff/name-only range.
- [x] Commit the one-file change, push the ticket branch, and open a PR containing `Kanmer: DOC-023`.
- [x] Write the post-implementation report with changed-file, FRD, risk, and verification hand-off.
- [x] Move DOC-023 to Review and stop for an independent reviewer.

## Progress notes

- 2026-08-24: initial focused test exit 1 because fresh worktree lacked `packages/core/dist/index.js`; retained in scratch. After `npm run build -w @kanmer/core` exit 0, focused test exit 0 (1/1), final `git diff --check` exit 0, and only `apps/gui/release-notes.md` changed.

- 2026-08-24: committed `18619b55e543cc43dfbb4eef90f1b0584e886a14` — one file, 12 insertions. Post-implementation report records all focused-check outcomes.

- 2026-08-24: pushed `doc-023-v036-release-notes`; opened PR #249 at `18619b55e543cc43dfbb4eef90f1b0584e886a14` with `Kanmer: DOC-023`.

- 2026-08-24: moved to Review after PR #249 opened; author stops here for an independent reviewer.

## Closeout

- [x] Confirm PR #249 is merged at `d1d61506435151b73dc04c9fcff18c74656ab4a8`.
- [x] Record merge traceability and Outcome.
- [x] Remove the recorded ticket worktree and branches, then prune.
- [ ] Release the completed ticket take.

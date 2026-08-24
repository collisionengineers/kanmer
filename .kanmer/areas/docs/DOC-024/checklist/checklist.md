# Checklist — DOC-024

## Implementation

- [x] Create the recorded DOC-024 worktree and branch from current protected `origin/main`; take the ticket into Implementing.
- [x] Add only the top-level v0.3.7 section in `apps/gui/release-notes.md` with the explicit deterministic filename/updater-manifest agreement.
- [x] State that strict asset verification still rejects missing, mismatched, and mixed artifacts; do not call v0.3.6 successful or imply alias acceptance.
- [x] State that tag-triggered verification remains non-publishing; do not modify or invoke any workflow, publisher, tag, release, upload, or repair.
- [x] Inspect tracked diff and confirm it is the one intended release-notes file with no version/config/source/workflow/credential changes.
- [x] Build the focused-test prerequisite if required and run `node --test scripts/release-notes.test.mjs`; record every exit.
- [x] Run `git diff --check` and record the one-file scope result.
- [ ] Write the post-implementation report, commit the one-file change, push the branch, and open a PR with `Kanmer: DOC-024`.
- [ ] Move exactly one boundary to Review and stop for independent review; do not self-review, merge, publish, or write proof.

## Progress notes

Planning records the user-specified release-note wording as the approval boundary: only `apps/gui/release-notes.md` may change.

- 2026-08-25: clean dedicated worktree created at current `origin/main` `41408981ae78364f1d64e3d3b3db3c1ec67d96d1`; core build exit 0; focused `node --test scripts/release-notes.test.mjs` exit 0 (1/1); `git diff --check` exit 0; tracked diff/status name only `apps/gui/release-notes.md`. No release-side command was run.

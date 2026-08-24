# Checklist — DOC-024

## Implementation

- [ ] Create the recorded DOC-024 worktree and branch from current protected `origin/main`; take the ticket into Implementing.
- [ ] Add only the top-level v0.3.7 section in `apps/gui/release-notes.md` with the explicit deterministic filename/updater-manifest agreement.
- [ ] State that strict asset verification still rejects missing, mismatched, and mixed artifacts; do not call v0.3.6 successful or imply alias acceptance.
- [ ] State that tag-triggered verification remains non-publishing; do not modify or invoke any workflow, publisher, tag, release, upload, or repair.
- [ ] Inspect tracked diff and confirm it is the one intended release-notes file with no version/config/source/workflow/credential changes.
- [ ] Build the focused-test prerequisite if required and run `node --test scripts/release-notes.test.mjs`; record every exit.
- [ ] Run `git diff --check` and record the one-file scope result.
- [ ] Write the post-implementation report, commit the one-file change, push the branch, and open a PR with `Kanmer: DOC-024`.
- [ ] Move exactly one boundary to Review and stop for independent review; do not self-review, merge, publish, or write proof.

## Progress notes

Planning records the user-specified release-note wording as the approval boundary: only `apps/gui/release-notes.md` may change.

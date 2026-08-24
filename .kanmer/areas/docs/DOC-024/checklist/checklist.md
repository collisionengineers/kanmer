# Checklist — DOC-024

## Implementation

- [x] Create the recorded DOC-024 worktree and branch from current protected `origin/main`; take the ticket into Implementing.
- [x] Add only the top-level v0.3.7 section in `apps/gui/release-notes.md` with the explicit deterministic filename/updater-manifest agreement.
- [x] State that strict asset verification still rejects missing, mismatched, and mixed artifacts; do not call v0.3.6 successful or imply alias acceptance.
- [x] State that tag-triggered verification remains non-publishing; do not modify or invoke any workflow, publisher, tag, release, upload, or repair.
- [x] Inspect tracked diff and confirm it is the one intended release-notes file with no version/config/source/workflow/credential changes.
- [x] Build the focused-test prerequisite if required and run `node --test scripts/release-notes.test.mjs`; record every exit.
- [x] Run `git diff --check` and record the one-file scope result.
- [x] Write the post-implementation report, commit the one-file change, push the branch, and open a PR with `Kanmer: DOC-024`.
- [x] Move exactly one boundary to Review and stop for independent review; do not self-review, merge, publish, or write proof.

## Progress notes

Planning records the user-specified release-note wording as the approval boundary: only `apps/gui/release-notes.md` may change.

- 2026-08-25: clean dedicated worktree created at current `origin/main` `41408981ae78364f1d64e3d3b3db3c1ec67d96d1`; core build exit 0; focused `node --test scripts/release-notes.test.mjs` exit 0 (1/1); `git diff --check` exit 0; tracked diff/status name only `apps/gui/release-notes.md`. No release-side command was run.

- 2026-08-25: committed `fc46f34294d64c50c8d464aa364397bfd37a20ab`, pushed `doc-024-v037-release-notes`, and opened PR #252 at that exact head with the required `Kanmer: DOC-024` footer. Hosted `verify` is queued and `kanmer-gate` is in progress; neither has been reviewed or rerun by the author.

- 2026-08-25: moved one boundary from Implementing to Review. Stop condition reached: independent review owns the exact PR head and any merge; author will not review, merge, publish, tag, upload, repair, or write proof.

## Closeout — DOC-024

- [x] PR merge verified: [#252](https://github.com/collisionengineers/kanmer/pull/252) is MERGED at 2026-08-24T23:39:10Z.
- [x] proof.md finalised with PR URL, merge SHA, merged-main evidence, and preserved inspection limitations.
- [x] Moved to final stage.
- [ ] Outcome recorded in ticket body (PR link, follow-ups).
- [ ] Returned to main checkout; remove `.worktrees/doc-024`.
- [ ] Delete `doc-024-v037-release-notes` (`-D` only if the verified squash merge leaves it non-ancestor).
- [ ] Prune remote/worktree metadata.
- [ ] Release the ticket after cleanup.

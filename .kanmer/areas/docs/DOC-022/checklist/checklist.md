# Checklist — DOC-022

- [x] Create the isolated DOC-022 worktree/branch at current origin/main and take the ticket through Kanmer.
- [x] Add only the accurate v0.3.5 release-notes section to `apps/gui/release-notes.md`.
- [x] Inspect the rendered Markdown/diff for the explicit non-publishing verification and separate governed publisher boundary.
- [ ] Run `node --test scripts/release-notes.test.mjs`.
- [ ] Run `git diff --check` and confirm the diff path census is release-notes only.
- [ ] Commit, push, and open the PR with `Kanmer: DOC-022`; record its URL and exact head SHA.
- [ ] Write the post-implementation report and move DOC-022 to Review for independent review.

## Progress notes

- 2026-08-24: The first focused test invocation exited 1 before running its assertion because this new clean worktree lacked `packages/core/dist/index.js`. The planned `npm run build:core` prerequisite and same test rerun follow; no source/test change was made for this environment failure.

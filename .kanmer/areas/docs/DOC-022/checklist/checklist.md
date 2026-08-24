# Checklist — DOC-022

- [x] Create the isolated DOC-022 worktree/branch at current origin/main and take the ticket through Kanmer.
- [x] Add only the accurate v0.3.5 release-notes section to `apps/gui/release-notes.md`.
- [x] Inspect the rendered Markdown/diff for the explicit non-publishing verification and separate governed publisher boundary.
- [x] Run `node --test scripts/release-notes.test.mjs`.
- [x] Run `git diff --check` and confirm the diff path census is release-notes only.
- [x] Commit, push, and open the PR with `Kanmer: DOC-022`; record its URL and exact head SHA.
- [x] Write the post-implementation report and move DOC-022 to Review for independent review.

## Progress notes

- 2026-08-24: The first focused test invocation exited 1 before running its assertion because this new clean worktree lacked `packages/core/dist/index.js`. The planned `npm run build:core` prerequisite and same test rerun follow; no source/test change was made for this environment failure.
- 2026-08-24: `npm run build:core` exited 0. The unchanged focused test then exited 0 (1/1 pass). The release-note wording inspection and `git diff --check` both exited 0; the uncommitted path census was exactly `apps/gui/release-notes.md`.
- 2026-08-24: Commit `8a71a423c9dd3e210367af5a26357a6c52e6f364` was pushed on `doc-022-v035-release-notes`; PR [#246](https://github.com/collisionengineers/kanmer/pull/246) is open with the required `Kanmer: DOC-022` footer.
- 2026-08-24: Post-implementation report written and the ticket moved Implementing → Review. Await independent review; author must not review or merge.

## Closeout — DOC-022

- [x] PR merge verified (`gh pr view --json state,mergedAt`): [#246](https://github.com/collisionengineers/kanmer/pull/246) is `MERGED` at 2026-08-24T20:47:30Z, merge `e63a1090bfbda89f473a422817629eaadd1ed264`.
- [x] proof.md finalised with the PR URL, merge date, exact merged SHA, and focused evidence.
- [x] Moved to final stage (Done).
- [ ] Outcome recorded in ticket body (PR link, follow-ups).
- [ ] Returned to a safe checkout; remove `.worktrees/doc-022`.
- [ ] Delete `doc-022-v035-release-notes` (force only if its squash merge leaves it non-ancestor).
- [ ] Run `git fetch --prune origin` and `git worktree prune`.
- [ ] Release the ticket take record.

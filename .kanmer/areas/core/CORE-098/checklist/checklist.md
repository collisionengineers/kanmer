# Checklist — CORE-098

## Hold and preparation

- [ ] Wait for [[DOC-022]] to merge normally; record its PR and merge SHA and confirm merged `apps/gui/release-notes.md` names 0.3.5.
- [ ] Read fresh GitHub `main` and create a new clean **normal clone** at that exact SHA; prove it is clean/on `main` and that `release/v0.3.5` and `v0.3.5` do not already exist.
- [ ] Install locked dependencies in that clone without changing the lockfile or creating a new board.
- [ ] Run exactly one preparation command: `npm run release -- 0.3.5 --ticket CORE-098`.
- [ ] Record all preparation exits, fresh-main SHA, generated commit/head, PR, script-generated changed-file set, and `git diff --check`; stop on any failure or unexpected diff.
- [ ] Write the implementation report and enter Review only after the generated release PR is open.

## Independent review and merge

- [ ] Obtain an independent review of the exact release PR head and resolve every required check/finding.
- [ ] Merge only through the normal protected-main path; record the full merge SHA. The author does not review, merge, or bypass protection.

## Publication and release evidence

- [ ] Create a second clean normal clone at that merged SHA; supply any publisher credential only to the publisher process environment, never source, ticket, CI configuration, or output.
- [ ] Run exactly one publisher command: `npm run release -- 0.3.5 --publish --release-commit <full-merged-sha>`.
- [ ] Record whether the canonical publisher used its bounded internal exact-file recovery; do not perform a manual upload, repair, retag, or second package.
- [ ] Verify the immutable `v0.3.5` tag target, public non-draft GitHub Release, and expected assets with `node scripts/verify-release-assets.mjs 0.3.5`.
- [ ] Wait for the tag-triggered read-only `release-verify` workflow to pass; record its URL and terminal result.
- [ ] Append only scoped v0.3.5 facts to [[CORE-036]] and [[CORE-042]] without changing their stage or claiming their independent criteria pass.
- [ ] Hand off merged-main proof and final stage decision to an independent verifier; do not self-verify or close out.

## Current assignment boundary

- [x] Research and plan the successor release without source, tag, package, publisher, or PR action.
- [x] Hold CORE-098 in Implementing with its dedicated clean recorded worktree/branch until DOC-022 merges.

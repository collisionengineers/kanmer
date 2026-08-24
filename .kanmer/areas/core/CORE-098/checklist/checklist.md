# Checklist — CORE-098

## Hold and preparation

- [x] Wait for [[DOC-022]] to merge normally; its PR #246 merged at `e63a1090bfbda89f473a422817629eaadd1ed264`, with merged proof confirming `apps/gui/release-notes.md` names 0.3.5.
- [x] Read fresh GitHub `main` and create a new clean **normal clone** at that exact SHA; it was clean/on `main` and neither `release/v0.3.5` nor `v0.3.5` existed.
- [x] Install locked dependencies in that clone without changing the lockfile or creating a new board: `npm ci --ignore-scripts` exit 0.
- [ ] Initial preparation invocation (without canonical-board binding) exited 1 pre-mutation in the MCP HTTP rail; retained in `scratch/execution` and intentionally not counted as successful preparation.
- [ ] Run the one authorized corrected preparation command from a newly rechecked clean clone with process-scoped `KANMER_ROOT` bound to the existing canonical board: `npm run release -- 0.3.5 --ticket CORE-098`. **Attempted once and failed exit 1 before any release mutation because the boardless normal clone lacked `KANMER_ROOT`; no retry is authorized.**
- [x] Record all preparation exits, fresh-main SHA, generated commit/head, PR, script-generated changed-file set, and `git diff --check`; the failure record confirms no generated commit/PR existed, no release branch/tag was created, and the clone remained clean.
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

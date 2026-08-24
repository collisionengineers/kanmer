# Checklist — CORE-099

## Planning and hold

- [x] Read CORE-099, every currently present ticket document, its links/dependency graph, HZN-007 context, FRD-021, release-owner source, and the retained CORE-096/CORE-098/GUI-131 evidence.
- [x] Record research, file surface, resolved questions, and the no-source/no-release planning boundary through Kanmer MCP.
- [x] Write the executable successor-release plan/checklist and remain in Preparing without taking a branch or worktree.
- [ ] Wait for [[DOC-023]] to be Done after normal review, merge, and merged-main proof; re-read CORE-099/DOC-023 items, links, and gates before any execution packet or take.

## One preparation invocation

- [ ] Create one freshly checked clean normal GitHub-origin clone from current protected `main` after DOC-023 Done; verify `apps/gui/release-notes.md` names 0.3.6 and no `release/v0.3.6` branch, `v0.3.6` tag, release PR, or GitHub Release exists.
- [ ] Install locked dependencies with `npm ci --ignore-scripts` and bind only process-scoped `KANMER_ROOT=<canonical-board-root>`; do not copy/init/edit a board.
- [ ] Run exactly one preparation command: `npm run release -- 0.3.6 --ticket CORE-099`. Do not dry-run, retry, hand-create a release branch, or manually alter generated artifacts.
- [ ] Record the base SHA, all exits, script-generated branch/commit/PR/footer/diff, verification output, and clean-tree state. On any failure, preserve it and stop before retrying.

## Independent review and normal merge

- [ ] Obtain independent review of the exact release-PR head and terminal required checks; resolve findings through governed work.
- [ ] Merge only via the normal protected-main path and record the full merge SHA. The author does not review, merge, or bypass protection.

## One publisher invocation and evidence

- [ ] Create a second clean normal GitHub-origin clone at merged main; recheck matching v0.3.6 manifests, full reachable merge SHA, clean tree, new-tag/release absence, and unchanged v0.3.4/v0.3.5 records.
- [ ] Bind `KANMER_ROOT=<canonical-board-root>` and expose any publisher credential only to that publisher process environment, never output/source/CI/ticket data.
- [ ] Run exactly one publisher command: `npm run release -- 0.3.6 --publish --release-commit <full-merged-sha>`. Do not retag, retry, run a second package, manually upload/edit/repair a release, or take an administrative bypass.
- [ ] Record public v0.3.6 tag target, non-draft GitHub Release, `node scripts/verify-release-assets.mjs 0.3.6` result, and terminal read-only `release-verify` workflow URL/status.
- [ ] Append only factual scoped v0.3.6 evidence to [[CORE-036]] and [[CORE-042]]; do not advance, proof, or otherwise decide either ticket.
- [ ] Hand off merged-main proof and any closeout decision to independent later owners; do not self-verify or close out.

## Progress notes

Planning assignment complete. CORE-099 is held in Preparing because [[DOC-023]] is still Preparing; no release action has been performed.

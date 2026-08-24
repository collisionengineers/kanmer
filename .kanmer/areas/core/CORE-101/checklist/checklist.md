# Checklist — CORE-101

## Planning record

- [x] Read CORE-101 in full; its resolved gates/links; [[HZN-007]] context; [[CORE-099]] outcome and [[CORE-100]] report/proof; [[DOC-024]] current state; FRD-021; and current protected-main release orchestration/verification/workflow contracts.
- [x] Record the hard DOC-024 Done hold, immutable v0.3.4/v0.3.5/v0.3.6 evidence, canonical process-scoped `KANMER_ROOT`, credential boundary, strict public/latest.yml evidence, and tag-workflow-success requirements.
- [x] Write the research, files, resolved questions, and executable two-phase release plan through Kanmer MCP.
- [x] Leave CORE-101 untaken in Preparing; do not create a worktree/branch/PR, invoke release preparation/publisher, tag, publish, upload, repair, or modify source.

## Execution after explicit authorization and DOC-024 Done

- [ ] Re-read DOC-024/CORE-101 items, links, gates, documents, HZN-007 context, and current protected `main`; confirm DOC-024 is Done and CORE-101 is unblocked before taking the ticket.
- [ ] Create one fresh clean GitHub-origin normal clone for preparation; prove clean exact `main`, 0.3.6 current manifests, 0.3.7 notes, canonical board binding, and absence of the v0.3.7 branch/tag/release/PR.
- [ ] Run exactly once with process-scoped `KANMER_ROOT`: `npm run release -- 0.3.7 --ticket CORE-101`; record its exact exit, generated branch/commit/PR/footer/diff/checks, or preserve a failure and stop.
- [ ] Obtain independent exact-head review and terminal checks; merge only through the normal protected-main path and record the full merge SHA. The author neither reviews nor merges.
- [ ] Create one second fresh clean GitHub-origin normal clone at merged main; prove manifest/reachability/tag/release preconditions and bind canonical `KANMER_ROOT`.
- [ ] Run exactly once with the authorized credential only in that process: `npm run release -- 0.3.7 --publish --release-commit <full-normal-merge-sha>`; record its exact exit or preserve a failure and stop.
- [ ] Verify v0.3.7 strict public installer/blockmap/MCPB/upload-state/size/digest and `latest.yml` bridge with `node scripts/verify-release-assets.mjs 0.3.7 --dir apps/gui/release` exit 0; record tag target and visible non-draft release.
- [ ] Record terminal successful non-publishing `release-verify` tag-workflow URL/run id; a FAIL or INCONCLUSIVE stops and is not converted to PASS.
- [ ] Append only factual sanitized v0.3.7 evidence to [[CORE-036]] and [[CORE-042]] scratch; do not change their stages/proof/acceptance.
- [ ] After independent merged-main verification/proof, close out CORE-101 without touching historical v0.3.4/v0.3.5/v0.3.6 records.

## Stop conditions

- [ ] If DOC-024 is not Done, hold CORE-101 with no take or release action.
- [ ] If preparation, review/merge, publisher, public verifier, or tag workflow fails or is inconclusive, record the exact state and stop before retry, manual repair/upload, retag, release edit, or administrative bypass.

# Checklist — CORE-096

## Preparation

- [x] Create a clean isolated clone at the recorded current-main SHA.
- [x] Wait for DOC-021's reviewed release-notes PR to merge; record its merge SHA: be15545a90af27f08e2124e7aaf39c4bcc3b51dc.
- [x] Bind the existing canonical board through KANMER_ROOT for isolated-clone test discovery.
- [x] Run the exact 0.3.4 release dry-run gate and retain every exit.
- [x] Refresh the preparation clone from DOC-021's merged main and confirm it is clean.
- [x] Run the preparation phase once with --ticket CORE-096.
- [x] Inspect the release branch diff and confirm it contains only script-generated release artifacts.
- [x] Record the PR number, head SHA, preparation commit, and local command exits.
- [x] Run git diff --check and the release script complete verification gate in the preparation clone.
- [x] Write the post-implementation report and move to Review.

## Independent review and merge

- [x] Obtain independent review of the exact release PR head.
- [x] Resolve every review finding and required GitHub check.
- [x] Merge through normal protected-main review flow; record merge SHA: 102ba3b120cc3065943089d122a6172de8934ece.

## Publication and verification

- [ ] Clone the exact merged main release commit into a clean publish checkout.
- [ ] Publish once with the repository release script and the merged release SHA.
- [ ] Verify v0.3.4 has a non-draft public release and all expected byte-identical assets.
- [ ] Verify the tag-triggered release-verify job succeeds.
- [ ] Append scoped evidence to [[CORE-036]] and [[CORE-042]].
- [ ] Write merged-main proof, move Verifying to Done only for PASS, and complete ticket cleanup.

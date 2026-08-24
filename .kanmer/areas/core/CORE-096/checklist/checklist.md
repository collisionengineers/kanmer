# Checklist — CORE-096

## Preparation

- [ ] Create a clean isolated clone at the recorded current-main SHA.
- [ ] Run the exact 0.3.4 release dry-run gate and retain every exit.
- [ ] Run the preparation phase once with --ticket CORE-096.
- [ ] Inspect the release branch diff and confirm it contains only script-generated release artifacts.
- [ ] Record the PR number, head SHA, preparation commit, and local command exits.
- [ ] Run git diff --check and the release script complete verification gate in the preparation clone.
- [ ] Write the post-implementation report and move to Review.

## Independent review and merge

- [ ] Obtain independent review of the exact release PR head.
- [ ] Resolve every review finding and required GitHub check.
- [ ] Merge through normal protected-main review flow; record the exact merge SHA.

## Publication and verification

- [ ] Clone the exact merged main release commit into a clean publish checkout.
- [ ] Publish once with the repository release script and the merged release SHA.
- [ ] Verify v0.3.4 has a non-draft public release and all expected byte-identical assets.
- [ ] Verify the tag-triggered release-verify job succeeds.
- [ ] Append scoped evidence to [[CORE-036]] and [[CORE-042]].
- [ ] Write merged-main proof, move Verifying to Done only for PASS, and complete ticket cleanup.

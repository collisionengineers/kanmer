# Checklist — DOC-021

## Preparation

- [ ] Create a clean isolated checkout at current origin/main.
- [ ] Apply the verified release-notes-only change.
- [ ] Run the focused release-notes test.
- [ ] Run git diff --check and confirm only the release-notes file changed.
- [ ] Commit, push the DOC-021 branch, and open the normal PR.
- [ ] Record PR number, head SHA, and command exits.
- [ ] Write the post-implementation report and move to Review.

## Review and merge

- [ ] Obtain independent review of the exact head.
- [ ] Resolve required checks and findings.
- [ ] Merge via normal protected-main flow; record merge SHA for CORE-096.
- [ ] Write merged-main proof and close out DOC-021.

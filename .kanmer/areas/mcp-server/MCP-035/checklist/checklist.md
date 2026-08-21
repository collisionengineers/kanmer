# Checklist — MCP-035

- [x] Compute and validate every requested document path before the legacy-layout return, reusing validated v2 paths.
- [x] Add format-1 regression coverage for traversal, absolute, and backslash-escape document IDs.
- [x] Assert safe absent format-1 documents retain the existing missing-document response and invalid batches produce no partial result.
- [ ] Run focused core tests, typechecks/build, MCP smoke, protocol/discovery smoke, and git diff checks; record exit codes.
- [ ] Write the post-implementation report, commit the narrow change, push the branch, open the PR, and move the ticket to Review.

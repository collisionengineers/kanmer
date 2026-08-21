# Checklist — MCP-035

- [x] Compute and validate every requested document path before the legacy-layout return, reusing validated v2 paths.
- [x] Add format-1 regression coverage for traversal, absolute, and backslash-escape document IDs.
- [x] Assert safe absent format-1 documents retain the existing missing-document response and invalid batches produce no partial result.
- [x] Run focused core tests, typechecks/build, MCP smoke, protocol/discovery smoke, and git diff checks; record exit codes.
- [x] Write the post-implementation report, commit the narrow change, push the branch, open the PR, and move the ticket to Review.

## Progress notes

- Focused core tests: 2 targeted tests passed; full docs/store files passed 132/132.
- Core and MCP typechecks passed; npm run build passed.
- MCP stdio smoke passed 184/184; protocol smoke passed 42/42; discovery smoke passed 13/13.
- git diff --check passed. plugin:check was not run in the linked worktree because the repository contract makes normal checkout authoritative.
- Commit 0593a38bd5722eeba07ed7288fb05e58e10e5c52 pushed on mcp-035-legacy-doc-validation.
- PR #110 opened: https://github.com/collisionengineers/kanmer/pull/110.

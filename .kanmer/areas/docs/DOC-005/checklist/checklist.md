# Checklist — DOC-005

- [x] AGENTS.md states the rule, outside the managed block
- [x] verify:agents-block still passes
- [x] docs/README.md states the rule with reasoning
- [x] the history is described honestly, with dates
- [x] release-notes.mjs groups Done-since-tag tickets by area
- [x] it is read-only
- [x] it runs against this repo and produces real output
- [x] release:notes script added

## Progress notes — 2026-08-21 reconciliation

The scoped implementation already exists on merged main from PR #26 (source commit 1df633e7dd4b424ac0a7107ac08d2289c61260dd; merge commit 05a335dc0e9b4b75ef9904218c55ca643f9a519d). The fresh doc-005-operating-rule worktree has no source diff, so no duplicate/no-op implementation commit was created.

Evidence from the fresh worktree and normal main checkout: the first release:notes invocation from the fresh worktree exited 1 because packages/core/dist/index.js had not been built; npm run build:core then exited 0. After that prerequisite, npm run release:notes -- --since v0.3.2 exited 0 from both the ticket worktree and main checkout and produced real grouped output (93 tickets across 5 areas). verify:agents-block exited 0 (31/31), npm run test:scripts exited 0 (79/79), npm run typecheck exited 0, and git diff --check exited 0. The initial missing-build failure is retained; it is a prerequisite/environment result, not silently overwritten.

# Checklist

- [x] gatedBoundariesCrossed — count boundaries crossed that have one or more requirements.
- [x] moveItem rejects a move crossing more than one, before any write.
- [x] error names the count, boundary labels, and next stage.
- [x] error is distinct from the missing-document error.
- [x] backwards moves unaffected.
- [x] feature backlog to done rejected.
- [x] chore backlog to implementing still allowed.
- [x] spike backlog to done still allowed.
- [x] every single-step move in the feature pipeline still allowed.
- [x] stageEntered on the item schema and KEY_ORDER.
- [x] stamped on entry, never overwritten.
- [x] survives a frontmatter round-trip.
- [x] FRD-002 G2 amended: the structural rule and why proposed R1/R2 were dropped.
- [ ] plugin:build + plugin:check (core compiles into the bundle) — plugin:build passed; plugin:check exited 1 because this linked worktree resolves @kanmer/core to the main checkout. The exact failure is retained below.

## Progress notes

- 2026-08-21: Reconciled the ticket against merged main. The scoped implementation is already present in commit b5b332e0f3b7f9c1da7e2ec8bbcf7c716fbec3ec, reachable from origin/main cb8fa1f0, through merged PR https://github.com/collisionengineers/kanmer/pull/15 (merge 8af1991c8350ae4bf7b44532dd434ee24ce7b8e4). No source diff exists on the fresh branch and no duplicate or empty PR was created.
- 2026-08-21: Fresh branch core-011-one-gate-per-move and worktree .worktrees/core-011 were recorded by take_ticket. The author is stopping at Review for independent review.
- Focused core gate/store/profile tests: PASS, 3 files and 97 tests.
- Full core test suite: PASS, 11 files and 257 tests.
- npm run typecheck: PASS for all workspaces.
- npm run build -w @kanmer/gui: PASS (existing gray-matter eval warning only).
- npm run build: PASS for core and mcp-server, including standalone bundle.
- node packages/mcp-server/src/smoke.mjs: PASS, 184/184.
- npm run smoke:protocol: PASS, 42/42.
- npm run smoke:discovery: PASS, 13/13.
- npm run plugin:build: PASS.
- npm run plugin:check: FAIL, exit 1. Exact refusal: plugin:check refused: @kanmer/core resolves to C:\Users\Alex\Documents\GitHub\kanmer\packages\core\dist\index.js, not this checkout's C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-011\packages\core; fix: run npm install in this checkout so its workspace dependency is local, then rerun npm run plugin:check. This linked-worktree limitation is not converted to PASS.
- git diff --check: PASS; no source diff remains after restoring the generated plugin artifact produced by plugin:build.

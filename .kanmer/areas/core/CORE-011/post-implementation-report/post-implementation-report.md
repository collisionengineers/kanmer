# Post-implementation report

## Reconciliation outcome

CORE-011's scoped implementation is already merged in commit b5b332e0f3b7f9c1da7e2ec8bbcf7c716fbec3ec, reachable from origin/main cb8fa1f0. The historical change shipped through PR https://github.com/collisionengineers/kanmer/pull/15, merged at 8af1991c8350ae4bf7b44532dd434ee24ce7b8e4. This fresh branch and worktree were taken to audit and reconcile the board record; there is no source diff to commit and no duplicate or empty PR was opened.

The shipped scope is one gated boundary per move, with durable first-entry stageEntered frontmatter stamps and the FRD-002 G2 amendment. The rejected mtime/activity-log R2 and done-only-from-verifying R1 were not implemented: research records why neither is a valid substitute for structural refusal.

## Historical implementation surface

- packages/core/src/gates.ts: gatedBoundariesCrossed and collapsesPipeline.
- packages/core/src/store.ts: refusal before document checks and stageEntered stamping after a permitted gate.
- packages/core/src/types.ts and frontmatter.ts: stageEntered schema and key order.
- packages/core/src/gates.test.ts and store.test.ts: profile matrix, collapse refusal, and stageEntered coverage.
- packages/mcp-server/src/smoke.mjs: collapse checks.
- docs/functional/frd/FRD-002-requirement-profiles.md: G2 amendment.

## Governing documents

FRD-002 G2 is amended rather than violated. The amendment narrows jumps with multiple gated boundaries and records why R1 and mtime/activity-log R2 were dropped. PRD-001 problem 1 is addressed structurally. No timestamp-causation claim is made.

## Verification and exact outcomes

- npm run test -w @kanmer/core -- src/gates.test.ts src/store.test.ts src/profile-matrix.test.ts — PASS, 3 files / 97 tests.
- npm run test -w @kanmer/core — PASS, 11 files / 257 tests.
- npm run typecheck — PASS for core, mcp-server, ui, and gui.
- npm run build -w @kanmer/gui — PASS; existing gray-matter eval warning only.
- npm run build — PASS for core and mcp-server, including standalone bundle.
- node packages/mcp-server/src/smoke.mjs — PASS, 184/184.
- npm run smoke:protocol — PASS, 42/42.
- npm run smoke:discovery — PASS, 13/13.
- npm run plugin:build — PASS.
- npm run plugin:check — FAIL, exit 1. Exact preserved failure: plugin:check refused because @kanmer/core resolves to C:\Users\Alex\Documents\GitHub\kanmer\packages\core\dist\index.js, not this checkout's C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-011\packages\core; the suggested fix is to run npm install in this checkout so its workspace dependency is local. This check is inconclusive for the linked worktree and is not reported as PASS.
- git diff --check — PASS; the fresh branch has no source diff.

## Limitations and handoff

No new source commit or PR was created because the implementation is already merged; creating a duplicate would misstate traceability. plugin:check could not run successfully in this linked worktree because of its dependency resolution guard, and no package-install workaround was performed. stageEntered is not causal proof and historical tickets were not backfilled. No external runtime evidence is claimed. Independent root review should inspect the merged implementation, FRD-002 amendment, and this reconciliation before any verifying or closeout work. The author stops at Review and will not self-review, merge, or clean up the worktree.

## Traceability

- Ticket: CORE-011.
- Branch: core-011-one-gate-per-move.
- Worktree: .worktrees/core-011.
- Commit: b5b332e0f3b7f9c1da7e2ec8bbcf7c716fbec3ec.
- PR: https://github.com/collisionengineers/kanmer/pull/15 (merged; merge commit 8af1991c8350ae4bf7b44532dd434ee24ce7b8e4).

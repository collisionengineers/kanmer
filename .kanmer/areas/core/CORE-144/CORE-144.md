---
id: CORE-144
type: ticket
title: >-
  Make the build-once static guard see through the rail's runner scripts and
  hash untracked directories in the dirty digest
status: verifying
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-09-05T04:04:56.296Z'
  review: '2026-09-05T04:11:11.798Z'
  verifying: '2026-09-05T13:20:38.609Z'
taken_at: '2026-09-05T04:05:24.416Z'
branch: CORE-144-guard-fidelity
worktree: .worktrees/CORE-144
claim_expires_at: '2026-09-05T04:35:24.416Z'
claim_controller: claude-code
lease_id: e0f852f6-0f51-4606-841c-7cf5f2d2f5ad
lease_revision: 1
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-144'
lease_phase: implementing
lease_heartbeat_at: '2026-09-05T04:05:24.416Z'
labels:
  - rail
  - build
  - 0.4.2
  - follow-up
groups:
  - HZN-009
links:
  - CORE-140
docs_todo: true
commits:
  - 8ba0cc86
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/327'
archived: false
created: '2026-09-05T03:02:51.010Z'
updated: '2026-09-05T13:20:38.609Z'
---

Filed by the independent review of CORE-140 (PR #322, head `8ce4dc6ab8329a5b57947c7e79c728d1ca2cbd6b`). Neither item is a defect in the merged behaviour of CORE-140 — the rail is correct and CI-green — both are fidelity gaps in the guards CORE-140 introduced.

## 1. `scripts/verify-steps.test.mjs` cannot see through the new runner scripts

`resolve_()` only expands commands matching `^npm run <script>( -w <ws>)?$`. CORE-140 moved the two nested-build call sites out of `package.json` and into `scripts/run-tests.mjs` and `packages/mcp-server/scripts/run-http-tests.mjs`, which the resolver treats as terminal leaves. Consequence: the "root build is reached exactly once" assertion is blind to exactly the two files that now decide whether a rebuild happens, and the second test ("`test:built` and `mcpb:check:built` never re-invoke the root build script") is vacuous — `test:built`'s body is a bare `node …` leaf, so it resolves to zero invocations.

Proven during review: dropping `--assume-built` from the root `test:built` script (which restores a full duplicate `npm run build` inside `test:http`) leaves `node --test scripts/verify-steps.test.mjs` fully green. The complementary mutation (reverting `npm run mcpb:check:built` to `npm run mcpb:check` in `VERIFY_STEPS`) *is* caught, so the guard has partial power only.

Suggested remedy (one class, one fix): assert the runner scripts' contract directly — e.g. that `test:built`/`test:http:built` bodies carry `--assume-built`, and that each runner's `--assume-built` branch reaches `assertBuilt(...)` and no build invocation — rather than extending the shell resolver.

## 2. `computeDirtyDigest` skips untracked directories

`git status --porcelain=v1 -z` collapses an untracked directory to a single `?? dir/` entry, and `computeDirtyDigest` in `scripts/build-stamp.mjs` skips entries whose path is a directory. So changes *inside* an already-untracked directory do not change the digest.

Reproduced during review in the CORE-140 worktree: create `probe-dir/a.txt`, `build-stamp.mjs --write`, then add `probe-dir/b.txt` — `build-stamp.mjs --assert server standalone` still exits 0. A new *top-level* untracked file is correctly refused.

Suggested remedy: pass `-uall` to the porcelain call so every untracked file is listed and hashed individually.

## Out of scope

Any change to which assertions run, to `VERIFY_STEPS`' ordering, or to the public `test` / `mcpb:check` commands.

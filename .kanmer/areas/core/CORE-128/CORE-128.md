---
id: CORE-128
type: ticket
title: >-
  Quarantine or fix the recurring Windows core-test timing failures that block
  verification
status: review
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-08-28T00:04:05.223Z'
  review: '2026-08-28T07:11:19.317Z'
taken_at: '2026-08-28T00:39:15.920Z'
branch: core-128-windows-test-timing
worktree: .worktrees/core-128
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
commits:
  - a717c4f0013358fd321bcf873eeba99277d78f44
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/300'
archived: false
created: '2026-08-27T23:52:07.305Z'
updated: '2026-08-28T07:11:19.317Z'
---

## What

A recurring family of Windows-only timing/cleanup failures makes `npm run verify` non-deterministic, so almost every verification in this programme has had to retain a FAIL attempt and argue it away. Known members:

- `packages/core/src/io.test.ts` stale-lock timing
- `packages/core/src/docs.test.ts` profile-matrix
- `packages/core/src/migrate.test.ts` folded-id and migrated-board
- `packages/core/src/store.test.ts` area-id placement and "updates fields and stamps updated" (5 s vitest timeout)
- teardown `ENOTEMPTY` when removing `kanmer-test-*` temp directories
- `scripts/antigravity-plugin-config.test.mjs` ×2 `EBUSY rmdir …\Kanmer Test Space\Kanmer\bin`
- `packages/mcp-server/src/http.test.mjs` `spawnSync ETIMEDOUT` and `tunnels/readiness.test.mjs` `TUNNEL_READINESS_TIMEOUT` under load

They are load-sensitive: they appear when another rail runs concurrently and usually clear on a rerun at the same SHA. The hosted runner is not immune — the push-to-main run for `c6bbddd6` failed on the `store.test.ts` 5 s timeout and passed on rerun.

## Why

This is the single highest-leverage housekeeping item on the board. It has: blocked a real acceptance proof ([[CORE-036]]'s red-path release run died at `npm run verify` twice on a disposable tag, never reaching the asset-verifier step it was meant to prove); failed [[CORE-042]]'s post-merge re-verification and left that ticket stranded in Verifying for five days; and forced retained-FAIL attempts in the proofs of [[CORE-121]], [[CORE-122]], [[CORE-123]], [[SKILL-037]], [[CORE-114]], [[MCP-054]], [[CORE-115]], [[CORE-124]], [[GUI-144]] and [[CORE-125]]. Every one of those verifications had to reason about whether a red rail was real — which is exactly the judgement FRD-035 wants to make mechanical.

## Approach

- Reproduce each failure deterministically (raise concurrency, or run the suite under load) rather than treating them as unexplained flake.
- Fix what is a real defect: timing assumptions that are too tight for Windows filesystem semantics, and teardown that races the OS releasing handles (`ENOTEMPTY`/`EBUSY` on `rm -rf` of a directory another process still has open).
- Where a test genuinely needs more time on Windows, raise the per-test timeout explicitly with a comment naming why — never by weakening an assertion.
- For the installed-shim tests that need `cmd.exe`, make them skip with a recorded reason when the shim cannot be spawned, rather than failing.
- Add a short AGENTS.md gotcha so verifiers stop rediscovering this.

## Verification

- [ ] `npm run verify` passes ten consecutive times on this Windows host, including at least three runs with a second rail running concurrently.
- [ ] No assertion weakened; any timeout increase carries a comment naming the Windows behaviour it accommodates.
- [ ] A verifier running the rail no longer needs to retain a FAIL attempt for any of the listed tests.

---
kind: proof-record
merged_sha: "c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b"
prs:
  - "159"
result: PASS
verified_at: "2026-08-22T08:52:00Z"
---

## Merged-main verification

Verified on detached origin/main at merge commit c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b, containing final source head 42f0ace65f8aaa7d4e4f95f516df823c0f14da7a and PR #159. The independent review attestation is PASS at that full head; all six findings are fixed and all GitHub review threads are resolved.

Hosted run 32560430127 completed with kanmer-gate PASS (97001049652) and verify PASS (97001049517). Detached merged-main rails: core merge-gate tests 14/14 PASS; check-pr node tests 5/5 PASS including malformed-board fail-closed, abbreviated SHA, base..head reachability, and dangling-blocker cases; core and MCP typechecks PASS; core and MCP builds PASS; git diff --check PASS.

## Preserved boundaries

The direct board-push non-trigger observation remains INCONCLUSIVE because the workflow is statically pull_request-only; no claim is made beyond the tested path. Warning-only review-attestation behavior remains non-blocking by design.

The production caller chain is pull_request verification → kanmer-gate → check-pr.mjs → evaluateMergeGate → read-only KanmerStore.

## Independent merged-main rerun — 2026-08-23T14:04Z

Verification ran in detached worktree at origin/main `8554c733aac5817e99909622e062d022d6c12be3`; PR #159 remains MERGED at `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b`.

- `npm run test -w @kanmer/core -- src/merge-gate.test.ts`: PASS, 14/14.
- `node --test packages/mcp-server/src/check-pr.test.mjs`: PASS, 5/5.
- `npm run build:core`: PASS; `npm run build:server`: PASS; `npm run typecheck`: PASS (all workspaces); `git diff --check`: PASS (all exit 0).
- Authoritative `npm run verify`: FAIL (exit 1) in unrelated Windows timing/cleanup behavior: 5 core tests exceeded Vitest's 5-second timeout (io stale-lock; docs profile matrix; migrate folded-id and migrated-board; store area-id), with ENOTEMPTY cleanup reported by migration. No overall verify PASS is claimed.

Phase-two evaluator/CLI evidence is current and green. The checklist's direct `kanmer-board` push non-trigger observation remains explicitly INCONCLUSIVE because the workflow is statically pull_request-only; this ticket remains Verifying and is not moved or closed.

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

## Final current-main verification — 2026-08-24

The prior Windows timeout boundary was rechecked on current merged main 9a75bd690a80bf070bb8ddc372b3a95fa03ec789, which contains PR #159.

- A detached ticket worktree completed the complete canonical npm run verify with exit 0: core 310/310, GUI 462/462, MCP HTTP 101/101, scripts 224/224, typechecks, docs, all smokes, MCPB, and plugin synchronization passed.
- PR #236 at head 28ea4782816218d4aae4930b135484477d2a9b17 carried a valid Kanmer footer and completed both verify and kanmer-gate successfully in run 32733389281.
- The current kanmer-board direct-sync commit c2b279fee76115320bcd2d510503916d269bd51e is present on the remote board branch. GitHub returned no pr.yml workflow run for kanmer-board, proving the pull_request-only workflow did not run from that direct board push.
- main protection now requires both observed checks verify and kanmer-gate, whose exact names and GitHub Actions app identity were read back from the API.

The direct board-push observation is no longer INCONCLUSIVE. Earlier failures remain preserved above.

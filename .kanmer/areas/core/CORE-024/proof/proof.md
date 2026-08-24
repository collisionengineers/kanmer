---
kind: proof-record
merged_sha: "0c5ed84ed0128aed6c8a60bec265a8dcb589061a"
prs:
  - "155"
result: PASS
verified_at: "2026-08-22T06:22:00Z"
---

## Merged-main verification

Verified on detached origin/main at merge commit 0c5ed84ed0128aed6c8a60bec265a8dcb589061a. The merge contains PR #155 and the MCP-043 generated plugin artifact (the exact merged diff is nine files, including plugins/kanmer/mcp/kanmer-mcp.cjs).

Authoritative hosted evidence: PR #155 run 32556559732 completed with kanmer-gate PASS and verify PASS after the MCP-043 artifact remediation; the verify job covered npm test, typecheck, builds, MCP protocol/smoke/discovery, scripts, and packaging rails.

Local detached rails: core 279/279, GUI 362/362, HTTP 63/63, scripts 83/83, workspace typecheck, MCP stdio 224/224, protocol 46/46, and diff-check passed. The first detached attempt failed during build because the shared workspace resolved a stale @kanmer/core export; after exact worktree-local junctions were installed, the full deterministic rails passed through mcpb parity.

## Preserved failures and boundaries

The corrected detached run exited at scripts/check-mcpb-sync.mjs:44 because this environment's freshly generated standalone bundle hash differed from the committed plugin copy, despite the hosted verify PASS on the same merged source. This is retained as an environment-sensitive parity observation, not suppressed. The earlier stale-resolution failure is also retained. Real two-project GitHub board-push/protection observation and live production no-link/open-question/parked PR evidence remain INCONCLUSIVE per the implementation report; no evidence is claimed for them.

The production caller chain is kanmer-gate → check-pr.mjs → evaluateMergeGate → read-only KanmerStore. No writes or initialization occurred during verification.

## Independent merged-main rerun — 2026-08-23T14:04Z

Verification ran in detached worktree at origin/main `8554c733aac5817e99909622e062d022d6c12be3`; PR #155 remains MERGED at `0c5ed84ed0128aed6c8a60bec265a8dcb589061a`.

- `npm run test -w @kanmer/core -- src/merge-gate.test.ts`: PASS, 14/14.
- `node --test packages/mcp-server/src/check-pr.test.mjs`: PASS, 5/5.
- `npm run build:core`: PASS (exit 0); `npm run build:server`: PASS (exit 0).
- `npm run typecheck`: PASS (all workspaces, exit 0); `git diff --check`: PASS (exit 0).
- Authoritative `npm run verify`: FAIL (exit 1) in unrelated Windows timing/cleanup behavior: 5 core tests exceeded Vitest's 5-second timeout (io stale-lock; docs profile matrix; migrate folded-id and migrated-board; store area-id), with ENOTEMPTY cleanup reported by migration. The rail stopped at core tests; no overall verify PASS is claimed.

The phase-1 evaluator/CLI/build/typecheck evidence is current and green, but the existing checklist's four merged-main/protection items remain unresolved (including direct board-push observation), so this ticket remains Verifying; no Done move or closeout is claimed.

## Final current-main verification — 2026-08-24

Verified at current merged main 9a75bd690a80bf070bb8ddc372b3a95fa03ec789, which contains the original PR #155 merge.

- A detached current-main ticket worktree ran the complete canonical npm run verify command and exited 0. It passed core 310/310, GUI 462/462, MCP HTTP 101/101, scripts 224/224, all workspace typechecks, docs, protocol/headless smokes, and plugin/MCPB consistency.
- Current compliant PR #236 carried the explicit Kanmer: GUI-127 footer. Both required jobs passed on its head 28ea4782816218d4aae4930b135484477d2a9b17: kanmer-gate and verify (run 32733389281).
- The latest direct GUI board sync was observed at kanmer-board commit c2b279fee76115320bcd2d510503916d269bd51e. GitHub's PR workflow query for that board branch returned no runs, consistent with the workflow's pull_request-only trigger.
- CORE-033's observed-once condition is now satisfied. The live main protection readback was updated only to retain verify and add the exact successfully posted GitHub Actions check name kanmer-gate; GitHub returned both contexts with the Actions app id.

These current outcomes supersede the old Windows timing/cleanup and generated-artifact parity verification blockers. Earlier failed attempts remain above as historical evidence.

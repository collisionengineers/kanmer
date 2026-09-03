# Post-implementation report — CORE-133

## Files changed

| Path | Change |
|---|---|
| `packages/core/src/reconciliation.ts` | one explicit recoverable-workspace predicate (`clean`/`dirty` + `matches-claim`; `missing` + `unavailable`; `not-recorded` + `not-applicable`) replaces the unreachable synthetic `missing` + `matches-claim` gate; a proof merge-SHA mismatch guard (`PROOF_MERGE_SHA_MISMATCH`, no recommendation) precedes both the PASS and the FAIL Verifying routes; ordering unchanged (Review recovery, expired nonterminal transfer, terminal cleanup) |
| `packages/core/src/reconciliation.test.ts` | pure matrix: missing+unavailable and not-recorded+not-applicable recover; live, terminal, board, foreign, branch-mismatch, detached, unavailable and synthetic missing+matches refuse; current-SHA implementation/plan FAIL routes; stale-SHA FAIL yields the mismatch and no recommendation; PASS/transient/inconclusive unchanged (77 tests) |
| `packages/mcp-server/src/reconciliation.test.mjs` | end-to-end through `collectReconciliationEvidence` and `store.applyReconciliation`: deleted-worktree and never-recorded-worktree expired claims recover with branch, worktree, taken time and surviving dirty work preserved; stale revision conflicts; stale-SHA FAIL leaves ticket bytes untouched; board/foreign/branch-mismatch stay refused |
| `packages/mcp-server/src/smoke.mjs` | pins that `reconcile_ticket`'s description names `apply_reconciliation` as the apply surface and never claims no apply surface exists |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | regenerated (`npm run plugin:build`); tool roster stays 41 |

Conditional files (`packages/mcp-server/src/reconciliation.ts`, `index.ts`) were not needed: the CORE-127 merge kept the wiring and the description already correct (step 4's assertion passed unmodified).

## Commands and exit codes

| Command | cwd | Exit | Result |
|---|---|---|---|
| `git rebase origin/main` (onto `4d00fbfc`; the branch had been on `ef001344`) | `.worktrees/core-133` | 0 | clean, no conflicts |
| `npm run plugin:build && npm run plugin:check` | `.worktrees/core-133` | 0 / 0 | plugin-sync OK — 41 tools match, bundle bytes match |
| `npx vitest run src/reconciliation.test.ts` | `.worktrees/core-133/packages/core` | 0 | 77 passed |
| `TMP='C:\kt-tmp' TEMP='C:\kt-tmp' npm run verify` | `.worktrees/core-133` | 0 | PASS, 13 steps ending `plugin-sync OK — 41 tools match, bundle bytes match` (run on the tree rebased onto 4d00fbfc; the branch was then rebased onto db5da255 (MCP-056) with a clean rebase and a rebuilt, checked bundle; the hosted `verify` on the PR head is the rail for that final head) (`C:\kt-tmp\core133-verify1.log`; includes `test:http` → `reconciliation.test.mjs`, smoke and protocol) |

## Deviations from the plan

- Step 1 said "rebase onto the exact CORE-127 merge"; the work was rebased onto the current `origin/main` (`4d00fbfc`, which contains CORE-127's merge `a744fd76`), because three further merges landed while the lane was interrupted (SKILL-039, GUI-149, CORE-139). No conflict; the bundle was regenerated afterwards and matches a fresh build.
- The lane was interrupted on 2026-09-02 mid-step 5 with the work uncommitted; it was resumed on the recorded branch and worktree (no second worktree) on 2026-09-03.

## PR
https://github.com/collisionengineers/kanmer/pull/316 — head `3a8341de6aa4c17226f00bc6a2ad9cb71d66dbe5`

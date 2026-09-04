---
kind: proof-record
merged_sha: "c973f94ad80154ec6f330134eac212ce6be8a3eb"
environment: "detached worktree .worktrees/verify-core-133-c973f94ad80154ec6f330134eac212ce6be8a3eb on the Windows 11 workstation, Node 24, npm ci, default TMP"
verified_at: "2026-09-04T00:22:07Z"
result: PASS
attempts: []
---
# Proof — CORE-133 (command-log)

Verified on merged `main` at `c973f94ad80154ec6f330134eac212ce6be8a3eb` (PR #316 squash merge) in a disposable detached worktree (detached, clean, exact SHA; not the board or an implementation worktree).

## Deterministic checks

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npm ci` | verify worktree | 0 | dependencies installed |
| `npm run verify` (default `TMP`; MCP-056 is in this tree) | verify worktree | 0 | PASS, 13 steps ending `plugin-sync OK — 41 tools match, bundle bytes match` (`C:\kt-tmp\core133-verify-merged.log`); includes `packages/core` `reconciliation.test.ts` (77) and `packages/mcp-server` `reconciliation.test.mjs` through `test:http`, `smoke.mjs`, `plugin:check` |
| Hosted `verify` on the push to `main` at `c973f94a` (run 33819459166) | GitHub Actions | — | success |

## Acceptance census (from the plan)

| Check | Evidence |
|---|---|
| Missing+unavailable and not-recorded+not-applicable expired claims recover through `reconcile_ticket` → `apply_reconciliation` | `reconciliation.test.ts` and `reconciliation.test.mjs` cases (reviewer's failing-first experiment: 12 failed / 65 passed with the classifier restored to base; 77/77 with the change) |
| Live, terminal, board, foreign, branch-mismatch, detached, unavailable and synthetic missing+matches refuse | same suites |
| Recovery deletes nothing; branch, worktree, taken time and dirty work preserved | `reconciliation.test.mjs` end-to-end cases |
| Current-SHA FAIL routes; stale-SHA FAIL → `PROOF_MERGE_SHA_MISMATCH`, no recommendation, no mutation | `reconciliation.test.ts`; `reconciliation.test.mjs` byte-preservation case |
| Tool description names `apply_reconciliation`; roster 41; bundle matches source | `smoke.mjs` pin; `plugin:check` in the rail |

## Result

**PASS** on the deterministic rail at the exact merge SHA (local with default TMP, and hosted); the acceptance census above is covered by the suites the rail runs.

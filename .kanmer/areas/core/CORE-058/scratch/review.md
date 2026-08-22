# Independent review — CORE-058

- reviewer: codex-mcp-client
- independent: true
- PR: #180 (https://github.com/collisionengineers/kanmer/pull/180)
- reviewed head: `d50ddab17c33fcdc645f9c777a635cc2d72f26ee`
- base: `3c0706627cc73038d91a624e5d494d0148dce4c4` (`core-044-source-fetch-remediation`)
- verdict: NEEDS-CHANGES

## Changes inspected

The exact PR head changes `apps/gui/src/main/kanmerGit.ts` to centralize the board-worktree ignore entries and reconcile them for attached and branch-mismatch paths, adds real-Git tests and sync-staging coverage in `apps/gui/src/main/kanmerGit.test.ts`, and regenerates `plugins/kanmer/mcp/kanmer-mcp.cjs`. The governing-doc scope in the plan/report matches this diff; no provider/source-fetch behavior is added.

## Rails

- Focused GUI Git: PASS, 15/15.
- MCP source integration: PASS, 17/17.
- All-workspace typecheck: PASS.
- Core and server builds: PASS.
- `verify:docs`: PASS; generated manual current.
- `test:scripts`: PASS, 88/88.
- Artifact at the reviewed head: SHA-256 `6057648D81FB4CCCAB629A0EE1C05C8716A564400302238857E785C70C485100`, matching the author’s normal-checkout parity report; linked-worktree plugin guard remains intentionally unavailable.
- PR state readback: OPEN, CLEAN/MERGEABLE, exact head/base above, no hosted checks attached.

## Review comments and dispositions

1. **Blocking P2 — existing local/remote branch attachment paths skip ignore reconciliation** (GitHub comment 3836151012, originally anchored at 08f0393). At the reviewed head, the `localExists` and `remoteExists` worktree-add branches return through the common success path without calling `ensureBoardWorktreeIgnore`; only orphan creation does. The new rule can therefore still be absent when a configured branch already exists locally/remotely. Filed as [[CORE-062]], which blocks CORE-058.

2. **Blocking P1 — attached-worktree ignore failure loses the known board root** (GitHub comment 3836151017, originally anchored at 08f0393). `ensureBoardWorktreeIgnore(attachedRoot)` runs inside the outer try; a write/lock/permission failure reaches `empty(branch, error)` without `boardRoot`, allowing callers to fall back to the source checkout instead of preserving the real board location. Filed as [[CORE-063]], which blocks CORE-058.

3. **Non-blocking accepted/deferred P2 — already tracked cache history** (GitHub comment 3836151015). Adding `.gitignore` does not untrack cache files already committed. CORE-058’s open-questions explicitly parks retroactive history cleanup as outside this ticket, and the report states that boundary; no merge-blocking change is required here. This risk remains documented for a future scoped remediation.

## Decision

NEEDS-CHANGES. The focused tests and artifact evidence are green, but the two live source defects above are within CORE-058’s board-worktree hygiene scope. PR #180 was not merged and CORE-058 was not moved to Verifying.

## Independent review — NEEDS-CHANGES — b1abac871da28522759d4e5582caa69d5cdb5cd5

Reviewer: codex-core058-review (independent of the implementation author). Exact reviewed head: b1abac871da28522759d4e5582caa69d5cdb5cd5 (PR #180), cumulative CORE-044 base lineage reviewed; current CORE-044 remote base at review time: 7403a7cfb7079fafa88c2d18ec5b33b1a7407013.

Scope reviewed: cumulative CORE-058 board-worktree ignore reconciliation, including inherited CORE-062 attachment paths and CORE-063 board-root preservation. Exact intended diff is apps/gui/src/main/kanmerGit.ts, apps/gui/src/main/kanmerGit.test.ts, and generated plugins/kanmer/mcp/kanmer-mcp.cjs; no unrelated source files were introduced by the cumulative head.

Blocking finding:
- P2 — ensureBoardWorktreeIgnore adds .kanmer/data/sources/ to .gitignore but does not untrack source-cache paths that were already committed in the board worktree index. Git ignore rules do not affect already tracked paths, so syncBoard's git add -- .kanmer .gitignore can continue staging and committing cache updates after reconciliation. The new test uses git check-ignore --no-index, which explicitly ignores the index and therefore cannot prove this migration case. Add a deterministic fixture with a tracked .kanmer/data/sources/cache.json, reconcile, run syncBoard (or inspect the index), and remove the cache tree from the index while retaining the working copy; preserve failures rather than claiming the existing ignore test covers it.

Positive evidence: exact CORE-058 Git integration suite passed 18/18 (npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts, exit 0). The board-root preservation regression and local/remote attachment reconciliation both passed.

Full GUI rail: exit 1, 39 files, 290/291 tests; four suites failed before collection/expectation because the linked worktree resolves stale shared-core dispatch provider antigravity, and one dispatch assertion received the same stale-provider error. This is an environment/baseline limitation, not evidence for or against the changed Git code.

Disposition: NEEDS-CHANGES. Do not merge or move CORE-058 to Verifying until the tracked-cache migration behavior is fixed and re-tested at a fresh exact head.

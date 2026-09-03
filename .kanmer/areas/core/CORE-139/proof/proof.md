---
kind: proof-record
merged_sha: "4d00fbfc29b4c8b636c2df19ea2614939f1ed616"
environment: "detached worktree .worktrees/verify-core-139-4d00fbfc29b4c8b636c2df19ea2614939f1ed616 on the Windows 11 workstation, Node 24, npm ci"
verified_at: "2026-09-03T23:15:04Z"
result: PASS
attempts: []
---
# Proof — CORE-139 (command-log)

Verified on merged `main` at `4d00fbfc29b4c8b636c2df19ea2614939f1ed616` (PR #314 squash merge) in a disposable detached worktree (detached, clean, exact SHA; not the board or an implementation worktree).

## Deterministic checks

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npm ci` | verify worktree | 0 | dependencies installed |
| `TMP='C:\kt-tmp' TEMP='C:\kt-tmp' npm run verify` | verify worktree | 0 | PASS, 13 steps ending `plugin-sync OK — 41 tools match, bundle bytes match` (`C:\kt-tmp\core139-verify-merged.log`) |
| Hosted `verify` on the push to `main` at `4d00fbfc` (run 33798667287) | GitHub Actions | — | success (run 33798667287) |

## Live behaviour on the merged state (the ticket's acceptance)

| Check | Evidence |
|---|---|
| A `workflow_dispatch` runs only `regate` | run 33798758534 (dispatch on `4d00fbfc`, 2026-09-03T19:50:19Z): jobs `regate: success`, `kanmer-gate: skipped`, `verify: skipped`; whole run ≈ 1 min (before: ~9 min `verify` on every dispatch) |
| `node --test scripts/pr-workflow.test.mjs` | exit 0 in the reviewer's detached checkout and in the rail |
| `npm run verify:skills` check 21 | `PASS  no shipped skill link escapes its skill folder — 0 hits` |
| `grep -c "launcher. Native"` over AGENTS.md, `scripts/agents-block-body.mjs`, the skill | 0, 0, 0 |
| Concurrency coalescing / no-open-PR guard on the board hook | takes effect only after the operator re-copies `board-regate.yml` onto `kanmer-board` (operator step, outside this ticket's authority); the `pr.yml` concurrency group is live on `main` |

## Result

**PASS** on the deterministic rail at the exact merge SHA (local and hosted), and the ticket's own acceptance is observed live on the merged state (dispatch 33798758534 ran only `regate`). The board-branch copy of `board-regate.yml` remains an operator step and is not part of this proof.

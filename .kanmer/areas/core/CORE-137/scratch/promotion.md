# Promotion record — CORE-137 (v0.4.1)

Every step of the plan with its command, exit code and evidence. Appended as the release proceeds.

## Cut-point census (2026-09-04 ~07:00Z)

| Check | Result |
|---|---|
| MCP-055, GUI-147, SKILL-039, GUI-149, CORE-139, MCP-056, CORE-133, GUI-150, CORE-119 Done with `proof-record` PASS | all nine PASS; every `merged_sha` is an ancestor of `origin/main` = `04a977516fcb29500b5df2fd6aacea24e2e3d54e` (`git merge-base --is-ancestor`) |
| Nothing in Implementing / Review / Verifying; `counts.taken` | 0 / 0 / 0; taken 0 (SKILL-039's stale expired claim released during the census) |
| `.worktrees/` | only `kanmer` (GUI-150 and CORE-119 worktrees removed; 104 unregistered leftovers from earlier tickets removed) |
| Local ticket branches | none (`local-closeout-plan-docs`, `updater-implementation` are pre-existing non-ticket local branches, left for the operator) |
| Board pushed | `boardSync.ahead` 0, board head `c3b767441bcead8108244ea7de81145ad9831b0b` |
| Hosted `verify` at the `origin/main` tip | run 33843422690 at `04a97751`: success |
| Fresh-tree `npm run verify` at the tip | CORE-119 proof: detached worktree at `04a97751`, exit 0, 14 steps (`C:kt-tmpcore119erify-merged.log`); the release clone's prepare rail (step 5) repeats it |

## Step 1 — board backup

| Item | Value |
|---|---|
| Precondition | `git -C .worktrees/kanmer status --porcelain` empty; local == `origin/kanmer-board` (0/0) at `c3b767441bcead8108244ea7de81145ad9831b0b` |
| Archive | `C:/Users/Alex/Documents/KanmerBackups/kanmer-board-20260904T071345Z.zip` (3336 entries, 6 411 477 bytes) |
| SHA-256 | `d2e224b39ff68ae2e909fac9934ef9d33b8eb650e0bc748eedd5a29351e213ad` |

## Step 2 — live release channel

`release_channel acquire` (installed 0.4.0 server, live board): channel `main`, attempt `main@1`, `integration_sha` `04a977516fcb29500b5df2fd6aacea24e2e3d54e`, lease `9e315210-4663-4de9-a3c0-ceb39427c2ab` (renewed every 10 min by a keeper process; revision tracked in `C:kt-tmpcore137channel.json`).

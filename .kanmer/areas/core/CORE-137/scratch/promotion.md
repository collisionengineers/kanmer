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
| Fresh-tree `npm run verify` at the tip | CORE-119 proof: detached worktree at `04a97751`, exit 0, 14 steps (`C:\\kt-tmp\\core119\\verify-merged.log`); the release clone's prepare rail (step 5) repeats it |

## Step 1 — board backup

| Item | Value |
|---|---|
| Precondition | `git -C .worktrees/kanmer status --porcelain` empty; local == `origin/kanmer-board` (0/0) at `c3b767441bcead8108244ea7de81145ad9831b0b` |
| Archive | `C:/Users/Alex/Documents/KanmerBackups/kanmer-board-20260904T071345Z.zip` (3336 entries, 6 411 477 bytes) |
| SHA-256 | `d2e224b39ff68ae2e909fac9934ef9d33b8eb650e0bc748eedd5a29351e213ad` |

## Step 2 — live release channel

`release_channel acquire` (installed 0.4.0 server, live board): channel `main`, attempt `main@1`, `integration_sha` `04a977516fcb29500b5df2fd6aacea24e2e3d54e`, lease `9e315210-4663-4de9-a3c0-ceb39427c2ab` (renewed every 10 min by a keeper process; revision tracked in `C:\\kt-tmp\\core137\\channel.json`).

## Step 3 — fresh release clone

`git clone https://github.com/collisionengineers/kanmer.git C:\Users\Alex\Documents\GitHub\kanmer-release-0.4.1` exit 0; HEAD `04a977516fcb29500b5df2fd6aacea24e2e3d54e` (equals the acquired `integration_sha`); `git status --porcelain` empty; `npm ci` exit 0 (`C:\kt-tmp\core137\clone.log`).

## Step 4 — release notes

`## 0.4.1` inserted above `## 0.4.0` in `apps/gui/release-notes.md` (Fixed / Skills and policy / Proof / upgrading paragraph; each bullet checked against the merged ticket's post-implementation report, CORE-119's bullet rewritten from its merged change); committed on local `main` as `4fd6998a docs(release): add v0.4.1 notes`. `main` is not pushed; the commit rides inside the release PR.

## Step 5 — prepare

`npm run release -- 0.4.1 --ticket CORE-137` in the clone: exit 0; prepared commit `6637239d2af844f9fae4c59bc572ec6535341509` on `release/v0.4.1`; PR https://github.com/collisionengineers/kanmer/pull/319; `plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.1, isolated MCP handshake lists 41 tools`; golden `20/20 scenarios passed in 16786 ms (budget 300000 ms)` (`C:\\kt-tmp\\core137\\prepare.log`).

## Steps 6–7 — delta review and merge

Independent reviewer `codex-independent-release-reviewer` wrote PASS attestation `scratch/review` v`6eb631af9294c6d5` at exact head `daaf95fa234cc0ce87cd5dd83d556cad6610fdfc`, plan hash `3ea6ccf2aff79ea3`, and ticket timestamp `2026-09-04T09:49:17.467Z`. F-001 through F-003 are fixed; F-004 through F-010 remain terminally accepted-risk; F-011 is fixed by the completed exact-head rail. Hosted `verify` run 33858904027 job 100978587075 PASS (14m32s); replacement `kanmer-gate` job 100982948637 PASS (7m35s); zero review threads; merge state CLEAN.

PR #319 squash-merged at `2026-09-04T09:58:23Z` as `4e94ad806d5f74dbfdc9b0789190624addf4cbdd`. CORE-137 moved Review → Verifying at `2026-09-04T09:58:39.193Z`; board pushed at `be39d14f241c734b3b92e5a4fe264614514fc7ec`.

`release_channel record` on `main@1` (lease revision 20) recorded PRs 310–319 and tickets MCP-055, GUI-147, SKILL-039, GUI-149, CORE-139, MCP-056, CORE-133, GUI-150, CORE-119 and CORE-137 with verification pending.

## Exact-merge verification attempt

- `gh pr view 319 --json state,mergeCommit,url,mergedAt,headRefOid,baseRefOid` exit 0: state MERGED, merge commit `4e94ad806d5f74dbfdc9b0789190624addf4cbdd`.
- `git fetch origin` exit 0.
- `git worktree add --detach .worktrees/verify-core-137-4e94ad806d5f74dbfdc9b0789190624addf4cbdd 4e94ad806d5f74dbfdc9b0789190624addf4cbdd` exit 0.
- Detached assertions: `rev-parse HEAD` exact SHA (exit 0), `symbolic-ref --short -q HEAD` empty/detached (exit 1 as expected), `status --short --branch` = `## HEAD (no branch)` (exit 0), common Git directory = source repository (exit 0).
- `npm ci` in the detached worktree exit 0 (647 packages installed).
- `npm run verify` in the detached worktree exit 0: core 876/876; GUI 553/553; MCP/server 243 tests with 242 pass + 1 Windows-not-applicable skip; scripts 180/180; MCP smoke 384/384; headless, MCPB, protocol 54/54, discovery 15/15, golden 20/20 in 28032ms; skill prose, managed AGENTS block 31/31 and plugin consistency all PASS.

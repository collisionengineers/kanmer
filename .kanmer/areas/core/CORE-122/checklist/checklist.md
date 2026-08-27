# Checklist — CORE-122

- [x] Worktree `.worktrees/core-122` on branch `core-122-reconcile-inspector` from `origin/main`; ticket taken with that branch/worktree.
- [x] Four salvage files copied from `db63fb4b` by path (no cherry-pick/merge).
- [x] `types.ts`: `hasLegacyTicketClaim`, `ReconciliationEvidence` (claim `current|expired|unclaimed`, `expiresAt`, `reviewRound`, `remediationBudget`), `ReconciliationFinding`, `ReconciliationRecommendation` (`advisory: true`), `ReconciliationResult`; no Proposal/Action exports; `index.ts` exports reconciliation alongside review-attestation.
- [x] Classifier reordered: Review routes (merged / closed-unmerged / absent+unclaimed) evaluated before required-checks and missing-worktree early returns, warnings kept; `CLAIM_EXPIRED` warning added; no hash/proposal id.
- [x] Core tests: apply describe removed; new cases for closed-unmerged+red checks, merged+missing, merged+dirty, merged+unreachable, expired claim, advisory flag, finding-code coverage; `npm test -w @kanmer/core -- reconciliation` green (30/30, exit 0).
- [x] `execution-packet.ts` exports `gitCommonDirectory` and `sameWorktreePath`; collector uses `--git-common-dir` identity.
- [x] `git-reachability.mjs` gains `collectCommitReachabilityFromTarget`.
- [x] Collector: `applyReconciliation` removed; every `run` passes `timeout` and `maxBuffer`; claim block from `claimState` + board `claimExpiryMinutes` with `live`→`current`; `release.state: not-applicable`.
- [x] `reconcile_ticket` registered (readOnly, openWorld, `id` only); no `apply_reconciliation`; tsup entry and `test:http` enumeration added; `npm run typecheck -w @kanmer/mcp-server` green (exit 0).
- [x] MCP tests: apply test removed; timeout/maxBuffer assertion; stalled gh ⇒ unavailable; real `git worktree` fixture ⇒ `matches-claim`; foreign repo ⇒ `foreign-repository`; dry-run leaves `updated` unchanged; expired claim reported; `node --test packages/mcp-server/src/reconciliation.test.mjs` green (8/8, exit 0).
- [x] Smoke (`smoke.mjs`, `smoke-protocol.mjs`) at 38 tools with `reconcile_ticket` assertions and no-mutation check (257/257 and 46/46, exit 0).
- [x] Docs: `tool-reference.md` row, `AGENTS.md` 38, `docs/manual/connect.md` 38, `npm run build:manual` regenerated chapter.
- [x] `npm run plugin:build` and `npm run plugin:check` pass (exit 0; "38 tools match, bundle bytes match"); bundle committed.
- [x] [pre-review] `npm run verify` run twice (exit 1 both: attempt 1 core timeouts in `docs.test.ts`/`migrate.test.ts`, attempt 2 known `kanmerGit.test.ts` orphan-cleanup quirk); every later rail run individually; `test:http` 114/115 (`http.test.mjs` 2 s spawnSync timeout, host-load flake with control evidence) and `test:scripts` 118/120 (known antigravity quirk); all other rails exit 0. Recorded verbatim in the post-implementation report.
- [x] [pre-review] Commit `7f841427` carries `Kanmer: CORE-122`; PR #289 open against `main` with the footer; #286 attribution in the post-implementation report.
- [x] [pre-review] Post-implementation report written; ticket moved to Review; stop.

## Progress notes

- 2026-08-27 implementation complete in `.worktrees/core-122`; focused rails green; `npm run verify` in progress.
- 2026-08-27 PR https://github.com/collisionengineers/kanmer/pull/289 head `7f8414276ca86f582d8a41d55c4d2d0ac94b6d20`.

## Closeout — CORE-122

- [x] PR merge verified (`gh pr view --json state,mergedAt`: MERGED 2026-08-27T16:10:40Z, merge a8318ea631038dfd82e0dc7bbc1f4656f79361f9)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage (Done since 2026-08-27T16:35:44Z, proof PASS 7781b1b90d3febf8)
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/core-122` (+ verify worktree)
- [x] `git branch -D core-122-reconcile-inspector` (squash-merged) + `git push origin --delete`
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`

# Post-implementation report — CORE-122

Branch `core-122-reconcile-inspector`, worktree `.worktrees/core-122`, head `7f8414276ca86f582d8a41d55c4d2d0ac94b6d20`, based on `origin/main` `dc514375` (CORE-121). Implemented by claude-code (lane 2, run 20260827T133106Z-claude-code).

## Attribution

Salvaged from PR #286 (CORE-113, branch `core-113-rescue-reconciliation`, head `db63fb4b150e956dafb88c75c99ff3088a0b72cc`): the core classifier and evidence/finding types, the MCP collector (`proofEvidence`, `requiredChecksEvidence`, `pullRequestEvidence`, PR selection, `workspaceEvidence`, `commitEvidence`), `collectCommitReachabilityFromTarget`, both test files and the smoke assertions. Files were copied by path with `git show db63fb4b:<path>`; nothing was cherry-picked or merged because the branch predates CORE-121.

## Files changed and why

| File | Why |
| --- | --- |
| `packages/core/src/types.ts` | `hasLegacyTicketClaim`, `ReconciliationEvidence` (claim block `current\|expired\|unclaimed`, `expiresAt`, `reviewRound`, `remediationBudget`), `ReconciliationFinding`, `ReconciliationRecommendation` (`advisory: true`), `ReconciliationResult`. No Proposal/Action types. |
| `packages/core/src/reconciliation.ts` (new) | Pure classifier. Hard refusals first (board worktree, preserved release evidence, inconclusive evidence); then advisory warnings recorded without returning (dirty, missing, unrecorded workspace, `CLAIM_EXPIRED`, `REQUIRED_CHECKS_NOT_GREEN`); then Review routes (merged → `MOVE_TO_VERIFYING` unless a recorded commit is unreachable; closed-unmerged → `MOVE_TO_IMPLEMENTING`; absent PR + unclaimed → `MOVE_TO_IMPLEMENTING`); the same warnings become stops for other stages; then Verifying/Done routes. No hash/proposal id. |
| `packages/core/src/index.ts` | Export `reconciliation.js` alongside (not instead of) `review-attestation.js`. |
| `packages/core/src/reconciliation.test.ts` (new) | 30 vitest cases: salvaged matrix minus the apply suite, plus closed-unmerged+red checks, merged+missing, merged+dirty, merged+unreachable, expired claim, advisory flag, finding-code coverage (19 codes), no-proposal-surface. |
| `packages/mcp-server/src/reconciliation.ts` (new) | Read-only collector. `applyReconciliation` removed. `ReconciliationRunOptions` carries `timeout`/`maxBuffer`; constants `GIT_TIMEOUT_MS`/`GH_TIMEOUT_MS` 15 s, `GIT_MAX_BUFFER` 32 KiB, `GH_MAX_BUFFER` 1 MiB; a `killed` child is `unavailable`. Claim block from `claimState` + `board.claimExpiryMinutes ?? 30`, `live` → `current`, derivation identical to `get_execution_packet`. Worktree identity via injected `resolveCommonDir` defaulting to `gitCommonDirectory`; comparison via `sameWorktreePath`. `release.state: "not-applicable"`. |
| `packages/mcp-server/src/execution-packet.ts` | `export` on `gitCommonDirectory`, `sameWorktreePath` and the `ResolvedPath` type. No behaviour change. |
| `packages/mcp-server/src/git-reachability.mjs` | `collectCommitReachabilityFromTarget` (verbatim from #286; already bounded). |
| `packages/mcp-server/src/reconciliation.test.mjs` (new) | 8 node:test cases: salvaged decoders/selection/URL/reachability tests now asserting bounded options on every call; stalled `gh` (`killed: true`) → `unavailable` + `EVIDENCE_INCONCLUSIVE`; workspace identity matrix incl. `matches-claim` and unresolved common dir; a real temp repo with `git worktree add .worktrees/TICK-001` using the real `execFile` → `matches-claim`/`current`, dirty detection, and a foreign repo → `foreign-repository`; dry-run leaves item JSON and activity count unchanged; claim block `current`/`expired` with `controller`, `worker`, `expiresAt`. |
| `packages/mcp-server/src/index.ts` | Register `reconcile_ticket` (`readOnlyHint: true`, `openWorldHint: true`, input `id` only). No `apply_reconciliation`. |
| `packages/mcp-server/tsup.config.ts`, `package.json` | `src/reconciliation.ts` build entry; `src/reconciliation.test.mjs` in `test:http`. |
| `packages/mcp-server/src/smoke.mjs`, `smoke-protocol.mjs` | 37 → 38; `reconcile_ticket` exists, read-only + open-world, `apply_reconciliation` absent; unclaimed Review ticket without PR → `MOVE_TO_IMPLEMENTING`, `advisory: true`, no `proposal`, claim `unclaimed`/0/1, release `not-applicable`, first finding `REVIEW_WITHOUT_PR_OR_WORKER`; ticket `status`/`updated` unchanged afterwards. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `reconcile_ticket` row under Read tools. |
| `AGENTS.md`, `docs/manual/connect.md` | 37 → 38 tools. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerated (`npm run build:manual`). |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated (`npm run plugin:build`); `plugin:check` passes. |

## Governing docs

- FRD-028 — **Meets** the dry-run half: acceptance 1 (evidence + recommendation per recognised invalid state without changing board/Git/workspace — proven by the dry-run test and smoke no-mutation check), 4 (dirty workspace reported and preserved), 5 (board worktree refused with `BOARD_WORKTREE_PROTECTED`), edge case (unavailable GitHub/CI → `EVIDENCE_INCONCLUSIVE`, nothing invented). Acceptance 2 and the apply parts of 3 are deliberately out of scope (HZN-008 item 6, after CORE-115). Not modified; no new ADR.

## Commands and exit codes (cwd `.worktrees/core-122`)

| Command | Result |
| --- | --- |
| `npm ci` | exit 0 |
| `npm run build -w @kanmer/core` | exit 0 |
| `npm test -w @kanmer/core -- reconciliation` | 30/30, exit 0 |
| `npm run typecheck -w @kanmer/mcp-server` | exit 0 |
| `npm run build -w @kanmer/mcp-server` | exit 0 |
| `node --test packages/mcp-server/src/reconciliation.test.mjs` | 8/8, exit 0 |
| `npm run build:manual` | exit 0 |
| `npm run plugin:build` | exit 0 |
| `npm run plugin:check` | exit 0 — "38 tools match, bundle bytes match … isolated MCP handshake lists 38 tools" |
| `node packages/mcp-server/src/smoke.mjs` | 257/257, exit 0 |
| `npm run smoke:protocol` | 46/46, exit 0 |
| `npm run verify` attempt 1 | **exit 1** at `npm test` core rail: `docs.test.ts > resolves the profile from the area default…` and `migrate.test.ts > strips folded ids from blocks[] too` — "Test timed out in 5000ms" and `ENOTEMPTY … kanmer-migrate-*/.kanmer/data` (375/377). Both files untouched. |
| `npm test -w @kanmer/core` (rerun) | 377/377, exit 0 |
| `npm run verify` attempt 2 | **exit 1** at GUI rail: `apps/gui/src/main/kanmerGit.test.ts > ensureBoardWorktree reconciliation > preserves source edits when an orphan version conflicts before cleanup` (485/486; core 377/377 in this run). Known host quirk named in the run brief; file untouched. Later rails did not run in this pass. |
| `npm run test:http -w @kanmer/mcp-server` | **exit 1**, 114/115: `http.test.mjs > project resolution fails before binding and leaves no listener` — `spawnSync node.exe ETIMEDOUT` (the test's 2 s `spawnSync` timeout). All 8 reconciliation tests passed inside this rail. See flake analysis. |
| `node --test packages/mcp-server/src/http.test.mjs` | attempts 1–3 (during the other lane's verify run): exit 1 same test; attempts 4–5: exit 0, 5/5, that test 1.04–1.17 s. |
| Control: detached checkout of untouched `dc514375` (`npm ci`, `npm run build`, same test file) | 3 × exit 0; the test 0.9–1.5 s; isolated runs 0.9–1.1 s in both checkouts. Control worktree removed afterwards. |
| `npm run test:scripts` | **exit 1**, 118/120: `scripts/antigravity-plugin-config.test.mjs` "the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces" and "the shipped installer shim restores the provider cwd before MCP launch" — the two known host-quirk failures named in the run brief. |
| `npm run typecheck`, `verify:docs`, `smoke:headless`, `mcpb:check`, `smoke:discovery`, `verify:skills`, `verify:agents-block` | each exit 0 |

Flake analysis for `http.test.mjs`: the child imports `dist/http.js` (which now inlines the collector via `./index.js` and therefore loads `gray-matter`, +14 KB) and fails root resolution; measured child wall time is 0.85–1.5 s in both this branch and untouched main, against a hard-coded 2 s `spawnSync` timeout. The three failures coincided with the CORE-123 lane's `npm run verify` on the same host; repeated runs afterwards pass. No test was weakened. Hosted `verify` is authoritative for these rails.

## Deviations recorded

- `ReconciliationRun` option type widened (`timeout`, `maxBuffer`) and `execution-packet.ts` additionally exports the `ResolvedPath` type; both needed for the injected resolver signature.
- Tool description and `tool-reference.md` text written fresh (say "advisory", "no apply surface") rather than copied from #286.
- `npm run verify` never completed end-to-end green on this host; every rail was executed and recorded individually (table above).

## Risks and follow-ups

- Merged Review with red/pending required checks now recommends `MOVE_TO_VERIFYING` with `REQUIRED_CHECKS_NOT_GREEN` kept as a warning (open-questions Q2). Reviewer should confirm this reading of the ticket's "keep the warnings" instruction.
- `hasLegacyTicketClaim` is now public core API.
- Expired-claim release/transfer recommendations and `apply_reconciliation` remain for CORE-115 / HZN-008 item 6.

## For kanmer-verify (on the merge SHA)

- `npm test -w @kanmer/core -- reconciliation` (30), `node --test packages/mcp-server/src/reconciliation.test.mjs` (8), `node packages/mcp-server/src/smoke.mjs` (38 tools, reconcile assertions), `npm run smoke:protocol`, `npm run plugin:check` (38 tools, bundle bytes match), `npm run check:manual`.
- Confirm `tools/list` has `reconcile_ticket` and no `apply_reconciliation`; confirm `git grep applyReconciliation` is empty.

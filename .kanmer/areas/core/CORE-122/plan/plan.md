# Plan — CORE-122: Read-only reconciliation inspector (reconcile_ticket) salvaged from PR #286

## Objective
Land a read-only `reconcile_ticket` MCP tool (38 tools total) that collects bounded board/Git/GitHub/CI/workspace facts and returns typed findings plus an advisory `recommendation`, salvaged from PR #286 with the six required fixes and no mutating surface.

## Starting state
- `origin/main` = `dc514375` (CORE-121 merged): core exports `claimState`, `ClaimState` (`unclaimed|live|expired`), `DEFAULT_CLAIM_EXPIRY_MINUTES`; items carry `claim_expires_at`, `claim_controller`, `review_round`, `remediation_budget`; `execution-packet.ts` builds `ExecutionPacketClaim` and has private `gitCommonDirectory`/`sameWorktreePath` helpers.
- MCP server registers 37 tools; counts hard-coded in `AGENTS.md:404`, `docs/manual/connect.md:145`, `smoke.mjs:62`, `smoke-protocol.mjs:160`, generated `chapters.generated.ts`.
- Salvage source: `db63fb4b150e956dafb88c75c99ff3088a0b72cc` (fetched). It diverged before CORE-121; whole-commit cherry-picks would delete CORE-121 work (research F2).
- Full research: `research/research.md` (F1–F10); files map: `files/files.md`; questions Q1–Q3 resolved.

## Governing docs
- `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` — **Meets** the dry-run half: acceptance 1 (dry-run returns evidence and recommendation per recognised invalid state without changing board/Git/workspace), 4 (dirty workspace reported and preserved), 5 (board-worktree protection; `.worktrees/kanmer` never mutated), edge case (unavailable GitHub/CI ⇒ inconclusive evidence, no invented result). Acceptance 2 and 3's apply/route-to-stage behaviour is deliberately **not** implemented here (HZN-008 item 6, after CORE-115); the result is advisory only. No modification to the FRD; no new ADR (no new architectural decision — the read-only/advisory split is already recorded in HZN-008 context and CORE-113's outcome).

## Required changes
1. **Core types** (`packages/core/src/types.ts`): add `hasLegacyTicketClaim`, `ReconciliationEvidence`, `ReconciliationFinding`, `ReconciliationRecommendation { action; targetStatus?; advisory: true }`, `ReconciliationResult { evidence; findings; recommendation | null }`. `evidence.claim` = `{ state: "current"|"expired"|"unclaimed"; controller; worker; takenAt; expiresAt; branch; worktree; reviewRound; remediationBudget }`. No `ReconciliationProposal`/`ReconciliationAction` exports; action literal union lives inline on the recommendation type.
2. **Core classifier** (`packages/core/src/reconciliation.ts`, new): `reconcileEvidence(evidence)`; remove hashing/`proposal()`; ordering: BOARD_WORKTREE_PROTECTED (return) → RELEASE_EVIDENCE_PRESERVED (return) → EVIDENCE_INCONCLUSIVE (return) → push advisory warnings without returning: DIRTY_WORKSPACE_PRESERVED, WORKSPACE_MISSING (claimed), CLAIM_WITHOUT_RECORDED_WORKSPACE (claimed), CLAIM_EXPIRED, REQUIRED_CHECKS_NOT_GREEN → Review routes: merged+mergeSha (RECORDED_COMMIT_UNREACHABLE blocks with error, else MOVE_TO_VERIFYING), closed-unmerged ⇒ MOVE_TO_IMPLEMENTING, absent PR and no claim ⇒ MOVE_TO_IMPLEMENTING → for non-Review stages, the hard stops formerly early-returned (dirty, missing, not-recorded, checks not green, VERIFYING_WITHOUT_MERGE_SHA, RECORDED_COMMIT_UNREACHABLE) now return `null` after their warning → Verifying routes (PROOF_MERGE_SHA_MISMATCH, PASS ⇒ MOVE_TO_DONE, FAIL ⇒ disposition) → Done routes (CLEAN_TERMINAL_CLAIM ⇒ RELEASE_CLEAN_TERMINAL_CLAIM only for `matches-claim`; identity unverified warning) → NO_RECONCILIATION_NEEDED. Every path preserves pure-function behaviour (input not mutated).
3. **Core export**: add `export * from "./reconciliation.js"` in `packages/core/src/index.ts`, keeping `review-attestation.js`.
4. **Collector** (`packages/mcp-server/src/reconciliation.ts`, new): salvage `proofEvidence`, `requiredChecksEvidence`, `pullRequestEvidence`, PR selection, `commitEvidence`, `workspaceEvidence`, `collectReconciliationEvidence`, `reconcileTicket`. Remove `applyReconciliation`. `ReconciliationRun` options gain `timeout: number; maxBuffer: number`; constants `GIT_TIMEOUT_MS = 15_000`, `GH_TIMEOUT_MS = 15_000`, `GIT_MAX_BUFFER = 32 * 1024`, `GH_MAX_BUFFER = 1024 * 1024`; every `run(...)` passes them. Claim block: `state = claimState(item, now, board.claimExpiryMinutes ?? DEFAULT) === "live" ? "current" : that value`; `expiresAt` mirrors `execution-packet.ts`; `controller = item.claim_controller ?? item.assignee ?? null`; `reviewRound = item.review_round ?? 0`; `remediationBudget = item.remediation_budget ?? 1`. Worktree identity: replace `--show-toplevel` with `--git-common-dir` for candidate and `store.paths.repoRoot`, comparing via exported `sameWorktreePath` after `physicalExistingPath` resolution; `workspaceEvidence` accepts an optional `resolveCommonDir(dir)` for tests, defaulting to the exported `execution-packet.ts` helper. `release: { state: "not-applicable" }` retained.
5. **execution-packet.ts**: `export` `gitCommonDirectory` and `sameWorktreePath` (no behaviour change).
6. **git-reachability.mjs**: add `collectCommitReachabilityFromTarget` verbatim from #286.
7. **MCP registration** (`packages/mcp-server/src/index.ts`): register `reconcile_ticket` only, `annotations: { readOnlyHint: true, openWorldHint: true }`, `inputSchema: { id }`, description states advisory/read-only. No `apply_reconciliation`.
8. **Build/test wiring**: `tsup.config.ts` add `src/reconciliation.ts` entry; `package.json` `test:http` add `src/reconciliation.test.mjs`.
9. **Tests**: `packages/core/src/reconciliation.test.ts` — salvage matrix minus apply describe; rewrite "does not advance failing checks" to a Verifying case; add: closed-unmerged Review + `fail` checks ⇒ MOVE_TO_IMPLEMENTING with REQUIRED_CHECKS_NOT_GREEN warning; merged Review + `missing` workspace (claimed) ⇒ MOVE_TO_VERIFYING with WORKSPACE_MISSING warning; merged Review + `dirty` ⇒ MOVE_TO_VERIFYING with warning; merged Review + `unreachable` ⇒ null; `expired` claim on Implementing ⇒ CLAIM_EXPIRED warning, null recommendation; every recommendation has `advisory: true`; a finding-code coverage assertion listing all codes. `packages/mcp-server/src/reconciliation.test.mjs` — salvage minus apply test; assert every `run` call receives numeric `timeout` and `maxBuffer`; stalled `gh` (rejects with `killed: true`) ⇒ `pullRequest.state === "unavailable"` and EVIDENCE_INCONCLUSIVE; real temp git repo + `git worktree add .worktrees/TICK-001` with real `execFile` ⇒ `claimIdentity === "matches-claim"`; foreign temp repo ⇒ `foreign-repository`; `reconcileTicket` leaves `store.getItem(id).updated` unchanged; claim block reports `expired` for a stale `claim_expires_at`.
10. **Smoke**: `smoke.mjs` 37→38, add `reconcile_ticket` to the existence list, assert read-only + open-world, create unclaimed Review ticket with no PR, call `reconcile_ticket`, assert `recommendation.action === "MOVE_TO_IMPLEMENTING"`, `recommendation.advisory === true`, `evidence.claim.state === "unclaimed"`, and the ticket's `status`/`updated` are unchanged after the call. `smoke-protocol.mjs` 37→38.
11. **Docs/counts**: `tool-reference.md` add `reconcile_ticket` row (Read tools table); `AGENTS.md:404` 37→38; `docs/manual/connect.md:145` 37→38; `npm run build:manual`; `npm run plugin:build`; `npm run plugin:check`.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/types.ts` | evidence/finding/recommendation types, `hasLegacyTicketClaim` |
| Add | `packages/core/src/reconciliation.ts` | pure classifier (from #286, reordered) |
| Add | `packages/core/src/reconciliation.test.ts` | classifier matrix |
| Modify | `packages/core/src/index.ts` | export |
| Add | `packages/mcp-server/src/reconciliation.ts` | collector (from #286, read-only) |
| Add | `packages/mcp-server/src/reconciliation.test.mjs` | collector tests |
| Modify | `packages/mcp-server/src/execution-packet.ts` | export two helpers |
| Modify | `packages/mcp-server/src/git-reachability.mjs` | `collectCommitReachabilityFromTarget` |
| Modify | `packages/mcp-server/src/index.ts` | register tool |
| Modify | `packages/mcp-server/tsup.config.ts`, `packages/mcp-server/package.json` | build entry, test rail |
| Modify | `packages/mcp-server/src/smoke.mjs`, `packages/mcp-server/src/smoke-protocol.mjs` | 38 + assertions |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, `AGENTS.md`, `docs/manual/connect.md` | docs |
| Regenerate | `apps/gui/src/renderer/src/manual/chapters.generated.ts`, `plugins/kanmer/mcp/kanmer-mcp.cjs` | generated artifacts (committed) |

## Do not modify
`packages/core/src/store.ts` (no `applyReconciliation`/`releaseTicket` change), `packages/core/src/merge-gate.ts`, `packages/mcp-server/src/check-pr.mjs`, `.github/workflows/pr.yml`, `apps/gui/src/main/kanmerGit.ts` (CORE-123 lane), `.worktrees/kanmer`, any `.kanmer` file directly, any GUI surface, package dependencies.

## Constraints
- Fixed argv only; the tool accepts nothing but `id`; `cwd` is always `store.paths.repoRoot`.
- Every subprocess call bounded by `timeout` and `maxBuffer`; any failure ⇒ `unavailable`, never a fabricated result.
- No board mutation of any kind in `reconcile_ticket`; no activity entry.
- Salvage by file/hunk copy from `db63fb4b`; never `git cherry-pick`/`merge` the branch.
- Windows: write files with Edit/Write tools; `MSYS_NO_PATHCONV=1` for `git show ref:path`.
- Attribute salvaged code to PR #286 in the post-implementation report.

## Ordered steps
1. `git fetch origin`; `git worktree add .worktrees/core-122 -b core-122-reconcile-inspector origin/main`; `take_ticket` with that branch/worktree.
2. Copy `packages/core/src/reconciliation.ts`, `reconciliation.test.ts`, `packages/mcp-server/src/reconciliation.ts`, `reconciliation.test.mjs` from `db63fb4b` into the worktree (`git show`).
3. Apply Required change 1 (types) and 3 (export); build core (`npm run build -w @kanmer/core`).
4. Apply Required change 2 (classifier rewrite) and 9 (core tests); run `npm test -w @kanmer/core -- reconciliation`.
5. Apply Required changes 5, 6, 4 (helpers export, reachability, collector), 7, 8; `npm run typecheck -w @kanmer/mcp-server`.
6. Apply MCP tests (9); run `npm run build -w @kanmer/mcp-server && node --test packages/mcp-server/src/reconciliation.test.mjs`.
7. Apply Required changes 10 and 11; `npm run build:manual`; `npm run plugin:build`; `npm run plugin:check`; `node packages/mcp-server/src/smoke.mjs` (or the repo's smoke script per AGENTS.md §6).
8. `npm run verify` (long; background, ≥12 min). Record known host quirks verbatim with exit codes.
9. Commit(s) with `Kanmer: CORE-122` footer; push; open PR to `main` with footer; write post-implementation report; move to Review.

## Acceptance checks
- Production registration: `reconcile_ticket` in `packages/mcp-server/src/index.ts`; visible in `tools/list` (38).
- Bundled artifact: `plugins/kanmer/mcp/kanmer-mcp.cjs` regenerated and `plugin:check` passes; `dist/reconciliation.js` is a tsup entry.
- Ticket verification bullets: core matrix covers every finding code incl. closed-unmerged+red ⇒ MOVE_TO_IMPLEMENTING and merged Review + missing/dirty ⇒ MOVE_TO_VERIFYING with warning; `.worktrees/<id>` linked worktree ⇒ `matches-claim`; dry-run leaves `updated` unchanged; stalled `gh` ⇒ `unavailable` within the timeout.
- No test weakened; exact commands and exit codes recorded in the report.

## Commands
- cwd `.worktrees/core-122`: `npm ci` (if node_modules absent), `npm run build -w @kanmer/core`, `npm test -w @kanmer/core -- reconciliation`, `npm run typecheck -w @kanmer/mcp-server`, `npm run build -w @kanmer/mcp-server`, `node --test packages/mcp-server/src/reconciliation.test.mjs`, `npm run build:manual`, `npm run plugin:build`, `npm run plugin:check`, `npm run verify`.

## Failure and deviation rules
Stop and report if: a CORE-123 lane file must change; core tests need `store.ts` changes; `plugin:check` fails after regeneration for reasons outside this diff; `verify` fails on rails other than the two known host quirks (`scripts/antigravity-plugin-config.test.mjs`, `kanmerGit.test.ts` orphan cleanup); any dependency addition is needed. Record any deviation in `scratch/execution`.

## Stop condition
PR open against `main` with `Kanmer: CORE-122` footer, post-implementation report written, ticket in Review. Do not review, merge, verify, close out, or release the claim.

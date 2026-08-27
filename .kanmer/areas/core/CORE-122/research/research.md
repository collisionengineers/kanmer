# Research — CORE-122 read-only reconciliation inspector

## Question

How do we land the read-only half of FRD-028 (`reconcile_ticket`) by salvaging PR #286 (CORE-113, head `db63fb4b150e956dafb88c75c99ff3088a0b72cc`) onto current `origin/main` (`dc514375`, which includes CORE-121), applying the six required fixes, and dropping every mutating surface?

## Findings

### F1 — What PR #286 contains (source: `git diff --stat origin/main...db63fb4b`)

18 files, 1880 insertions. Salvageable as-is or with small edits:

- `packages/core/src/reconciliation.ts` (145 lines) — pure classifier `reconcileEvidence(evidence) -> { evidence, findings, proposal }` plus `reconciliationProposalId` (sha256 of evidence+action).
- `packages/core/src/types.ts` — adds `hasLegacyTicketClaim`, `ReconciliationEvidence`, `ReconciliationAction`, `ReconciliationProposal`, `ReconciliationFinding`, `ReconciliationResult`.
- `packages/mcp-server/src/reconciliation.ts` (271 lines) — collector: `proofEvidence`, `requiredChecksEvidence`, `pullRequestEvidence`, `workspaceEvidence`, `collectReconciliationEvidence`, `reconcileTicket`, `applyReconciliation`. Uses an injectable `run(command, args, {cwd, windowsHide})` for `gh`/`git`.
- `packages/mcp-server/src/git-reachability.mjs` — adds `collectCommitReachabilityFromTarget({commits, targetSha, cwd, run})` (already has `timeout: 15_000`, `maxBuffer: 32*1024`).
- `packages/core/src/reconciliation.test.ts` (vitest, 27 tests incl. 5 `KanmerStore.applyReconciliation` tests) and `packages/mcp-server/src/reconciliation.test.mjs` (node:test, 6 tests incl. 1 apply test).
- `packages/mcp-server/src/index.ts` registrations, `tsup.config.ts` entry (`src/reconciliation.ts` must be an entry so the `.test.mjs` can import `../dist/reconciliation.js`), `package.json` `test:http` enumeration, `smoke.mjs` / `smoke-protocol.mjs` (count 39), `tool-reference.md`, `AGENTS.md`, `docs/manual/connect.md`, `chapters.generated.ts`, `plugins/kanmer/mcp/kanmer-mcp.cjs`.

NOT salvageable: `packages/core/src/store.ts` (+65: `applyReconciliation`, `releaseTicket(expectedUpdated)`), the `apply_reconciliation` tool, and the apply tests.

### F2 — The branch is based on pre-CORE-121 main (source: `git diff origin/main db63fb4b -- packages/core/src/index.ts, types.ts, mcp-server/src/index.ts`)

The salvage branch diverged before `dc514375`; a naive diff *removes* CORE-121 work (`claimExpiryMinutes`, `claim_expires_at`, `claim_controller`, `review_round`, `remediation_budget`, `review-attestation.js` export, `take_ticket` transfer/renew, `move_item reason`, and the CORE-121 smoke block). **Do not cherry-pick whole commits or apply the diff**; copy the additive hunks only. In `packages/core/src/index.ts` ADD `export * from "./reconciliation.js"` next to `review-attestation.js`, never replace it.

### F3 — CORE-121 claim contract now on main (source: `packages/core/src/types.ts` @ dc514375)

- `export type ClaimState = "unclaimed" | "live" | "expired"`; `claimState(item, now, minutes)`; `DEFAULT_CLAIM_EXPIRY_MINUTES = 30`; board `claimExpiryMinutes`.
- Item fields: `claim_expires_at`, `claim_controller`, `review_round`, `remediation_budget`.
- `execution-packet.ts` builds an `ExecutionPacketClaim { state, expiresAt, controller, reviewRound, remediationBudget }` from `store.getBoard().claimExpiryMinutes ?? 30` — the collector should mirror that exact derivation.
- Implication: the ticket asks for `current | expired | unclaimed`. Core's enum spells the live case `"live"`. Options: (a) map core `"live"` → evidence `"current"` at the collector, or (b) reuse `ClaimState` verbatim. See open question Q1; default choice is (a) because the ticket body and HZN-008 context both say `current`, and evidence is a distinct advisory schema.

### F4 — Classifier ordering defect (source: salvage `reconciliation.ts` lines 60–100; CORE-113 `scratch/review.md` F-016; GH-3867261023)

Current order: board-worktree → dirty (returns unless Review) → missing+claim (return) → not-recorded+claim (return) → release contended (return) → EVIDENCE_INCONCLUSIVE (return) → VERIFYING_WITHOUT_MERGE_SHA → REQUIRED_CHECKS_NOT_GREEN (return) → RECORDED_COMMIT_UNREACHABLE (return) → Review routes → Verifying routes → Done routes.

Required change: closed-unmerged Review (→ MOVE_TO_IMPLEMENTING) and merged Review (→ MOVE_TO_VERIFYING) must be evaluated *before* the REQUIRED_CHECKS_NOT_GREEN and WORKSPACE_MISSING early returns, while still pushing those findings as warnings. RECORDED_COMMIT_UNREACHABLE must still block merged Review → Verifying (F-004 / GH-3867199111 was a fixed major), and EVIDENCE_INCONCLUSIVE must still block everything. Design: collect "advisory warnings" (missing workspace, dirty workspace, red/pending checks) into `findings` without returning; then route Review; then apply the remaining hard stops for other stages.

The existing salvage test "reports a missing taken workspace" uses `status: implementing`, so it survives reordering; "does not advance failing checks" uses `status: review` + merged PR + `fail` checks and expects `null` — under the new rule a merged Review with red checks still recommends MOVE_TO_VERIFYING? No: the ticket says *closed-unmerged with red checks → MOVE_TO_IMPLEMENTING*. For merged Review, the PR is already merged so required checks on the PR are moot; keep the warning and still recommend MOVE_TO_VERIFYING only if commits are reachable. That existing test must be rewritten to a closed-unmerged case (see Q2 for the merged+fail decision).

### F5 — Worktree identity via `--git-common-dir` (source: `packages/mcp-server/src/execution-packet.ts` lines 207–225, 315–335)

`execution-packet.ts` has a private `gitCommonDirectory(directory)` → `physicalExistingPath(canonicalPathFrom(directory, output))` and `sameWorktreePath`. They are not exported. Plan: export `gitCommonDirectory` and `sameWorktreePath` (and `canonicalPathFrom` is internal to them) from `execution-packet.ts`, then use them in the collector for both the candidate worktree and `store.paths.repoRoot`. That helper uses `execFileAsync` directly with no injectable `run`; for the MCP unit test (which stubs `run`) the collector must keep an injectable path. Approach: the collector calls `run("git", ["-C", candidate, "rev-parse", "--git-common-dir"], …)` for both sides and normalises via `path.resolve(candidate, output)` + `fs.realpath` (best-effort), mirroring `gitCommonDirectory`'s semantic, OR accept an injected `resolveCommonDir`. Simplest faithful reuse: export `gitCommonDirectory`/`sameWorktreePath` and let `workspaceEvidence` accept an optional `commonDir` resolver defaulting to the exported one; tests inject a stub. Verification bullet 2 ("a linked `.worktrees/<id>` worktree is classified `matches-claim`") needs a real git worktree fixture in the MCP test (create a temp repo, `git worktree add`, run with the real `execFile`).

### F6 — Timeouts (source: `git-reachability.mjs`, `execution-packet.ts`)

The salvage `ReconciliationRun` options type is `{ cwd, windowsHide }` only; `execFile` calls have no timeout. Existing precedent: `timeout: 15_000`, `maxBuffer: 32 * 1024` in git-reachability. `gh pr view/checks` output is small; use `timeout: 15_000` and `maxBuffer: 1024 * 1024` for `gh` (JSON), `32 * 1024` for git. Extend the `ReconciliationRun` options type to include `timeout` and `maxBuffer`; any rejection (incl. timeout `killed`/`ETIMEDOUT`) already maps to `unavailable`. Verification bullet 3 ("a stalled gh returns unavailable within the timeout") can be tested with a fake `run` that rejects with `{ killed: true, signal: "SIGTERM" }` and by asserting every call passes `timeout` and `maxBuffer`.

### F7 — Tool count and smoke rails (source: grep)

Main registers 37 tools. Count references to update to 38: `AGENTS.md:404`, `docs/manual/connect.md:145`, `apps/gui/src/renderer/src/manual/chapters.generated.ts` (regenerate with `npm run build:manual`; `npm test` runs `check:manual` first), `packages/mcp-server/src/smoke.mjs:62`, `packages/mcp-server/src/smoke-protocol.mjs:160-161`. `scripts/check-plugin-sync.mjs` only reports `toolCount`, no hard-coded number. Plugin bundle `plugins/kanmer/mcp/kanmer-mcp.cjs` must be regenerated (`npm run plugin:build`, then `npm run plugin:check`).

### F8 — Public API rename (source: ticket body)

Drop `ReconciliationAction`/`ReconciliationProposal` and `reconciliationProposalId` from the public API. Replace with `recommendation: { action: "MOVE_TO_IMPLEMENTING" | "MOVE_TO_VERIFYING" | "MOVE_TO_DONE" | "RELEASE_CLEAN_TERMINAL_CLAIM"; targetStatus?: string; advisory: true } | null` (an inline type in `ReconciliationResult`, `ReconciliationRecommendation` interface acceptable as a named export — it is not a "proposal" and carries no id/CAS token). The result must state it is advisory; no `id`, `ticketUpdated` needed (nothing consumes them).

### F9 — Claim evidence shape (source: salvage `types.ts`, ticket)

Replace `claim.state: "unclaimed" | "legacy"` with `"current" | "expired" | "unclaimed"` and add `expiresAt: string | null`, `reviewRound: number`, `remediationBudget: number`, keeping `controller` (`claim_controller ?? assignee`), `worker` (`assignee`), `takenAt`, `branch`, `worktree`. `hasLegacyTicketClaim` still decides "is there a claim at all" (branch/worktree-only claims). Classifier keeps using `hasClaim`; an `expired` claim is reported (new `CLAIM_EXPIRED` info/warning finding) but never recommends release — HZN-008 says expired-claim release waits for CORE-115.

### F10 — Existing gh conventions (source: `packages/mcp-server/src/check-pr.mjs` / merge-gate)

`gh` is invoked with fixed argv from `store.paths.repoRoot`; the salvage collector follows that. `openWorldHint: true` on `reconcile_ticket` was a fixed review finding (F-010) and stays.

## Implications for this ticket

1. Copy files from `db63fb4b` by path (`git show db63fb4b:<path> > <path>` for the two new source files and two tests; hand-merge the small hunks for `types.ts`, `index.ts` x2, `git-reachability.mjs`, `tsup.config.ts`, `package.json`, smoke files, docs). Never `git cherry-pick`/`merge`.
2. Remove: `applyReconciliation`, `store.applyReconciliation`, `apply_reconciliation` tool, `reconciliationProposalId`, `ReconciliationProposal`, `ReconciliationAction`, all apply tests and smoke apply assertions.
3. Reorder classifier per F4; add `CLAIM_EXPIRED` and claim block per F9; common-dir identity per F5; timeouts per F6.
4. Update counts to 38 and regenerate manual + plugin bundle.
5. Worktree for implementation: `.worktrees/core-122`, branch `core-122-reconcile-inspector` from `origin/main`.

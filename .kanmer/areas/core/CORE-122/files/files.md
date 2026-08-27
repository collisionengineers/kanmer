# Files — CORE-122

## Files the change touches

| File | Change | Risk |
| --- | --- | --- |
| `packages/core/src/types.ts` | Add `hasLegacyTicketClaim`, `ReconciliationEvidence` (claim block with `current/expired/unclaimed`, `expiresAt`, `reviewRound`, `remediationBudget`), `ReconciliationFinding`, `ReconciliationRecommendation`, `ReconciliationResult`. No `ReconciliationProposal`/`Action`. | Low — additive types; must not disturb CORE-121 fields. |
| `packages/core/src/reconciliation.ts` (new, from #286) | Pure classifier; reorder Review routes ahead of required-checks / missing-worktree early returns; `recommendation` instead of `proposal`; drop hash id. | Medium — policy semantics; matrix tests are the guard. |
| `packages/core/src/index.ts` | Add `export * from "./reconciliation.js"` (keep `review-attestation.js`). | Low. |
| `packages/core/src/reconciliation.test.ts` (new, from #286) | Keep classifier matrix; delete `KanmerStore.applyReconciliation` describe; add closed-unmerged+red-checks, merged+missing worktree, merged+dirty, expired-claim cases. | Low. |
| `packages/mcp-server/src/reconciliation.ts` (new, from #286) | Collector; drop `applyReconciliation`; claim block via `claimState` + board `claimExpiryMinutes`; `--git-common-dir` identity via exported `execution-packet.ts` helpers; `timeout`/`maxBuffer` on every `run`. | Medium — subprocess boundary. |
| `packages/mcp-server/src/execution-packet.ts` | Export `gitCommonDirectory` and `sameWorktreePath` (no behaviour change). | Low — but CORE-123 lane must not be editing this file; it is not in their list (merge-gate/check-pr/pr.yml/kanmerGit). |
| `packages/mcp-server/src/git-reachability.mjs` | Add `collectCommitReachabilityFromTarget` (from #286). | Low — additive; `check-pr.mjs` untouched. |
| `packages/mcp-server/src/reconciliation.test.mjs` (new, from #286) | Drop apply test; add timeout/maxBuffer assertion, stalled-gh case, real `git worktree` fixture proving `matches-claim`. | Low. |
| `packages/mcp-server/src/index.ts` | Register `reconcile_ticket` only (readOnlyHint true, openWorldHint true). | Low. |
| `packages/mcp-server/tsup.config.ts` | Add `src/reconciliation.ts` entry. | Low. |
| `packages/mcp-server/package.json` | Add `src/reconciliation.test.mjs` to `test:http`. | Low. |
| `packages/mcp-server/src/smoke.mjs`, `smoke-protocol.mjs` | 37 → 38; assert `reconcile_ticket` exists, read-only, open-world, returns `recommendation.action === "MOVE_TO_IMPLEMENTING"` with `advisory: true` for an unclaimed Review ticket without a PR; ticket unchanged afterwards. | Low. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Add `reconcile_ticket` row under Read tools. | Low. |
| `AGENTS.md` (§ mcp-server, line ~404) | 37 → 38 tools. | Low. |
| `docs/manual/connect.md` (line ~145) | 37 → 38. | Low. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerate via `npm run build:manual`. | Low — generated. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate via `npm run plugin:build`; verify `npm run plugin:check`. | Low — generated. |

## Ripple effects

- `npm test` → `check:manual` fails if `chapters.generated.ts` is stale.
- `scripts/check-plugin-sync.mjs` fails if the bundle is not regenerated after source changes.
- Isolated MCP handshake test reports tool count but does not pin it.
- `hasLegacyTicketClaim` becomes part of core's public API (exported from `types.ts`).

## Deliberately out of scope

- `apply_reconciliation`, `store.applyReconciliation`, `releaseTicket(expectedUpdated)`, any board mutation, any audit entry.
- Expired-claim release/transfer recommendations (CORE-115), release-attempt evidence (CORE-116) — `release.state` stays `not-applicable`.
- `merge-gate.ts`, `check-pr.mjs`, `.github/workflows/pr.yml`, `apps/gui/src/main/kanmerGit.ts` (CORE-123 lane).
- GUI surfaces.

## Context files an implementer must read

| File | What it tells you |
| --- | --- |
| `packages/mcp-server/src/execution-packet.ts` lines 195–240, 300–340 | The existing `--git-common-dir` + `physicalExistingPath` identity comparison and 8.3-alias rationale you must reuse rather than reimplement. |
| `packages/core/src/types.ts` (CORE-121 block, `claimState`, `DEFAULT_CLAIM_EXPIRY_MINUTES`) | Exact claim-expiry derivation; mirror `execution-packet.ts`'s `ExecutionPacketClaim` construction. |
| `packages/mcp-server/src/git-reachability.mjs` | Timeout/maxBuffer convention (15 s, 32 KiB) and fixed-argv pattern. |
| CORE-113 `scratch/review.md` (F-015/F-016) and `research/replan-review-findings.md` | Why apply is dropped and which classifier ordering was flagged (GH-3867261023). |
| HZN-008 `context.md` "Shared decisions" | No mutating reconciliation before CORE-114/115; expired claim = 30 min default. |
| `packages/mcp-server/src/smoke.mjs` around line 2240 (post-#286 shape) | Where the `reconcile_ticket` smoke block slots in; do not re-add `apply_reconciliation` assertions. |
| `AGENTS.md` §6 and §10 | Build/test/verify commands and the done checklist. |

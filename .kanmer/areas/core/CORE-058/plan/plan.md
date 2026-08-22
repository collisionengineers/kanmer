# Plan — CORE-058 reconcile board cache ignore and plugin artifact provenance

## Governing docs

- FRD-027 project-declared sources: the `sources` cache is derived local state and must not become board Git state; this ticket preserves the declared-source contract and adds no authority.
- ADR-0020 project-declared source trust: source/cache boundaries remain fail-closed and provider-neutral; this ticket changes only Git hygiene and generated artifact provenance.
- CORE-044 PR #165 cumulative report/review: acceptance is limited to the board-worktree `.kanmer/data/sources/` ignore gap and normal-checkout plugin-bundle reproducibility gap.

## Approach

Reuse `ensureIgnore` and the existing real-Git fixture in `apps/gui/src/main/kanmerGit.ts`. Define one canonical board-worktree ignore list containing the existing activity/temp rules plus `.kanmer/data/sources/`, and reconcile it on every successful board-worktree discovery path: newly created orphan, already-attached expected branch, and existing path repaired from a branch mismatch. This is idempotent and keeps `syncBoard` unchanged.

Regenerate `plugins/kanmer/mcp/kanmer-mcp.cjs` from a normal non-linked checkout of this exact cumulative source branch. The linked ticket worktree will not bypass `plugin:check`; its guard refusal is retained as evidence. A normal-checkout build plus `npm run plugin:check` proves the committed bytes match a fresh standalone build and the isolated plugin still launches.

## Ordered steps

1. Implement shared board-worktree ignore reconciliation without changing branch/rename/ref semantics.
2. Add deterministic real-Git regressions for new board worktrees and existing/mismatch board worktrees missing the sources rule; assert exact rule and idempotence.
3. Build the exact branch in a normal checkout and replace only the generated committed plugin artifact; record SHA-256 and parity/check exits.
4. Run focused GUI Git tests, typecheck/build, scripts/docs/diff rails, and normal-checkout plugin parity; preserve linked-worktree guard and live packaged evidence boundaries.
5. Write report/checklist/scratch, trace commit/PR, refresh gates, move Implementing→Review, and stop for independent review.

## Proof plan

- Real-Git fixture checks that creation and reconciliation write `.kanmer/data/sources/` once, preserve existing rules, and do not alter branch/ref/path state.
- Normal-checkout `npm run build` → `node scripts/build-plugin.mjs` → `npm run plugin:check` proves plugin artifact bytes and isolated runtime parity.
- Focused/full relevant rails record exact exits; no live installed-host claim is made.

## Risks and mitigations

- Existing tracked cache history is not rewritten; only future board sync is protected and history cleanup remains deferred.
- `plugin:check` is intentionally unavailable in a linked worktree; a normal-checkout proof is required and the refusal is preserved rather than bypassed.

## Scope guard

No source-fetch/DNS/cache transaction change, provider/UI feature, branch rename change, or manual/plugin prose change is included. The standalone bundle is generated output only.

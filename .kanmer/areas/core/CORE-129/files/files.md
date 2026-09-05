# Files — CORE-129

> **Version 2 (2026-09-05).** Base: `main` at `37b83b1435602dddeaea3da32668b4846d1be963`,
> branch `CORE-129-typed-proof-record`. `origin/main` (carrying MCP-057, PR #325) is merged
> into the branch before the PR opens. A path outside this list requires a versioned
> files/plan correction before editing.

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `packages/core/src/proof-record.ts` | `proof-record/2` parser: typed attempts, authority binding, `receipts[]` via `parseProofReceipts`, legacy/invalid diagnostics |
| Add | `packages/core/src/proof-record.test.ts` | Table-driven valid / contradictory / malformed / chronology / authority / receipts / legacy matrix |
| Modify | `packages/core/src/index.ts` | Export the single proof-record contract |
| Modify | `packages/core/src/types.ts` | `ProofValidationSchema` + optional `proofValidation` on `BoardConfig` |
| Modify | `packages/core/src/board.ts` | `defaultBoardConfig()` writes strict; `resolveProofValidation` resolves absent ⇒ report/`default` |
| Modify | `packages/core/src/board.test.ts` | Policy default, resolution and source coverage |
| Modify | `packages/core/src/gates.ts` | `EvidenceProbe.proofState`; `statusOf` enforces strict and reports in report mode |
| Modify | `packages/core/src/gates.test.ts` | report vs strict gate behaviour, warnings, reachability |
| Modify | `packages/core/src/profile-matrix.test.ts` | Preserve the profile/gate matrix under the fresh-board strict default |
| Modify | `packages/core/src/store.ts` | Read canonical proof bytes once for the gate; `activateStrictProofValidation` under the board lock; refuse generic-writer escalation |
| Modify | `packages/core/src/store.test.ts` | Strict transitions, canonical proof path, report-mode compatibility, escalation refusal |
| Modify | `packages/core/src/docs.test.ts` | Done transition under report/strict; visual advisory unchanged |
| Modify | `packages/core/src/capture.test.ts` | Fixture proof updated where a fresh strict board now gates Done |
| Modify | `packages/core/src/claims.test.ts` | Fixture proof updated; lease/claim semantics unchanged |
| Modify | `packages/core/src/delivery.test.ts` | Fixture proof updated; delivery-policy semantics unchanged |
| Modify | `packages/core/src/release.test.ts` | Fixture proof updated; release-attempt semantics unchanged |
| Modify | `packages/core/src/project.test.ts` | Fixture proof updated where Done is crossed |
| Modify | `packages/core/src/migrate.ts` | Read-only proof census + digest in dry run; digest-bound policy cutover; no proof/ticket rewrites |
| Modify | `packages/core/src/migrate.test.ts` | Census accuracy, byte preservation, dry-run purity, digest binding, idempotency |
| Modify | `packages/core/src/reconciliation.ts` | Consume the validated proof state where the evidence shape needs it (MCP-057 findings preserved) |
| Modify | `packages/core/src/reconciliation.test.ts` | Valid PASS/FAIL/INCONCLUSIVE, legacy, invalid and waived routing |
| Modify | `packages/mcp-server/src/reconciliation.ts` | Replace the independent decoder with the core parser; keep `receipts` surfacing |
| Modify | `packages/mcp-server/src/reconciliation.test.mjs` | Parser integration, exact-SHA routing, read-only evidence |
| Modify | `packages/mcp-server/src/index.ts` | `get_status.proofValidation`; `migrate_board` census/cutover input + description; no new tool |
| Modify | `packages/mcp-server/src/smoke.mjs` | report/strict proof cases end to end |
| Modify | `packages/mcp-server/src/golden-board.mjs` | Proof-reading scenarios updated for the typed record |
| Modify | `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Schema 2 whole-file record, typed attempt per rerun, `authority` |
| Modify | `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | Require the validated current proof state before success closeout |
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Controller never advances legacy/invalid evidence under strict |
| Modify | `plugins/kanmer/skills/kanmer-setup/SKILL.md` | report → dry-run digest → strict cutover as a deliberate step |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Proof schema, gate diagnostics, migration census contract |
| Modify | `AGENTS.md` | §4/§5 proof lines: typed record authority and the strict cutover |
| Modify | `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md` | Amendment authorising the bounded strict proof reader |
| Modify | `docs/functional/frd/FRD-002-requirement-profiles.md` | Existence-only proof authority → report/strict semantics |
| Modify | `docs/functional/frd/FRD-006-typed-proof.md` | `proof-record/2` authority, compatibility reporting, strict Done |
| Modify | `docs/manual/proof.md` | User-visible typed proof and report/strict behaviour |
| Modify | `docs/manual/gates.md` | Report warnings versus strict proof gating |
| Regenerate | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Generated manual mirror (`npm run build:manual`) |
| Modify | `scripts/verify-skill-prose.mjs` | Pin the new proof-authority prose |
| Regenerate | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Shipped standalone MCP bundle (`npm run plugin:build`) |

## Explicitly outside this ticket

- Rewriting, reopening or reclassifying any historical proof or ticket.
- The live board's strict cutover decision (CORE-141, at the 0.4.2 cut).
- Re-implementing receipt assessment (MCP-057 owns `assessReceipt`).
- `scripts/verify.mjs`, `scripts/agents-block-body.mjs`, `.github/workflows/pr.yml`.
- `apps/gui/**` beyond the regenerated manual chapter mirror, unless changed
  `get_doc_gates` output forces a minimal typecheck fix (called out in the report).
- Review attestation, release attempt, provider, workflow-stage or dependency changes.

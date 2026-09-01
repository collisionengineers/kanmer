# Files — CORE-129

The implementation starts only after CORE-127 and CORE-133 merge, then rebases onto their exact merge SHA. A path outside this list requires a versioned files/plan correction before editing.

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `packages/core/src/proof-record.ts` | Versioned strict proof parser, typed attempts, authoritative-verdict consistency and legacy/report diagnostics |
| Add | `packages/core/src/proof-record.test.ts` | Valid, contradictory, malformed, chronology, authority and historical-compatibility matrix |
| Modify | `packages/core/src/index.ts` | Export the single proof-record contract |
| Modify | `packages/core/src/types.ts` | Optional board proof-validation policy and any shared typed reconciliation proof states |
| Modify | `packages/core/src/board.ts` | Resolve absent legacy policy to report and fresh-board policy to strict |
| Modify | `packages/core/src/board.test.ts` | Policy defaults/read/write compatibility |
| Modify | `packages/core/src/gates.ts` | Consume one typed proof probe and surface blocking/report diagnostics |
| Modify | `packages/core/src/gates.test.ts` | Report-versus-strict gate behavior and warning/reachability cases |
| Modify | `packages/core/src/profile-matrix.test.ts` | Preserve the full profile/gate matrix under fresh-board strict defaults |
| Modify | `packages/core/src/store.ts` | Read canonical proof bytes once for the central gate; no proof mutation |
| Modify | `packages/core/src/store.test.ts` | Strict transition behavior, canonical proof path, and report-mode compatibility |
| Modify | `packages/core/src/docs.test.ts` | Done transition rejects non-current/non-PASS proof only after strict cutover |
| Modify | `packages/core/src/claims.test.ts` | Upgrade affected proof fixtures without changing lease/claim semantics |
| Modify | `packages/core/src/delivery.test.ts` | Upgrade affected proof fixtures without changing delivery-policy semantics |
| Modify | `packages/core/src/release.test.ts` | Upgrade affected proof fixtures without changing release-attempt semantics |
| Modify | `packages/core/src/migrate.ts` | Read-only proof census/digest in dry run and digest-bound policy cutover without rewriting tickets/proofs |
| Modify | `packages/core/src/migrate.test.ts` | Census accuracy, byte preservation, dry-run purity and strict-policy activation |
| Modify | `packages/core/src/reconciliation.ts` | Consume validated proof state for Done/failure routing |
| Modify | `packages/core/src/reconciliation.test.ts` | Valid PASS/FAIL/INCONCLUSIVE and inconsistent-state routing |
| Modify | `packages/mcp-server/src/reconciliation.ts` | Replace the independent decoder with the shared parser |
| Modify | `packages/mcp-server/src/reconciliation.test.mjs` | Parser integration, exact-SHA routing and read-only evidence collection |
| Modify | `packages/mcp-server/src/index.ts` | Describe validated proof/census policy and expose resolved `get_status.proofValidation`; no new tool |
| Modify | `packages/mcp-server/src/smoke.mjs` | End-to-end report/strict contradictory-proof and valid-PASS cases |
| Modify | `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Current proof schema, authoritative attempt ledger and whole-file rerun rules |
| Modify | `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | Require the shared validated current proof state before success closeout |
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Controller reads validated result and never advances contradictory/legacy strict evidence |
| Modify | `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Existing format-migration consumer performs report → dry-run digest → strict cutover deliberately |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Proof schema, gate diagnostics and migration census contract |
| Modify | `AGENTS.md` | Canonical proof-attempt authority and strict-cutover contract |
| Modify | `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md` | Amend the governed movement-gate content-reader boundary for strict typed proof authority |
| Modify | `docs/functional/frd/FRD-002-requirement-profiles.md` | Replace existence-only proof authority with explicit report/strict profile semantics |
| Modify | `docs/functional/frd/FRD-006-typed-proof.md` | Define current typed proof authority, compatibility reporting and strict Done behavior |
| Modify | `docs/manual/proof.md` | User-visible typed proof and migration/report behavior |
| Modify | `docs/manual/gates.md` | Explain report warnings versus strict proof gating |
| Modify | `docs/manual/first-ticket.md` | Ensure first-ticket guidance creates a current valid proof on strict fresh boards |
| Regenerate | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Generated manual mirror |
| Modify | `scripts/verify-skill-prose.mjs` | Pin the new proof authority/cutover prose |
| Modify | `scripts/verify-skill-prose.test.mjs` | Prose regression coverage |
| Regenerate | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Shipped standalone MCP bundle |

## Explicitly outside this ticket

- Rewriting or reopening any historical proof/ticket.
- CORE-127 step-packet behavior or CORE-133 workspace recovery.
- Review-attestation, release-attempt, provider, GUI layout, workflow-stage or dependency changes.
- Natural-language parsing of old proof bodies.

# Research — CORE-113: rescue and reconciliation

## Question

What existing Kanmer contracts can support a dry-run-first, dependency-light reconciliation surface without allowing a recovery command to bypass the board worktree, required checks, or current-state concurrency protections?

## Findings

- FRD-028 is the governing contract. It requires a read-first evidence packet, explicit apply only for a still-current proposal, recognition of the named invalid states, and preservation of dirty work, required checks, release evidence and the board worktree. Source: `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` at merged `origin/main` (`ea8a6408`).
- `KanmerStore.updateItem` and `moveItem` already enforce `updated` optimistic concurrency, document gates and stage stamping. `takeTicket`/ `releaseTicket` protect the board worktree but model only a permanent claim today. Source: `packages/core/src/store.ts`.
- `packages/core/src/merge-gate.ts` is the relevant precedent: core evaluates typed, bounded evidence and does not spawn Git or call GitHub. `packages/mcp-server/src/check-pr.mjs` gathers Git/GitHub-adjacent evidence at the host boundary, then delegates policy evaluation to core.
- `packages/mcp-server/src/execution-packet.ts` shows the allowed host-side process pattern: fixed `git` argv, controlled cwd derived from the project, realpath validation and a fail-closed refusal. It must not be replaced by a request-controlled command/path runner.
- The MCP server's central write wrapper decorates mutating tools with the expected-project guard. Any explicit apply tool must keep `readOnlyHint: false` so wrong-project writes are refused centrally. Source: `packages/mcp-server/src/index.ts`.
- Existing review, verification and closeout skills describe correct terminal workflow, but no executable typed reconciler currently consolidates those facts. Existing GUI remote/provider reconcilers are unrelated subsystem configuration and are not a substitute for ticket/workflow rescue.
- No project-declared research source applies to this ticket. Source: `get_sources` on 2026-08-26 returned `declaredCount: 0`.

## Implications

- Implement a small typed reconciliation model in core that classifies a supplied evidence snapshot and returns a deterministic proposed action, evidence and safety refusal—not a second workflow engine.
- Keep live Git/GitHub/CI/worktree inspection in an MCP-side collector with a narrow injected execution seam for tests. Core must receive facts, not shell access.
- The first implementation must make dry-run side-effect-free and apply only a whitelisted action tied to the same ticket revision/action fingerprint. Dirty or unavailable evidence remains a report/refusal; it is never cleanup authority.
- Cover the FRD's currently representable recovery routes (merged Review, PASS proof Verifying, review without PR, Verifying without merged SHA, failed verification disposition, stale/expired claim and clean terminal leftovers). The later identity/lease and delivery tickets own richer revision, lease and release records; CORE-113 must not preempt their schemas.
- Adding an MCP tool changes the documented agent-facing command surface. Update its tool reference, the AGENTS tool list and generated plugin bundle in the same change; add source-level unit/smoke coverage so the new surface is reachable.

## Open questions

None. The FRD, existing merge-gate boundary and horizon context fix the implementation direction.

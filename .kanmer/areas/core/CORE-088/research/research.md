# CORE-088 research

## Scope and base

CORE-088 remediates fresh independent CORE-026 review findings F-006 through F-009 on cumulative head `453a92091d7a422a237996f024ab6940ea6fccfb`. The implementation remains stacked on `core-026-project-declared-sources` and changes only source/cache/DNS/orphan lifecycle behavior.

## Findings

- Cache loading accepts symlinked directories and empty/no-root representations; cached document origins and bounded reads are not validated.
- Stale fallback can discard a previous linked failure, forced refresh can lose its force semantics after an active rejection, and replacement validators from 304 responses are not persisted.
- The pinned DNS seam does not handle Node's `lookup(host, {all:true})` callback shape or explicitly control address-family selection.
- `resumeOrphanMigration` fingerprints the source and then deletes it in a separate unguarded operation; a concurrent source edit can be deleted.

## Safe approach

Reuse existing cache, lock, fetch and orphan helpers. Fail closed on malformed/symlinked/unbounded cache state; preserve prior diagnostics during stale fallback; persist effective validators; support both Node lookup callback shapes with fail-closed family handling; hold the existing lock and recheck a source fingerprint immediately before cleanup. Add deterministic regressions for every behavior. No provider, GUI, board, or external-network scope.

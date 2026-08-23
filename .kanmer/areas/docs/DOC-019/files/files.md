# Files

## In scope

- `docs/contributing/doc-structure.md` — generated mirror of the board's document model; refresh through the canonical `kanmer-docs` generation path, not by hand.
- `README.md` — correct the Windows source-versus-installed behavior and the current ticketed/protected release workflow.
- Any FRD prose identified by the audit as contradictory to the live format-3 model, only where the source and governing docs prove the contradiction.
- The existing documentation freshness verification rail (or a narrowly scoped new check) that can fail when the generated mirror or operator guidance drifts.

## Out of scope

- Product or workflow changes.
- Changes to the board model, release script, updater behavior, or skill implementation.
- Rewriting historical ticket claims; link them as evidence and preserve the audit record.

## Evidence map

- [[DOC-004]]: mirror still describes format 2, seven stages, `impact`, and `scratch-<slug>.md`.
- [[DOC-002]]: dated FRD statements may be stale and need a source-backed reconciliation.
- [[GUI-061]] / [[GUI-063]]: README contradicts the current AGENTS correction and release flow.
- `docs/functional/frd/FRD-014-doc-type-guidance.md` requires the canonical generator.
- `docs/functional/frd/FRD-021-auto-update.md` describes the current release verification contract.

## Acceptance evidence

- Generated mirror matches current `board.yml`/doc-type guidance and no manual-only edit is introduced.
- README instructions are accurate for source and installed Windows use and the current release preparation/publish process.
- Any FRD changes are source-backed and limited to stale statements found during the audit.
- Freshness tests/checks pass and fail on a deliberately stale fixture or equivalent deterministic assertion.

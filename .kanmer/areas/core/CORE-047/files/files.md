# Files — CORE-047

## Governing and implementation paths

- `packages/core/src/io.ts` — stale-lock ownership/reclaim implementation.
- `packages/core/src/io.test.ts` — inherited lock and atomic-write tests plus deterministic reversed-order regression.
- `packages/core/package.json` / workspace scripts — focused and full core rails.
- `docs/functional/frd/FRD-027-project-declared-sources.md`.
- `docs/architecture/adr/ADR-0020-project-declared-source-trust.md`.

## Out of scope

No MCP source-policy, GUI, editor, provider, release, or board-store changes. Preserve all inherited `renameWithRetry`, `writeFileAtomic`, and `TMP_FILE_RE` assertions unchanged.

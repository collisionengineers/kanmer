# Phase 2 — Core format 3 (keystone)

**Goal:** the storage/rules engine of v3 in `@kanmer/core`: fixed six stages, the profiles gate engine, folder-per-type documents (incl. `reference/`), typed proof with sources, priority removal, and the single format-3 migration. Freeze these signatures before Phases 3–6.

**Depends on:** Phase 0 (the FRDs it implements). **Feeds:** 3, 4, 5, 6.

## Items

### 2.1 Fixed stages — M (FRD-007 B1–B3) · [[CORE-002]]
- **Where:** `packages/core/src/types.ts` (BoardConfig loses `statuses`), `board.ts` (constants module: ids/names/order/colours; `defaultBoardConfig()`), `store.ts` validation paths.
- Stage constants exported; every status validation checks the constant set; the status kind leaves the column-tool surface (kept for `area` only). Legacy boards remain readable pre-migration (read-only compat, FRD-007 acceptance 6).

### 2.2 Profiles engine — L (FRD-002) · [[CORE-003]]
- **Where:** `types.ts` (board `profiles`, area `defaultProfile`; item `profile`, `requires`), `board.ts` (shipped defaults table; validation: known types, known boundaries), `store.ts` (gate resolver: resolution chain P6; multi-jump first-unmet; named-file requirements), a core `getDocGates(id)` returning requirements/satisfied/warnings — the single fn MCP+GUI+skills consume.

### 2.3 Folder documents — L (FRD-003/004) · [[CORE-004]]
- **Where:** `paths.ts` (type dirs incl. `reference/`; recursive resolution; top-level-unknown rejection), `store.ts` doc APIs → path-based (`setDoc(id, "research/azure/x.md")`), lazy mkdir, gate satisfaction = recursive ≥1 md excluding reference/scratch/assets, reference enumeration (names + abs paths for binaries) in item summaries.

### 2.4 Typed proof — M (FRD-006) · [[CORE-005]]
- Board `proofTypes` (+ shipped defaults) reusing deployment env ids for `@<env>`; requirement parser (`proof`, `proof:visual`, `proof:visual@staging`); soft-warning computation inside `getDocGates` (visual → image presence under proof/).

### 2.5 Priority removal — S (FRD-008) · [[CORE-006]]
- Schema/`KEY_ORDER` passthrough (the `due` precedent, same test shape), filter params dropped.

### 2.6 The migration — L (FRD-007 M1–M4, ADR-0008) · [[CORE-007]]
- **Where:** `migrate.ts` + `version.ts`.
- v→3: status alias table (case-insensitive), `needs-restage` fallback + report list, doc folder moves (`impact.md` → `files/impact.md` byte-preserved), priority strip + count, profile assignment (active→board default, done/archived→custom-empty) + report, board.yml rewrite (statuses/priorities out; profiles/kinds/proofTypes defaults in). Dry-run parity, idempotent, resumable, blockers surfaced — the v1→v2 behaviours carried forward. `migrate_board` core fn shared by MCP + GUI.

## Release rail
Core-only phase, but `smoke.mjs` assertions shift (first stage `backlog`; gate scenarios per profile) — updated here so Phase 3 lands green. Plugin bundle rebuild deferred to Phase 3 (tool signatures change there).

## Verification (vitest, enumerated)
- Stages: constants everywhere; unknown status rejected; legacy board readable, writes refused pending migration.
- Profiles: the four shipped profiles' gate matrices; custom named-file requirement; resolution chain P6; profile change re-gates instantly; spike Backlog→Done on research alone; chore one-jump to Implementing.
- Docs: nested round-trip; recursive gate count; reference/scratch/assets never satisfy; lazy folders (chore creation = 1 file); unknown top-level folder rejected.
- Proof: `@env` validated against declared envs; visual-without-images yields a warning not a block.
- Priority: passthrough + strip.
- Migration: a legacy-board fixture (4 custom stages, priorities, loose docs, label conventions untouched) migrates clean with zero needs-restage; a `triage` fixture restages with report; re-run no-op byte-identical; dry-run == real report; resume-after-partial.

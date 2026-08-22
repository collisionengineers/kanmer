# Files — CORE-026

## Where the change lands

| Path | Why |
|---|---|
| packages/core/src/types.ts | Add validated project source declaration/selector schemas and the optional BoardConfig.sources field so board YAML round-trips without stripping declarations. |
| packages/core/src/sources.ts | Pure selector matching, declaration validation, deterministic ordering, and available/unknown/unavailable resolution; no network or host authority. |
| packages/core/src/index.ts | Export the source contract for MCP and browser-safe consumers. |
| packages/core/src/board.test.ts and packages/core/src/sources.test.ts | Prove board round-trip, malformed/duplicate rejection, global/area/label applicability, ordering, and host availability semantics. |
| packages/mcp-server/src/sources.ts | Node-only bounded HTTPS llms.txt fetch/cache helper with same-origin depth-one/32-page/2 MiB/timeout/validator policy and injectable fetch for deterministic tests. |
| packages/mcp-server/src/index.ts | Add read-only get_sources and explicit set_sources/fetch_source surfaces; keep expected-project annotations, actor/write guard, and tool registration single-sourced. |
| packages/mcp-server/src/sources.test.ts and smoke/protocol checks | Prove bounded fetch/cache, removal/no stale effective preference, tool annotations, and the published MCP surface. |
| plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md | Document the new source tools so plugin synchronization remains exact. |
| plugins/kanmer/skills/kanmer-research/SKILL.md | Tell research to call get_sources first, consult available declared sources, and record provenance before general search. |
| plugins/kanmer/skills/kanmer-plan/SKILL.md | Tell planning to consume cited source context without re-invoking sources during implementation. |
| docs/functional/frd/FRD-026-project-declared-sources.md and docs/architecture/adr/ADR-0019-project-declared-source-trust.md | Governing feature contract and trust/fetch decision linked to the ticket. |

## Context files

| Path | What it tells the implementer |
|---|---|
| packages/core/src/types.ts, board.ts, store.ts | BoardConfig is the whole YAML contract; setBoard already preserves validated optional fields and must remain atomic. |
| packages/mcp-server/src/index.ts and tool reference | Read/write annotations and expected_project are enforced centrally; every new write must use the guard and every tool name must stay synchronized. |
| apps/gui/src/main/providers.ts, connect.ts | Host registrations are owned by providers; do not scan or rewrite unrelated MCPs or turn discovery into trust. |
| docs/functional/frd/FRD-005-deep-research.md, docs/functional/frd/FRD-013-setup-as-reconciliation.md, docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | Research needs source provenance, setup must reconcile without inventing/erasing declarations, and the MCP/config contract must not be duplicated in skill prose. |

## Ripple effects

- BoardConfig and core exports affect all board fixtures and the browser-safe build.
- MCP tools affect tool-reference synchronization, standalone bundle, protocol/smoke rails, and expected-project annotations.
- Skill wording affects packaged plugin synchronization but does not change runtime authority.
- The Node-only fetch/cache helper needs deterministic local fixtures and must never depend on a live documentation site.

## Out of scope

- GUI settings, automatic provider registration migration, external auto-trust, installation/authentication/enabling, OAuth, per-user source scopes, or arbitrary filesystem reads.
- Cross-origin or unbounded llms.txt crawling, implementation-time source calls, or changes to core gate/profile semantics.

# Files — CORE-026

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/types.ts` | Add the typed, validated `sources` board-config schema and exported source types; prevent unknown declaration data being stripped on a board write. |
| `packages/core/src/board.ts` | Ensure fresh boards receive the intended default and existing source declarations round-trip through YAML reads/writes. |
| `packages/core/src/store.ts` | Add any source-resolution/cache lifecycle APIs while preserving atomic board writes and source-root versus board-root semantics. |
| `packages/core/src/paths.ts` | Define an owned location for any persisted `llms.txt` cache/metadata below `.kanmer/data/`, rather than placing mutable cache in a source checkout or skill folder. |
| `packages/mcp-server/src/index.ts` | Expose declared/effective sources through a read-only MCP tool or deliberate `get_status` extension; preserve the tool annotations and update the tool surface consistently. |
| `apps/gui/src/main/providers.ts` | Supply read-only provider-registration discovery candidates, if the approved design includes provider-config discovery. |
| `apps/gui/src/main/connect.ts` | Keep setup/Connect reconciliation from overwriting source declarations; optionally integrate confirmed candidate discovery without granting new MCP access. |
| `apps/gui/src/shared/ipc.ts`, `apps/gui/src/preload/index.ts`, `apps/gui/src/main/index.ts` | Carry any GUI-facing sources management/discovery API across the typed IPC boundary. |
| `apps/gui/src/renderer/src/components/Settings.tsx` (and its focused tests/styles) | Provide a project-scoped declaration/review UI if source management is part of the GUI deliverable. |
| `plugins/kanmer/skills/kanmer-research/SKILL.md` | Consult declared sources before general search and cite the call/fetch in research findings. |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Consume the sourced research context when deciding the plan; do not re-invoke external sources during implementation. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Document any new MCP source tool; `plugin:check` enforces this reference stays in sync with registered tool names. |
| `packages/core/src/*.test.ts`, `packages/mcp-server/src/smoke.mjs`, GUI/provider tests, and skill-sync tests | Cover schema validation/round-trip, no-stale-preference removal, discovery confirmation, bounded `llms.txt` fetching/cache behaviour, and the published MCP/skill surface. |
| `docs/functional/frd/` and `docs/architecture/adr/` | New governing capability specification and decisions required by the ticket's existing `docs_todo` marker. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | The server/tool contract is authoritative; skills derive behaviour and must not become the source-preference rulebook. |
| `docs/functional/frd/FRD-005-deep-research.md` | Research is source-agnostic today, must remain read-only, and every finding must carry a source; it already names vendor MCPs, web, live estate, and references. |
| `docs/functional/frd/FRD-009-interrogative-workflow.md` | Product-owned uncertainty must surface now and unticked questions gate further work. |
| `docs/functional/frd/FRD-013-setup-as-reconciliation.md` | Setup is idempotent reconciliation; it must not silently invent trusted external sources or erase declared ones. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Skills are a roster of task choreography; tool-surface changes require reference, build, sync, smoke, and typecheck updates. |
| `packages/core/src/board.ts` and `packages/core/src/store.ts` | Board configuration is parsed/written as a whole and source data must survive every existing board mutation. |
| `apps/gui/src/main/providers.ts` and `apps/gui/src/main/connect.ts` | Provider config is host-specific registration state; current code is intentionally surgical about Kanmer's own entries, so scanning it must never rewrite or auto-trust unrelated MCPs. |
| `plugins/kanmer/skills/kanmer-research/SKILL.md` and `kanmer-plan/SKILL.md` | These are the only consumption points requested by the ticket; execution must not turn source use into per-edit ceremony. |

## Ripple effects

- A `BoardConfig` addition changes core exports and every TypeScript fixture that constructs/configures boards.
- An MCP tool change affects `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, the committed plugin bundle, `plugin:check`, smoke tests, and release artefacts.
- A GUI configuration workflow crosses main/preload/shared/renderer and needs manual/documentation coverage.
- Network retrieval needs deterministic test fixtures; tests must not depend on external `llms.txt` sites or real provider configurations.
- The governing FRD/ADR must settle trust and bounded-crawl policy before implementation claims to meet the ticket's verification list.

## Out of scope

- Automatically installing, enabling, authenticating to, or changing any third-party MCP/plugin.
- Replacing a provider's native MCP configuration with Kanmer-managed configuration.
- Consulting sources during code implementation rather than research/planning.
- Unbounded website crawling, arbitrary filesystem reads, or treating `llms.txt` as access permission.

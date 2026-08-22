# Plan — CORE-026: Sources: let a project declare which MCPs, plugins and llms.txt to prefer

## Objective

Deliver one project-scoped, reviewable source-preference contract shared by core, MCP, and the research/planning skills. Declarations rank already-available sources; they never grant authority, install anything, or trigger an unbounded crawl.

## Starting state

The ticket is Preparing with research/files and all three product questions resolved. BoardConfig currently strips unknown source fields. There is no source resolver, MCP source tool, or llms.txt cache. Existing provider/connect code owns host registrations and must remain untouched except as read-only context.

## Governing docs

- docs/functional/frd/FRD-026-project-declared-sources.md — meet the declaration, resolution, provenance, bounded llms.txt, removal, and verification criteria through the core schema, MCP tools, fetch helper, and skill instructions.
- docs/architecture/adr/ADR-0019-project-declared-source-trust.md — meet the preference-not-authority decision, connected/installed availability boundary, explicit confirmation, and bounded same-origin fetch policy.
- docs/functional/frd/FRD-005-deep-research.md — preserve read-only research and source citation by making get_sources/fetch_source explicit inputs to research rather than implementation-time ceremony.
- docs/functional/frd/FRD-013-setup-as-reconciliation.md and docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md — preserve board declaration bytes through existing reconciliation and keep runtime/tool rules out of duplicated skill prose.

## Required changes

1. Add validated SourceDeclaration and selector schemas to core BoardConfig, with bounded lengths, kind-specific HTTPS validation for llms-txt, duplicate rejection, and optional ordered priority.
2. Add a browser-safe pure core resolver that applies area/label selectors, preserves declaration order/priority, and classifies MCP/plugin availability from explicitly supplied host observations; no network, filesystem, or auto-trust.
3. Add get_sources as a read-only MCP orientation tool and set_sources as an explicit guarded board-config write. Add fetch_source as a guarded cache-writing operation restricted to an applicable declared llms-txt entry.
4. Implement a Node-only bounded llms.txt fetch/cache helper: HTTPS and same-origin redirects, depth one, 32 direct pages, 2 MiB aggregate bytes, 10-second request bounds, content checks, 24-hour validator-aware cache metadata, deterministic errors, and no cross-origin/unbounded traversal.
5. Update the tool reference and kanmer-research/kanmer-plan skill instructions so research calls get_sources first, consults available declared entries/fetch_source where relevant, cites what it used, and planning consumes that cited context without invoking sources during implementation.
6. Add deterministic core/MCP tests plus protocol/smoke/plugin-sync coverage for schema round-trip, selector/removal/availability semantics, bounded fetch/cache, tool annotations, and no auto-trust.

## Expected files

packages/core/src/types.ts, packages/core/src/sources.ts, packages/core/src/index.ts, packages/core/src/board.test.ts, packages/core/src/sources.test.ts, packages/mcp-server/src/sources.ts, packages/mcp-server/src/sources.test.ts, packages/mcp-server/src/index.ts, packages/mcp-server/src/smoke.mjs or smoke-protocol.mjs, plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md, plugins/kanmer/skills/kanmer-research/SKILL.md, plugins/kanmer/skills/kanmer-plan/SKILL.md, and the linked FRD/ADR.

## Do not modify

apps/gui/src/main/providers.ts, apps/gui/src/main/connect.ts, unrelated provider registrations, core gate/profile semantics, remote transport policy, arbitrary source installation/authentication, or any unrelated ticket/worktree/board file.

## Verification

- Focused core source/schema tests and MCP source/fetch tests pass with exact exit codes.
- Core build/browser check, MCP typecheck/build, MCP protocol/smoke, tool-reference/plugin synchronization, and diff hygiene pass.
- Tests prove invalid/cross-origin/oversized/timeout/duplicate entries are rejected or unavailable, removal excludes stale cache, and no unavailable MCP/plugin is auto-enabled.
- Full relevant workspace rails are attempted after focused rails; first failures are retained as FAIL or INCONCLUSIVE and never hidden by a later rerun.
- Post-merge verification should rerun the deterministic rails on merged main and inspect a temporary board for source round-trip/removal; live connected-provider and external llms.txt evidence remains INCONCLUSIVE unless explicitly available.

## Risks / decisions

- Host availability is caller evidence, not inferred from provider files; unknown is reported rather than trusted.
- Cache writes are limited to declared llms-txt URLs and bounded metadata/content under the project data directory; fetch_source is a guarded write operation because it changes derived cache state.
- GUI source editing and automatic candidate discovery remain out of scope; set_sources is the explicit declaration surface and future UI work can consume the same core contract.

## Stop condition

Stop at Review with the PR open, report/checklist/scratch complete, hosted checks recorded, and no self-review, merge, verification, cleanup, or next-ticket dispatch.

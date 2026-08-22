# Research — CORE-026: project-declared research sources

## Question

How can Kanmer let a project declare trusted MCPs, plugins, and `llms.txt` references that research and planning consult first, without turning skills into a second contract or letting a declaration silently broaden an agent's authority?

## Findings

- `packages/core/src/types.ts` defines `BoardConfigSchema`; it currently permits areas, profiles, group kinds, proof types, governing-doc globs, and deployment, but has no `sources` property. Zod objects strip unknown keys on parse, so a hand-added `sources:` block would be lost on the next board write unless the schema and public type are extended.
- `packages/core/src/board.ts` parses and atomically serialises the entire board config, and every ordinary area/profile mutation reaches that writer via `KanmerStore.setBoard` in `packages/core/src/store.ts`. Schema support is therefore required for sources to survive normal board edits and setup reconciliation.
- `packages/mcp-server/src/index.ts` exposes resolved board configuration through `list_board` and status through `get_status`, but provides no source-resolution/discovery tool. ADR-0009 explicitly says a configuration/tool surface—not repeated skill prose—must carry behavioural rules; a dedicated read-only source-resolution call is the cleanest contract.
- `apps/gui/src/main/providers.ts` and `connect.ts` know how Kanmer itself is registered with each supported host and reconcile the Kanmer skill roster. They do not model, enumerate, or grant trust to the host's other MCP entries. A candidate-discovery feature must be read-only and confirmation-gated; it must not treat a provider config as an automatic trust list.
- `plugins/kanmer/skills/kanmer-research/SKILL.md` is presently source-agnostic, while `kanmer-plan/SKILL.md` consumes only ticket research/files. FRD-005 already requires research to use relevant source classes and cite every finding; CORE-026 should add a source-preference lookup to research and planning, not copy configuration semantics into their prose.
- The `llms.txt` proposal describes a root-level Markdown orientation document that links to more detailed material; it is a community proposal rather than a permission protocol. Source: https://llmstxt.org/ and https://github.com/AnswerDotAI/llms-txt. It cannot be treated as authorisation to crawl an arbitrary site.
- A safe `llms.txt` implementation needs explicit bounded fetch policy: HTTPS-only initial URL, redirect/origin checks, a finite page/depth/byte budget, timeouts, content-type/size checks, and cached metadata such as URL, fetch time, ETag/Last-Modified, content hash, and expiry. No such cache or HTTP-fetch abstraction exists in core today.

## Implications

- Add a validated, serialised source declaration to `BoardConfig`, preserving it in every read/write path and exposing only the project-confirmed declarations to agents.
- Keep the contract in core plus an MCP read surface. Skills should ask that surface before open-web fallback and record which declared source they consulted in their research findings, satisfying FRD-005's citation rule.
- Separate declaration from discovery: discovery may offer candidates extracted from the connected-provider configuration, but only a confirmed declaration becomes preferred.
- Treat `llms.txt` as a constrained document fetch, not a crawler. The plan must specify cache location/lifecycle and deterministic limits, then test removal/revalidation so stale preferences cannot remain active.
- This is a new capability with no governing FRD/ADR. The existing `docs_todo: true` is correct; planning must first create/link the governing document(s) through `kanmer-docs`.

## Open questions

See `open-questions`; the unresolved trust, applicability, and crawl-budget decisions are product choices rather than implementation gaps.

## 2026-08-22 governing-doc reconciliation

- Created and linked docs/functional/frd/FRD-026-project-declared-sources.md and docs/architecture/adr/ADR-0019-project-declared-source-trust.md. The ticket's docs_todo debt is cleared through the board update; the docs remain draft/proposed until implementation review.
- Resolved packet questions with product-safe defaults: area/label selectors only, declarations prefer only already-connected/installed sources, and HTTPS same-origin llms.txt retrieval is depth-one/32 pages/2 MiB/10 seconds with 24-hour validator-aware cache.
- HZN-006 has no context.md document (get_group_doc returned content null); its group body is a short horizon summary. HZN-007/context.md is the binding workflow context and prohibits auto-trust, scope absorption, fabricated evidence, and self-merge.
- Current code confirms BoardConfigSchema strips unknown sources fields until extended; board.ts/store.ts are the round-trip boundary, and mcp-server/index.ts is the canonical read-tool registration point. Existing provider/connect code owns Kanmer registrations and must not auto-trust unrelated entries.

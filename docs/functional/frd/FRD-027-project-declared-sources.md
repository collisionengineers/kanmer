---
status: draft
covers: project-declared research sources
---

# FRD-027 — Project-declared research sources

*This document specifies what the sources feature does. The trust and fetch
boundaries are recorded separately in ADR-0020.*

**Implements:** PRD-001.

## Purpose and scope

Kanmer lets a project declare which already-available MCP servers, installed
plugins, and documentation manifests should be preferred while researching and
planning work. A declaration is a project preference and provenance hint. It is
never permission to install, authenticate to, enable, or invoke an unavailable
external capability.

Source preferences live with the project board configuration, survive normal
board/setup reconciliation, and are consumed at research/planning boundaries.
They do not become a per-edit ceremony and do not alter implementation work.

## Behaviour

1. A project may declare an ordered list of source entries with a kind
   (`mcp`, `plugin`, or `llms-txt`), an identifier or HTTPS URL, and an optional
   `appliesTo` selector containing area ids and labels. An empty selector is
   global. Unknown fields and malformed entries are rejected rather than
   silently becoming trusted sources.
2. A read-only source-resolution surface returns the applicable declarations,
   their availability, and the safe action for the current research/planning
   context. It reads project configuration; it does not mutate the board or
   host registrations.
3. MCP entries are preferred only when the named server/tool namespace is
   already connected to the current host. Plugin entries are preferred only
   when the named plugin is already installed and exposes the declared source.
   An unavailable declaration is reported and skipped before general search;
   it is never auto-installed, auto-enabled, or used to widen authority.
4. Research records which declared source was consulted and uses it before
   general web search when it is applicable and available. Planning consumes
   the resulting cited research context and does not re-invoke sources while
   implementation code is being written.
5. An `llms.txt` entry is fetched only over HTTPS with same-origin redirects,
   a finite depth-one link budget of at most 32 direct pages, a 2 MiB total
   response budget, bounded request timeouts, and content-size/type checks.
   Fetched text and URL/validator/hash/timestamp metadata may be cached below
   `.kanmer/data/`; credentials and arbitrary page contents are not persisted.
6. Cache revalidation uses a bounded retention window and HTTP validators when
   available. A `304 Not Modified` without a cached representation is surfaced
   as a failure, and concurrent writes for one URL are serialized so cache JSON
   cannot be partially replaced. Removing or changing a declaration immediately
   removes it from resolution; old cache files are not treated as an active
   preference.
7. Setup and GUI configuration preserve declared entries, present discovered
   candidates only for explicit user confirmation, and never rewrite unrelated
   provider registrations.

## Acceptance criteria

1. A valid project source declaration round-trips through board configuration,
   is validated with its kind/identifier/selector, and remains intact after
   ordinary board writes and setup reconciliation.
2. Source resolution is read-only, project-scoped, selector-aware, ordered by
   declaration, and reports unavailable entries without consulting or enabling
   them.
3. Research and planning can record an applicable available declared source
   before general search, with a citation/provenance entry; implementation
   execution does not re-invoke the source preference surface.
4. MCP and plugin declarations never install, authenticate, enable, or grant
   access to an unavailable external capability, and discovery requires
   explicit confirmation before a declaration is written.
5. `llms.txt` retrieval enforces HTTPS, same-origin redirects, depth/page/byte/
   timeout limits, deterministic test fixtures, validator-aware cache metadata,
   and no unbounded crawl.
6. Removing a declaration makes it unavailable to resolution immediately and
   leaves no stale preference in the effective source list.
7. The MCP/skill/GUI surfaces document the source contract, preserve read-only
   annotations, expose redacted diagnostics, and pass their focused tests,
   typechecks, build/smoke, manual, and plugin-synchronization rails.

## Edge cases

- Invalid kind, empty identifier, unsupported URL scheme, cross-origin redirect,
  oversized response, timeout, malformed manifest, or duplicate declaration is
  rejected or reported unavailable without partial activation.
- A selector matching no current area/label resolves to no source; a global
  declaration remains applicable when the ticket has no area or labels.
- Two applicable entries with equal priority retain declaration order; a
  failing preferred source is recorded and the next available source/general
  search may be used.
- A removed declaration may leave bounded cache bytes for revalidation cleanup,
  but those bytes must never appear in effective resolution or provenance.

## Non-goals

- Automatic trust, installation, authentication, provider registration, or
  arbitrary filesystem/network access.
- A general web crawler, cross-origin `llms.txt` traversal, or permission
  semantics encoded in a skill document.
- Source use during code implementation, per-keystroke lookups, or a second
  rules engine outside the core/MCP contract.

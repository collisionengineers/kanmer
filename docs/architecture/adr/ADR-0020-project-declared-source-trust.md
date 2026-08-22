---
status: proposed
---

# ADR-0020 — Project-declared sources are preferences, not authority

- **Status:** proposed
- **Date:** 2026-08-22

## Context

Projects need a durable way to tell research and planning which MCP servers,
installed plugins, and documentation manifests are most relevant. The
preference is project-specific, while the connections and credentials belong to
the host. Treating a board declaration as permission would let a checked-in
file silently expand an agent's authority. Treating `llms.txt` as a permission
or crawl instruction would also make an apparently harmless URL an unbounded
network operation.

The existing board configuration is the project-owned source of truth, ADR-0009
requires behavioural contracts to live in a tool/config surface rather than
duplicated skill prose, and FRD-013 requires setup to reconcile without
inventing or erasing user-owned declarations.

## Decision

Store source declarations in the project board configuration as validated,
ordered preferences with explicit kind, identifier/URL, and optional area/label
selectors. Resolve them through a read-only core/MCP surface at research and
planning time.

The resolver may prefer an MCP entry only when the named server/tool namespace
is already connected to the current host, and may prefer a plugin entry only when
the named plugin is already installed. Declarations never install, authenticate,
enable, or grant access. Provider-registration discovery is read-only candidate
generation and requires explicit confirmation before a declaration is persisted.

Treat `llms.txt` as bounded documentation retrieval, not authority or a crawler:
HTTPS-only origin, same-origin redirects, depth one, at most 32 direct linked
pages, a 2 MiB total response budget, bounded timeouts, and validator/hash/timestamp
metadata under the project's `.kanmer/data/` cache. Removed declarations are
excluded immediately even if bounded cache bytes remain.

Research records the source actually consulted and planning consumes that cited
context. Implementation does not repeatedly invoke the resolver. Skills remain
choreography and do not restate this contract.

## Consequences

- Project preferences are reviewable and portable in board configuration, while
  host credentials and availability remain outside the project trust boundary.
- A source may be declared before it is available; resolution reports that
  state instead of failing setup or silently reaching for it.
- Bounded retrieval is deterministic and testable, but it cannot mirror an
  entire documentation site or follow cross-origin links in the first release.
- The board schema, core resolver, MCP read surface, research/planning skills,
  GUI/setup reconciliation, tool reference, smoke tests, and plugin artefact
  all move together as one contract.
- Users must explicitly confirm any discovered source candidate. No automatic
  provider configuration migration is implied.

## Alternatives considered

1. **Treat declarations as permission to install or invoke sources.** Rejected:
   a project file is not an authority grant and may be received from an
   untrusted checkout.
2. **Put the preference rules in each skill.** Rejected by ADR-0009 and prone
   to drift between agents and tool surfaces.
3. **Auto-trust every MCP in a provider registration.** Rejected: provider
   registration is host-owned state and may contain unrelated capabilities.
4. **Crawl every link in `llms.txt`.** Rejected: the manifest is orientation
   content, not permission for unbounded network work; finite same-origin depth
   and byte/page/time limits are required.
5. **Keep source declarations only in GUI settings.** Rejected: agents and
   headless MCP clients must see the same project-scoped preference, and the
   board is the shared source of truth.

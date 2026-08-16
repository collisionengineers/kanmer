---
status: draft
---

# ADR-0007 — codex is registered via a project-scoped config file

## Context

Kanmer registered codex with `codex mcp add kanmer-<project>`, which writes only the global `~/.codex/config.toml` — one accumulating global entry per project. codex supports project-scoped `.codex/config.toml` (trusted projects only). Kanmer already has config-file providers (opencode, antigravity).

## Decision

codex becomes a config-file provider writing `<project>/.codex/config.toml` (`[mcp_servers.kanmer]` — plainly named; scope disambiguates). Connect surfaces the 'project must be trusted' caveat and, on reconnect, runs `codex mcp remove kanmer-<project>` to drain the legacy global entry. TOML merge/unmerge preserves unknown keys, mirroring the JSON providers.

## Alternatives considered

(a) Keep global adds + a cleanup tool — treats the symptom. (b) Wait for `codex mcp add --scoped` — an open upstream issue, not shipped.

## Consequences

One entry per project; a small TOML dependency enters the GUI main process; untrusted projects need one extra user step, stated plainly.

**Amended (GUI-079).** This decision originally recorded that "the global pile drains as projects reconnect". That is true only of projects that are *actually* reconnected: the cleanup runs `codex mcp remove kanmer-<this project>`, so reconnecting project A drains A's entry and leaves every other project's global entry loading in every codex session on the machine, forever, with nothing telling the user which projects still owe one. A live instance was found — `[mcp_servers.kanmer-pegasus]`, rooted at an unrelated repo, in every session started anywhere.

What actually drains the pile is the **legacy sweep** in the GUI's Connect panel: it lists every global `mcp_servers.kanmer-*`, classifies each against the project it names, and removes the ones whose project has a project-scoped registration codex will load — after one confirmation, a no-op on the second run (ADR-0010). Two constraints it carries are part of this decision:

- **An entry whose project has no project-scoped replacement is reported and never removed.** For a project that has not reconnected, the global entry is its only working registration; removing it would silently cut board access to a project the user is not looking at. The user is told to open that project and Connect first. Kanmer never writes another project's config to fix this for them.
- **The global config is parsed for listing only, never rewritten.** Round-tripping the real file through the TOML library was measured to change it (a float field collapsing to an integer, 65 literal-quoted trust headers rewritten, comments dropped). Removal is delegated to `codex mcp remove`, verified surgical against a fixture.

Per-project cleanup on reconnect stays as it is — it is still the right thing at that moment, it is just not a machine-wide drain.

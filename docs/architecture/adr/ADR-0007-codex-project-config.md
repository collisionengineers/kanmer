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

One entry per project; the global pile drains as projects reconnect; a small TOML dependency enters the GUI main process; untrusted projects need one extra user step, stated plainly.

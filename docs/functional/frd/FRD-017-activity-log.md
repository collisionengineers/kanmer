---
status: draft
covers: shipped activity system (backfill)
---

# FRD-017 — Activity log

- R1. `.kanmer/data/activity.jsonl` is an **append-only, derived** change log (safe to delete; never the source of truth). Rotation keeps it bounded.
- R2. Every mutation appends who (actor attribution from MCP `_meta` client identity, or the GUI), what, when; `get_activity` exposes it with filters.
- R3. Consumers: the GUI Activity panel (click → focus item), kanmer-report (standup "now" / retro "since"), toast batching context, and the format-3 migration report trail.
- R4. On the Git board branch, activity.jsonl is ignored (append-only files rebase badly; it's derived anyway — FRD-020).

**Acceptance (as-built):** a create/move/edit sequence appears in order with actors; deleting the file harms nothing; report output matches the log.

Related: FRD-018/020/022/023.

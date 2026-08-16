---
status: approved
covers: shipped activity system (backfill)
---

# FRD-017 — Activity log

- R1. `.kanmer/data/activity.jsonl` is an **append-only, derived** change log (safe to delete; never the source of truth). Rotation keeps it bounded.
- R2. Every mutation appends who (actor attribution from MCP `_meta` client identity, or the GUI), what, when; `get_activity` exposes it with filters.
- R3. Consumers: the GUI Activity panel (click → focus item), kanmer-report (standup "now" / retro "since"), toast batching context, and the format-3 migration report trail.
- R4. On the Git board branch, activity.jsonl is ignored (append-only files rebase badly; it's derived anyway — FRD-020).

**Acceptance (as-built):** a create/move/edit sequence appears in order with actors; deleting the file harms nothing; report output matches the log.

Related: FRD-018/020/022/023.

## Verified against code — Phase 0.2

- R1 — path `.kanmer/data/activity.jsonl` `core/activity.ts:27-29`; the "derived, never consulted
  for state" contract is stated at `core/activity.ts:6-10` and holds (no read path outside
  `readActivity`); `appendActivity` swallows its own errors so logging can never fail a mutation
  `core/activity.ts:36-56`; rotation drops the oldest half past `MAX_LINES = 5000`, size-gated by
  `SIZE_CHECK_BYTES` `core/activity.ts:22-25,45-52`.
- R2 — `ActivityEntry` carries `{ts, id, op, field, from, to, actor}` `core/activity.ts:11-20`;
  one line per changed field on update `core/store.ts:640-655`; emit sites cover create, update,
  take, release, doc, scratch and delete (`core/store.ts:575,640-655,803-825,918-920,1099-1101,966`);
  actor set per call from MCP client identity `mcp-server/src/index.ts:62,80-88`, defaulting to
  `"gui"` `core/store.ts:92`; `get_activity` filters by id/since/limit
  `mcp-server/src/index.ts:394-410`.
- R3 — GUI Activity panel `apps/gui/src/renderer/src/components/ActivityPanel.tsx`; kanmer-report
  reads the log `plugins/kanmer/skills/kanmer-report/SKILL.md:33,39`; toast batching
  `apps/gui/src/main/index.ts:348-402`.
- R4 — ignored on the board branch `apps/gui/src/main/kanmerGit.ts:68`.

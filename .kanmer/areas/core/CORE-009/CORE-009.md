---
id: CORE-009
type: ticket
title: 3.3 Prompt/dispatch SSOT
status: done
area: core
assignee: ''
profile: fix
labels:
  - v3-phase-3
links: []
refs:
  - docs/functional/frd/FRD-010-task-scoped-dispatch.md
archived: false
created: '2026-08-16T00:30:18.744Z'
updated: '2026-08-16T03:42:11.434Z'
---

Move the per-task prompt texts into core so the MCP prompt and Phase 5's dispatch picker share one source and cannot drift.

**Where:** `packages/core/src/prompts.ts`
**Plan:** `docs/plans/kanmer-v3/phase-3-groups-mcp/plan.md` § 3.3
**Governing docs:** FRD-010 R2
**Depends:** 3.1

The precedent already works: `takeTicketPromptText` lives in core and is consumed by both the MCP `take-ticket` prompt (mcp-server/src/index.ts:935) and the GUI's dispatch (apps/gui/src/main/dispatch.ts:98). Extend that pattern to the six task prompts.

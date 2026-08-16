---
id: CORE-006
type: ticket
title: 2.5 Priority removal
status: backlog
area: core
priority: medium
assignee: ''
labels:
  - v3-phase-2
links: []
blocks:
  - CORE-007
  - GUI-011
docs_todo: true
archived: false
created: '2026-08-16T00:30:18.684Z'
updated: '2026-08-16T00:32:14.382Z'
---

Drop `priority` from the schema and `KEY_ORDER`; leave passthrough so existing files keep the key harmlessly until migration strips it. Filter params dropped.

**Where:** `packages/core/src/types.ts`, `frontmatter.ts`, `store.ts`
**Plan:** `docs/plans/kanmer-v3/phase-2-core-format3/plan.md` § 2.5
**Governing docs:** FRD-008, ADR-0006
**Depends:** 2.1

Follow the `due` precedent exactly — same removal shape, same test shape (`store.test.ts:747-758` asserts a legacy `due:` loads via passthrough and is read by no filter; `:872` asserts it is absent from clean serialisations).

---
status: draft
---

# ADR-0001 — Group membership lives on the ticket; member lists are derived

## Context

Groups (FRD-001) need per-group member lists, progress, and shared context. Membership could live on the ticket, on the group file, or both.

## Decision

Tickets carry `groups: []` in frontmatter. The reverse index (a group's members) and progress are derived at read time — the exact pattern `blocks:`/blocked-by already uses. Groups mirror the ticket-folder pattern (`groups/EPIC-001/EPIC-001.md` + shared docs beside it) but never store member lists.

## Alternatives considered

(a) Member list on the group file — every ticket add/remove/archive edits two files; agents will let them drift. (b) Denormalised both — the drift problem squared.

## Consequences

No two-file consistency problem; an agent editing a ticket sees its groups in one read; group views cost a derived scan (cheap at realistic scales); archiving a ticket needs no group edit.

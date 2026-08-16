---
status: draft
covers: shipped core (backfill); verified against code in Phase 0
---

# FRD-015 — Ticket & board core

The item model everything else stands on.

- R1. An item is Markdown + YAML frontmatter in its own folder under its area (`areas/<area>/<ID>/<ID>.md`); the body may reference items with `[[ID]]` wiki-links.
- R2. **Ids are immutable and area-born**: each area declares a prefix; per-prefix counters with on-disk reconcile; moving areas moves the folder, never the id, so links stay valid forever. Path traversal in ids is rejected.
- R3. Relations: `links:` (structured, target-must-exist), `blocks:` (dependency edges; blocked-by is derived, never stored), body wiki-links (reported as backlinks).
- R4. Fields: title, status, area, assignee, labels, groups (FRD-001), profile (FRD-002), refs/docs_todo, commits/prs, deployment (board-gated), taken state (FRD-016), archived, created/updated, manual `order`.
- R5. Writes are atomic (temp+rename), exclusive-create id allocation survives concurrent creates, no-op writes don't bump `updated`, and optimistic concurrency (`expected_updated`, doc versions) protects read-modify-write.
- R6. Every write validates field values against the board config; unknown values are rejected, never silently written.
- R7. **Archive is the human delete** (GUI Delete = Archive; archived items leave the board, live in the Archived view); `delete_item` is agent-only and destructive-annotated, cleans dangling links, reports body refs.

**Acceptance (as-built):** the existing vitest suites are this FRD's evidence — id race (10-way), traversal guard, no-op skip, link integrity, board validation, archive semantics.

Related: README data model · kanmer-upgrades Phases 1–2 · FRD-001/002/016.

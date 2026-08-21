---
id: CORE-004
type: ticket
title: 2.3 Folder documents
status: done
area: core
order: 50
assignee: ''
profile: feature
labels:
  - v3-phase-2
groups:
  - EPIC-003
links: []
blocks:
  - CORE-005
  - CORE-007
  - GUI-010
refs:
  - docs/functional/frd/FRD-003-ticket-documents.md
  - docs/functional/frd/FRD-004-reference-files.md
  - docs/architecture/adr/ADR-0004-folder-containment-doc-type.md
archived: false
created: '2026-08-16T00:30:18.660Z'
updated: '2026-08-21T13:02:16.741Z'
---

Type directories with recursive containment, including `reference/` and `open-questions/`. Doc APIs go path-based (`setDoc(id, "research/azure/x.md")`), lazy mkdir, gate satisfaction = recursive >=1 md excluding `reference/`, `scratch/`, `assets/`. Reference enumeration (names + absolute paths for binaries) in item summaries. Unknown top-level folders rejected.

**Where:** `packages/core/src/paths.ts`, `store.ts` doc APIs
**Plan:** `docs/plans/kanmer-v3/phase-2-core-format3/plan.md` § 2.3
**Governing docs:** FRD-003, FRD-004, ADR-0004
**Depends:** 2.1

The largest single change in Phase 2. Today docs are flat `<type>.md` files beside the ticket; `SAFE_DOC_RE`, `docFileIn` and `SCRATCH_PREFIX` (paths.ts:127-156) all give way. Preserve the doc version-hash concurrency token (`getDocWithVersion`, io.ts:11-13).

Verification: nested round-trip; recursive gate count; reference/scratch/assets never satisfy; chore creation writes exactly one file.

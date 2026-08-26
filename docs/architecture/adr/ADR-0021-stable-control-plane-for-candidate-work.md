---
status: draft
---

# ADR-0021 — Stable control plane for candidate work

- **Status:** proposed
- **Date:** 2026-08-26

## Context

Kanmer's candidate changes alter the board's own identity, ownership, release
and orchestration mechanisms. Letting an unreleased candidate server become the
authority for the live board would make a workflow failure capable of hiding or
corrupting the evidence needed to recover it. The product also needs a concrete
promotion and rollback boundary rather than treating a successful feature PR as
proof that a new controller is safe.

## Decision

The last known-good released Kanmer is the stable control plane for the live
board. Candidate code is built in ordinary isolated or explicit batch workspaces
and tested against disposable or copied boards. It cannot silently take over the
live board.

Promotion requires: candidate code and migrations; golden-board acceptance;
live-board backup; clean stable-server stop; candidate install; migration and
reconciliation; project-identity verification; ticket CRUD, lease, review,
merge, exact-SHA verification, closeout and sync checks; and an explicit stable
mark only after success. A failure rolls back to the previous stable release and
board backup while retaining the immutable failed attempt and its proof.

## Alternatives considered

- Run the candidate against the live board throughout development — rejected:
  a candidate defect could remove the recovery path it must prove.
- Maintain a second live board or database replica — rejected: it creates a
  second source of truth and changes the product model.
- Treat release publication as promotion proof — rejected: artifact publication
  does not prove live-board workflow, migration or rollback safety.

## Consequences

Candidate test harnesses must use explicit disposable/copied board locations.
The release/promotion controller needs one auditable handoff with backup and
rollback evidence. Stable and candidate server identity must be observable.
Normal feature tickets remain governed by existing GitHub required checks and
exact-SHA review/verification; this decision adds no board stage or merge queue.

## Related

PRD-002 · FRD-020 · FRD-021 · FRD-029 · FRD-031 · FRD-035 · ADR-0015 · ADR-0016.

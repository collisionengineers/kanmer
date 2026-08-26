---
status: draft
---

# PRD-002 — Reliable autonomy and multi-controller operation

## Problem

Kanmer's file-backed board, exact-SHA review and independent verification are
strong foundations, but the current operating model assumes a mostly
single-controller, one-ticket-per-worktree workflow. A weak agent cannot safely
clear a prepared scope end to end when claims go stale, a PR or proof is left in
the wrong stage, delivery uses a branch policy other than `main`, or two
controllers use different copies of the same project. Operators also need to
record a small observation without accidentally creating a malformed delivery
ticket.

The product needs durable controls that reconcile live facts rather than trust
agent prose, while keeping the board transparent, the six workflow stages
fixed, and the last released Kanmer in control of the live board until a
candidate proves it can be promoted safely.

## Goals / non-goals

- Goal — a prepared scope can be completed by a controller through bounded
  execution, independent exact-head review, exact-merge verification and
  closeout.
- Goal — several controllers and several projects can operate safely without
  cross-project writes or two writers in one workspace.
- Goal — delivery supports both main-only and integration-to-release-candidate
  policies without making ordinary tickets wait for production release.
- Goal — work evidence, review and verification loops are finite and leave an
  auditable terminal disposition.
- Non-goal — replace the Markdown board with a database, another workflow
  engine, permanent stages, a global backlog, a generic distributed scheduler
  or arbitrary request-selected project routing.
- Non-goal — make candidate Kanmer the authority for the live board before
  promotion.

## Requirements

1. Kanmer recovers invalid or abandoned delivery state safely and dry-run first
   (FRD-028).
2. Logical project identity, named project endpoints and local location
   fingerprints prevent wrong-project mutation while permitting multiple
   projects to be observed (FRD-029).
3. Renewable leases protect isolated and explicit batch workspaces without
   deleting dirty work after expiry (FRD-030).
4. Per-project Git delivery policy, delivery state and one release owner per
   channel support main-only and candidate-based delivery (FRD-031).
5. Quick captures stay lightweight until an explicit promotion decision
   (FRD-032).
6. Evidence-backed preparation compiles a constrained plan into bounded worker
   step packets (FRD-033).
7. A durable goal controller reconciles every transition, uses independent
   review and verification, and applies bounded failure routing (FRD-034).
8. Golden boards and the stable-to-candidate promotion procedure demonstrate
   the complete model and a rollback path (FRD-035; ADR-0021).

## Success metrics

- A stale or invalid selected ticket receives a documented safe recovery action
  rather than remaining unexplained in Review or Verifying.
- Project mismatch, stale revision, competing lease, workspace conflict and
  release-channel conflict are structured refusals, not silent data loss.
- Golden boards prove the approved autonomous, multi-controller, batch,
  delivery and promotion scenarios with recorded command evidence.
- A completed goal roster has no unexplained claim, ambiguous PR, Review or
  Verifying ticket, and required checks are green.

## Open questions

- None. The approved operating direction fixes the product decisions; member
  plans record implementation-specific evidence and exceptions.

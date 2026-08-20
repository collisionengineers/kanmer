---
status: accepted
---

# ADR-0016 — Compiled workflow: audience contracts, readiness predicates, and GitHub merge physics

- **Status:** accepted
- **Date:** 2026-08-20

## Context

One ticket folder has to serve human approval, bounded implementation, independent review, and post-merge evidence. Existence-only documents and board stages alone do not establish that those audiences saw the right material; GitHub remains the system that can physically protect and merge a branch. Agents also need an unambiguous way to refuse a wrong project and to assemble a bounded execution context.

## Decision

Kanmer keeps its fixed six stages and existing ticket/document folders. It compiles four audience contracts from those existing artifacts:

1. Human approval is the ticket body plus the first feature-group `context.md`.
2. Weak execution is the bounded plan, checklist, files map, and `get_execution_packet` with a stop condition.
3. Strong review is a whole-file `scratch/review.md` attestation bound to the current PR head, plan version, and ticket revision.
4. Verification is a whole-file `proof/proof.md` record bound to the exact merged SHA, retaining typed attempts.

Readiness is expressed as four profile-resolved predicates at existing boundaries: approval at `leave-backlog`, execution/dispatch at `leave-preparing`, review at `enter-review`, and completion at `enter-done`. They are evaluations, not columns or stages. `enter-verifying` remains a reserved evaluator boundary with no injected requirement.

GitHub required checks and branch protection remain merge physics. Kanmer records intent, readiness, and evidence; it does not become a merge queue.

`expected_project` is optional during the compatibility window. Clients first inspect `get_status.compat.expectedProject`, send it only when supported, and it cannot become mandatory before the release after compatible clients and skills ship. `custom` remains supported for import/backfill; policy directs new ordinary work to feature, fix, chore, or spike without removing ungated creation.

Groups plus `blocks` remain the only settled structure. This decision adds no hierarchy, stages, gated document types, leases/heartbeats, overlay engine, role-specific servers, metrics/golden board, GitHub App, format 4, profile materialization, prose-scored gates, merge queue, or automatic merge.

## Alternatives considered

- One universal ticket surface would keep the weakest reader responsible for assembling all context.
- New workflow stages would duplicate predicates and destabilize the fixed stage contract.
- Content-scored gates would turn subjective prose into a brittle machine block.
- Making the board the merge boundary would duplicate GitHub protection rather than use it.
- Making the project fingerprint mandatory immediately would break older clients during rollout.

## Consequences

Planners must preserve the audience boundaries and reviewers must attest to a precise head rather than a moving branch. Execution becomes smaller and safer for weak agents. GitHub job names and compatibility affordances stay stable, and the GUI/MCP may retain small paired Git inspectors at their package boundary. The detailed durable requirements live in FRD-002, FRD-003, FRD-006, FRD-007, FRD-010, FRD-016, FRD-019, FRD-020, FRD-022, and FRD-023.

## Related

ADR-0005 · ADR-0009 · ADR-0011 · ADR-0014 · ADR-0015 · FRD-002 · FRD-003 · FRD-006 · FRD-007 · FRD-010 · FRD-016 · FRD-019 · FRD-020 · FRD-022 · FRD-023.

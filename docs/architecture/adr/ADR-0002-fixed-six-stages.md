---
status: draft
---

# ADR-0002 — Stages are fixed constants, removed from board configuration

## Context

v2 let boards define arbitrary stages. Real use produced 4-stage boards where default doc gates referenced absent stages and went silently inert; skills had to resolve stage ids defensively; setup proposed stages it then had to explain.

## Decision

Six fixed stages: Backlog → Preparing → Implementing → Review → Verifying → Done. Preparing merges v2's Researching+Planning (the docs' own `requires` chain preserves internal order). Review (pre-merge) and Verifying (post-merge on `main`) stay separate — they are different behavioural moments with different skills. `statuses:` leaves board.yml; stage editing leaves the GUI and MCP.

## Alternatives considered

(a) Keep configurable + warn on dangling gates — treats the symptom; skills still can't assume stage names. (b) Five stages (fold Verifying into Review) — loses the merged-but-unconfirmed signal and the pre/post-merge skill boundary.

## Consequences

Gates can never dangle; skills and GUI hardcode stage knowledge safely; setup shrinks; a storage-format migration is required (ADR-0008); customization is knowingly removed — the trade is variance for reliability.

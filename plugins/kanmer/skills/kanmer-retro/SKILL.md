---
name: kanmer-retro
description: Look back over a Kanmer board's history from its activity log — what shipped in a period, how long tickets took (cycle time), where work stalled, and throughput by area and actor. Use when the user asks for a retro, "what shipped last month/sprint/week", "how long do tickets take", "where did we get stuck", or any look-back over a period. DO NOT USE FOR the current state of the board (kanmer-standup) or for fixing what you find (kanmer-groom).
---

# Kanmer retro / history digest

Standup answers "where are we"; retro answers "what happened and what does
it tell us". Everything here comes from the activity log — facts with
timestamps and actors, not reconstruction from memory.

## Gather

1. Agree the period ("last month", "since the v2 migration") and convert to
   an ISO timestamp.
2. `get_activity since: <start>` with a **high `limit`** (the default is
   200; a busy period overflows it — raise it and check whether the oldest
   entry returned is actually at your start date; if not, say the window is
   truncated). The log is a derived convenience and safe to delete — if it
   doesn't reach back to the period start, report the coverage you actually
   have rather than presenting a partial window as complete.
3. `list_board` (to know which stage is final, which are working stages)
   and `list_items include_archived: true` for titles, areas, and current
   state.

## Compute

- **Shipped**: activity entries with `field: "status"`, `to: <final
  stage>`, inside the period — count, titles, by area.
- **Cycle time** per shipped ticket: first `create` (or period start) to
  the final-stage move. Report median and the outliers, not just a mean one
  slow ticket can wreck.
- **Stalls**: long gaps between consecutive activity entries for a ticket
  that was in a working stage, and tickets that moved *backwards* (review →
  implementing says review found problems). Name the stage where time
  pooled — that's the bottleneck claim, with the gaps as evidence.
- **Throughput by actor**: takes, doc writes, moves per `actor` — who did
  what, including the agents.
- **Churn signals**: tickets released and retaken repeatedly, tickets that
  crossed the period without moving at all.

## Report

Scannable sections, facts first: **Shipped** (count + list), **Cycle time**
(median, fastest, slowest with why if the log shows it), **Where time
pooled** (stage + evidence), **Backflows** (review rejections and what they
were), **Still open from period start**, **Coverage note** (the window the
log actually supports). One line per item; interpretation goes in a short
closing paragraph clearly separated from the facts — the log says what
happened, the user decides what it means. Fixes belong to `kanmer-groom`,
not this report.

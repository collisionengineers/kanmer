---
status: draft
---

# PRD-001 — Kanmer v3: right-sized workflow, groups, and a standardized board

## Problem

Kanmer v2 proved the model — agents and a human sharing one file-based board — and real use on a 200+-ticket production board exposed six problems:

1. **Pipeline weight doesn't scale with task size.** Every ticket faces the same doc pipeline, so trivial tickets ("remove a redundant link") either stall at gates or teach agents to write junk documents to satisfy them.
2. **No cross-cutting grouping.** Work that spans areas but ships together has no home; real boards fake it with labels doing triple duty (epic membership `INT-14`, horizon `now`/`next`/`post-alpha`, state `blocked` — despite real `blocks:` edges existing).
3. **Board variance silently disables the rules.** Custom stage sets leave doc gates referencing absent stages — inert without warning, so the pipeline looks enforced and isn't.
4. **Agents conflate document types** (impact vs research), driven by ambiguous naming and prose-restated rules that drift.
5. **codex registration pollutes global config** — one global MCP entry per project, accumulating.
6. **The board doesn't scale visually** — a 194-card Backlog column is a list problem wearing a kanban costume.

   > **Note, 2026-08-16 (GUI-070).** The answer v3 shipped for problem 6 was a
   > dedicated **Backlog list view** — a sortable, virtualized table with bulk
   > triage, specified in FRD-011 and built as GUI-015 — with the kanban cut back
   > to Preparing→Done. That answer has been **withdrawn**. Backlog is a board
   > column again, the first of six (GUI-069), and the list view, its tab and its
   > component are deleted (GUI-070). Two surfaces showing the same tickets cost
   > more than the table was worth.
   >
   > **What this cost, named rather than glossed:** multi-select and bulk *move to
   > Preparing* / archive / add-to-group are **gone**, along with the report of
   > which tickets in a mixed selection could not move and why. That capability was
   > **weighed and dropped, not relocated** — the new Backlog column is
   > deliberately plain. The problem this bullet describes is therefore *accepted*
   > rather than solved: a very long Backlog column is still a long column. If it
   > bites, the fix is a ticket against the board column, not this view coming back.
   >
   > Governing docs amended with it: FRD-011 (`status: withdrawn`), FRD-007 B4,
   > FRD-019 R5.

## Goals

- A ticket's requirements match the nature of its work (profiles: feature/fix/chore/spike/custom), so gates create evidence, never busywork.
- Cross-cutting **groups** (kind-typed: epic, horizon, …) with shared context agents actually read.
- **One fixed six-stage board** (Backlog → Preparing → Implementing → Review → Verifying → Done): every gate live on every board, skills and GUI simplified, variance gone.
- Documents become **structural**: folder containment defines type, unlimited docs per type, human **reference files** first-class, research deep and multi-source, docs living.
- Agents ask the user at moments of genuine uncertainty instead of silently assuming; background dispatch is scoped to single deliverables.
- One codex entry per project; a backlog view built for volume — *the backlog view was withdrawn 2026-08-16; see the note under problem 6.*
- **Setup is reconciliation**: any run brings reality into Kanmer (issues, stray docs, history) and applies version upgrades.

## Success criteria

- Any legacy board adopts via the [adoption playbook]: one migration press maps its stages to the six, labels convert to groups, chores feel zero junk-doc pressure, and the backlog is triaged in the list view — *superseded: triage happens in the board's Backlog column; the list view was withdrawn 2026-08-16, see the note under problem 6.*
- Every gate on every board is live; `get_doc_gates` explains any blocked move.
- One codex config entry per project; global entries drained.
- Kanmer's own history backfilled as done tickets (dogfooding D41): the board reflects reality including the past.

## Scope

Delivered by FRD-001…008 (see docs README). Non-goals: sprint semantics (dates/capacity — door open via group kinds), multi-user/collaboration, previously-suggested roadmap items not raised in the shaping session (npm-published server, away-digest, metrics view, macOS/Linux packaging).

## Source

The full decision trail (47 decisions, 8 rounds, corrections included) lives in the
[shaping record](../../plans/kanmer-v3/shaping.md). Decisions are numbered D1–D48; D13 is unused.

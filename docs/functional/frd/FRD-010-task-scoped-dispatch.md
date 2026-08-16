---
status: draft
covers: shipped dispatch (Phase 7) + task scoping (v3)
---

# FRD-010 — Task-scoped dispatch

## Overview

Dispatch fires a background agent at **one granular deliverable** for one ticket — not a whole ticket. Shipped mechanics are absorbed: per-provider headless CLIs, the Dispatches drawer (states, per-dispatch ticket link), spawn at the repo root so the execute skill owns worktree creation.

## Requirements

- R1. **The task menu** (GUI card/context-menu "Dispatch to agent ▸ provider ▸ task"): *Research (quick)* · *Deep research* · *Map files* · *Write plan + checklist* · *Execute checklist* · *Verify + write proof*. Each maps to one skill's deliverable with an unambiguous done-condition (the documents exist / the checklist is worked / proof exists).
- R2. **Prompt contract** per task, from a core SSOT (shared with the MCP prompt so they never drift): the ticket id, the single deliverable, the headless rule (FRD-009 R3), the read-everything duty (FRD-003 T9), and *stop at the deliverable*.
- R3. **Gate-aware enablement:** a task whose stage requirements aren't met is disabled with the reason from `get_doc_gates` (you can't dispatch "Execute" past an unmet Preparing gate).
- R4. Worktree discipline unchanged: dispatch never pre-creates worktrees; only the execute task's skill does.
- R5. The drawer shows ticket, task, provider, state; a completed dispatch's deliverable is one click away (opens the ticket's relevant doc tab).
- R6. kanmer-auto and dispatch cross-reference each other in prose: auto = agent-side many-ticket orchestration; dispatch = GUI-side single deliverable.

## Acceptance criteria

1. Dispatch "Deep research" on a ticket produces `research/` subfolders + summary and nothing else; the ticket's stage is unchanged unless the skill legitimately moved it.
2. "Execute checklist" is disabled with a named missing doc on a ticket that hasn't left Preparing's requirements behind.
3. A dispatched run hitting a user-only question completes the deliverable with the question recorded (FRD-009 acceptance 2).

Related: D5/D11 · FRD-009 · FRD-002 · FRD-016 (worktrees).

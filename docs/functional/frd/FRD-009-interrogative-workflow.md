---
status: draft
covers: new behaviour woven into shipped skills (v3)
---

# FRD-009 — Interrogative workflow

## Overview

Agents ask the user at moments of genuine uncertainty instead of silently assuming — written as **natural prose tailored to each skill**, not a shared protocol or rigid format (explicit user decision, D3/D4/Q15-correction).

## Requirements

- R1. **The rule** (present in skill prose, tool descriptions where apt, and the AGENTS block): *genuine uncertainty on a decision the user owns is never silently resolved; ask, batched, with a recommended answer; depth proportional to stakes.*
- R2. **Where it lives, per skill:** kanmer-setup greenfield carries the deepest form (interview the brief before generating — the only place approaching a full design-tree); kanmer-research surfaces user-only questions **now**, not at planning; kanmer-plan puts approach choices to the user when real alternatives exist and shows user-visible/contested plans before implementation; kanmer-tickets asks one profile-clarifying question at intake when the work's nature is ambiguous. Grooming does not ask beyond its existing propose-then-apply.
- R3. **Headless rule** (dispatch, FRD-010): no user available → take the recommended answer, record question + assumption in `open-questions` content, and stop at the deliverable — never guess *forward* across a decision boundary.
- R4. Over-asking is a named failure mode: skills instruct proportionality; trivial defaults are taken, not asked.

## Acceptance criteria

1. A greenfield setup run on an ambiguous brief asks batched questions with recommendations before creating anything.
2. A research run hitting a user-only question stops and asks in interactive mode; the same dispatched task instead lands the question + taken assumption in the ticket and completes the deliverable.
3. No skill contains a mandated question *format*; each contains the rule in its own words.

Related: D3/D4/D5 · FRD-005 R3 · FRD-010 · ADR-0009.

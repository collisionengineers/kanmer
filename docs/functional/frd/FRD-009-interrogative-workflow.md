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
- R3. **Headless rule** (dispatch, FRD-010): no user available → take the recommended answer, record question + assumption in `open-questions` content, and stop at the deliverable — never guess *forward* across a decision boundary. Dispatch is for work whose specifics are already settled, so a dispatched task that raises a genuine question is a task that was not ready to dispatch; it stops rather than being given an escape hatch. The `questions-resolved` gate (R5) is what makes that stop literal instead of honour-system, so it **implements** this rule rather than sitting in tension with it.
- R5. **Asking is enforced, not merely instructed** (ADR-0011). The `questions-resolved` requirement is unmet while `open-questions/` holds an unticked `- [ ]` above the `## Parked (explicitly deferred)` heading, and it guards `leave-preparing`, `enter-review` and `enter-done` on **every** profile — no carve-out by work type, since open questions arise from any work that is new or unclear on specifics. An absent document satisfies it; raising no questions is not a failure state. Parking with a reason is the escape. A ticked box is the whole mechanism: **nothing records who answered**, because Kanmer is a solo-developer tool and the commit that ticks the box already carries an author. Existing boards inherit the requirement on upgrade. R1–R4 describe *when to ask*; this is the only clause that describes *not proceeding*, and it exists because the soft rule had, across every ticket that ever raised a question, a recorded resolution rate of zero.
- R4. Over-asking is a named failure mode: skills instruct proportionality; trivial defaults are taken, not asked.
- R6. **The PR merge gate is a separate read-only predicate.** `kanmer-gate` resolves the PR ticket and emits one deterministic JSON verdict. It fails `WRONG_STAGE` unless the ticket is in semantic `review`, and fails `DEPENDENCY_BLOCKED` for derived, live, non-archived blockers (completed blockers do not block). It warns, without failing the PR, for absent or invalid `scratch/review.md` (`NO_REVIEW_RECORD`/`STALE_REVIEW`) and for unreachable or indeterminate recorded ticket commits (`COMMITS_UNREACHABLE`). Review attestations are valid only when their complete machine schema is present; abbreviated hexadecimal commit ids are resolved by Git, and a recorded commit must be in the PR's `base..head` ancestry range. These warning checks are intentionally compatibility-period warnings and are not promoted by this change. The evaluator returns every check in stable order; JSON is stdout-only, annotations are stderr-only, and exits remain 0 for pass/warnings, 1 for policy failures, and 2 when the gate cannot evaluate its board/Git inputs.

## Acceptance criteria

1. A greenfield setup run on an ambiguous brief asks batched questions with recommendations before creating anything.
2. A research run hitting a user-only question stops and asks in interactive mode; the same dispatched task instead lands the question + taken assumption in the ticket and completes the deliverable.
3. No skill contains a mandated question *format*; each contains the rule in its own words.
4. A ticket whose `open-questions` holds an unticked box cannot leave Preparing, enter Review, or reach Done; ticking it clears the gate, and so does moving it under the parked heading with a reason. A ticket with no `open-questions` document is never blocked.

Related: D3/D4/D5 · FRD-005 R3 · FRD-010 · ADR-0009 · **ADR-0011**.

# Open questions — SKILL-012

*The open questions. Not scratch — these **block** the plan; scratch is a notepad and is never gated.*

These are for you. Research answered the design question (a `questions-resolved`
pseudo-requirement, gated at `leave-preparing` / `enter-review` / `enter-done`);
what is left is what only you can decide, because each one changes the contract
for every board, not just this one.

- [x] **Which profiles carry the requirement, and at which boundaries?**
      **Answered by the operator, 2026-08-16: all of them.** My recommendation
      (exempt `spike`) was rejected — *"there may be open questions from
      virtually any type of work if it is either new, or it is unclear on the
      exact specifics."* A carve-out by work type assumes some work is
      inherently unambiguous, and none is. So: every profile, at every boundary
      it has. `spike` gets it at `enter-done`, its only boundary.

- [x] **Does an existing board inherit the requirement, or only new ones?**
      **Answered by the operator, 2026-08-16: inherit.** Existing boards get the
      requirement on upgrade. Gates re-evaluate immediately (`update_item`'s own
      contract), so a ticket sitting in Preparing with an unticked box becomes
      unmovable the moment this ships — intended. Nothing is stranded on this
      board (only SKILL-011/012 are in flight), but a user upgrading
      mid-pipeline could be, so **the release notes must say so** and name the
      escape: tick it, or move it under `## Parked` with a reason.

- [x] **Must a resolved question record *who* answered it?**
      **Answered by the operator, 2026-08-16: no. Rejected.** My recommendation
      (require provenance in the template's prose, unparsed) was turned down on
      two grounds, both good:

      - Kanmer is **for solo developers**, where "who answered" has exactly one
        answer and the field is ceremony.
      - Even on a team it is **already recorded** — the commit that ticks the box
        carries the author's name. Asking the document to restate it duplicates
        git for no gain.

      So the mechanism is the box alone, and nothing in the template asks for
      provenance. The residual risk stands and is accepted: a ticked box does not
      distinguish "the operator decided" from "the agent decided it had thought
      about this enough". That is what review is for.

      *(Where an answer's origin is genuinely load-bearing — as with these very
      questions, which change the contract for every board — writing it down is
      still the right call. It is a judgement, not a requirement.)*

- [x] **Write the ADR, and does it block implementation?**
      **Answered by the operator, 2026-08-16: agreed — write it first.**
      Done: **ADR-0011 — Gates may read a document's content, for open questions
      and nothing else**, merged to `main` as `c7ba074` (PR #30) and linked into
      this ticket's `refs`. It records the three properties that keep the
      exception from generalising (the convention is already shipped and already
      parsed; the parser judges syntax rather than meaning; the failure mode is a
      stuck ticket rather than a wrong one), the four rejected alternatives, and
      the consequences — including that upgrading boards can strand in-flight
      tickets, that `## Parked` becomes load-bearing and needs a test asserting
      the exact string, and that the review-fix stop cannot be delivered as a
      gate.

---

**All open questions on this ticket are resolved.** The `leave-preparing`
boundary is clear on this count — which, once this ticket ships, is what that
sentence will mean mechanically rather than by assertion.

- [x] **Do the historical cases get revived?** — **Answered by the operator,
      2026-08-16, and all twelve questions across the four tickets are now
      closed in their own documents.** My recommendation to file GUI-064's
      unmeasured respawn timing as a ticket was **overtaken**: it is folded into
      [[MCP-005]] instead, which makes the question moot by removing the root
      cause rather than measuring the race.

      | Ticket | Disposition |
      |---|---|
      | GUI-064 (4) | Q1 folded into [[MCP-005]]; Q2/Q4 recorded as answered by implementation and by action; Q3 — existing consent judged sufficient, nothing changes. Both parked items closed. |
      | GUI-004 (1) | Resolved by events — option (a); the ticket is a `spike` and Done. Recorded. |
      | CORE-011 (3) | All three answered. Written into a proper `open-questions` doc, since they were posed in the ticket **body** — which is part of why they were never marked resolved. R2 left unbuilt: the structural rule suffices. |
      | CORE-021 (4) | **Closed by abandonment.** Nothing was implemented (verified: no `child_process` in `packages/core/src`). Q2 — may core shell out to git — is noted as unanswered and likely to recur. |

      This exercise is itself the argument for the ticket: every one of these was
      either already decided or trivially decidable, and not one had been
      written down.

## Parked (explicitly deferred)

- **Should `blocked: true` be set automatically while questions are open?** Safe
  to defer: the gate already stops the move, and auto-setting a field the human
  also sets by hand makes ownership of it ambiguous. Reopens if operators start
  wanting the board to *show* "waiting on me" rather than only refusing a move.

- **A GUI affordance for answering questions in-app.** Deferred: the document is
  editable in the app today, and building a prompt surface before the gate has
  ever run in anger would be designing for an unobserved workflow. Reopens once
  the gate has stopped a few real tickets.

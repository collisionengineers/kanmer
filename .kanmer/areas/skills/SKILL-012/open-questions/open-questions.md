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

- [ ] **Does an existing board inherit the requirement, or only new ones?** —
      Gates re-evaluate immediately (`update_item`'s own contract), so shipping
      this can strand a ticket sitting in Preparing with an unticked box. On our
      board nothing is stranded — only SKILL-011/012 are in flight — but a user
      upgrading mid-pipeline could be.
      **Recommendation: inherit.** A rule that applies only to new boards is not
      a rule, and the escape is one line in a document the agent already wrote:
      tick it, or move it under `## Parked` with a reason. Wants a release note.

- [ ] **Must a resolved question record *who* answered it?** — A ticked box says
      resolved; it does not say the operator resolved it rather than the agent
      deciding it had thought about it enough. That gap is how the current soft
      rule fails, so the mechanism could inherit the same weakness.
      **Recommendation: require provenance in the template's prose** — the
      answer and who gave it, on the same bullet — but **do not parse it.** A
      regex asserting "a human answered" would be a machine judging something it
      judges badly, which `gates.ts:88-97` already treats as warning-not-block
      territory. Enforce the box; let review catch a box ticked dishonestly.

- [ ] **Write the ADR, and does it block implementation?** — This is the first
      gate that reads *inside* a document. `gates.ts:174-177` is explicit that
      the anti-collapse rule was made structural precisely so it "has nothing to
      be wrong about"; a content parser gives up that property.
      **Recommendation: yes, write it, and yes, it lands first** — `kanmer-plan`
      requires design decisions to become ADRs before the plan cites them, and
      the profile-assignment question above is really a consequence of whatever
      the ADR concludes.

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

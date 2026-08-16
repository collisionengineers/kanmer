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

---

## Re-opened during implementation, 2026-08-16

- [ ] **"Existing boards inherit" is not true as implemented. How should it be
      made true?** — Found while demonstrating the gate on a copy of this board:
      it did not fire. `resolveProfiles` is
      `board.profiles ?? DEFAULT_PROFILES` (`packages/core/src/board.ts:45-47`),
      and this board's `.kanmer/data/board.yml` carries an explicit `profiles:`
      block — as does every board that setup or migration has ever written. So
      editing `DEFAULT_PROFILES` reaches **new boards only**, and the decision
      recorded above ("inherit") is not delivered by the code that claims it.

      **Recommendation: (A) inject at resolve time.** `resolveProfiles` adds
      `questions-resolved` to each profile's already-declared boundaries. Three
      lines; every board inherits; the requirement still appears in
      `get_doc_gates`, which ADR-0011 wants and FRD-023 R1 requires so skills can
      derive rather than restate. The cost: `board.yml` no longer lists every
      effective requirement, a small dent in "board.yml is the source of truth"
      — though `resolveProfiles` is already where board config meets shipped
      defaults.

      **(B) A precondition beside `collapsesPipeline`,** outside
      `requirementsFor` and the `EvidenceProbe`. Every board gets it and
      `board.yml` stays literally true. But it is invisible to `get_doc_gates`,
      so skills cannot self-check and the GUI cannot grey the drop target.
      [[CORE-021]] proposed exactly this shape for its own rule and leaned
      toward accepting the invisibility; that rule was never built, so the
      precedent is untested.

      **(C) Migrate `board.yml`.** Most honest to "the file is the truth", and
      the only option that leaves the board self-describing — but it rewrites
      user configuration, needs a migration step and a way to decline.

      Not guessing: this changes what every existing board demands, and B and C
      lead to materially different products.

→ **Answered by the operator, 2026-08-16: (A), inject at resolve time.**
      Implemented in `resolveProfiles` (`packages/core/src/board.ts`), which now
      adds the requirement to the profiles in force. Existing boards inherit
      without their `board.yml` being rewritten, and it still appears in
      `get_doc_gates` so skills derive rather than restate. The trade-off is
      stated in the code: `board.yml` no longer lists every effective
      requirement.

      The demonstration then found **two limits the design had not stated**,
      both now covered by tests:

      - **Never `leave-backlog`.** The first run blocked it, which is backwards
        — questions are raised *during* research, so gating entry to the stage
        where they get worked traps the ticket outside it.
      - **Only boundaries a profile already declares.** `collapsesPipeline`
        counts *gated* boundaries, so giving `spike` a gated `leave-preparing`
        and `enter-review` would turn its Backlog → Done jump from one gated
        boundary into three and refuse it, breaking the acceptance case FRD-002
        exists to protect. The cost, stated rather than hidden: `fix` and
        `chore` declare no `enter-review`, so for those profiles a question
        raised during implementation is caught at `enter-done` rather than at
        review.

Marking the box: the answer is recorded above and the code matches it.

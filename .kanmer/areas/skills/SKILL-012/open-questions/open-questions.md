# Open questions — SKILL-012

*The open questions. Not scratch — these **block** the plan; scratch is a notepad and is never gated.*

These are for you. Research answered the design question (a `questions-resolved`
pseudo-requirement, gated at `leave-preparing` / `enter-review` / `enter-done`);
what is left is what only you can decide, because each one changes the contract
for every board, not just this one.

- [ ] **Which profiles carry the requirement, and at which boundaries?** — This
      edits the shipped `DEFAULT_PROFILES` table, so it changes what every
      Kanmer board demands, not just ours. The hard case is `spike`: its
      deliverable *is* research, and surfacing questions can be the whole point
      of one — GUI-004 was exactly that, and an `enter-done` requirement would
      make the profile contradict itself.
      **Recommendation:** `feature` and `fix` at all three of their boundaries;
      `chore` at `enter-done` only; `spike` **nothing**.

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

- [ ] **Do the five historical cases get revived?** — Research F4: GUI-064's
      unmeasured MCP respawn timing (Done, admitted in proof.md), GUI-004 and
      CORE-011 answered in practice but never recorded, GUI-064's checklist
      closed at 21/23, and CORE-021's four decisions abandoned by archiving —
      one of which wants an ADR that does not exist.
      **Recommendation: file one ticket for GUI-064's unmeasured timing** (it is
      a real gap in shipped evidence, not bookkeeping) **and leave the rest.**
      Reviving CORE-021 is a separate decision about whether that work is wanted
      at all.

## Parked (explicitly deferred)

- **Should `blocked: true` be set automatically while questions are open?** Safe
  to defer: the gate already stops the move, and auto-setting a field the human
  also sets by hand makes ownership of it ambiguous. Reopens if operators start
  wanting the board to *show* "waiting on me" rather than only refusing a move.

- **A GUI affordance for answering questions in-app.** Deferred: the document is
  editable in the app today, and building a prompt surface before the gate has
  ever run in anger would be designing for an unobserved workflow. Reopens once
  the gate has stopped a few real tickets.

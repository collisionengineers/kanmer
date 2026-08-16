# Open questions — SKILL-013

*The open questions. Not scratch — these **block** the ticket at three real gates.*

Six questions. Two were answered by the operator/scheduler (verbatim in
`scratch/operator-answers.md`); four are settled here in the plan, each with the
reason rather than silently. All six are resolved — none parked.

---

## Answered by the operator / scheduler

- [x] **⚠️ OPERATOR ONLY — Does `fix` gains `enter-review` ship in THIS ticket's
      PR, or its own?**
      **ANSWERED: ship BOTH in one PR.** One ticket, one PR, one revert unit. My
      split recommendation was declined; the operator accepts that a prose fix
      which cannot break a board is now coupled to a gate change that can strand
      in-flight `fix` tickets.

      **Consequence, and it is the reason this matters:** the migration risk is
      now this ticket's to *handle*, not to note. Four things follow, all in the
      plan and the checklist — the ADR is written here; existing boards are
      reached by resolve-time injection; `proof` carries a **measured**
      four-profile before/after table; and what happens to a `fix` already in
      `implementing` is stated explicitly rather than discovered on upgrade.

- [x] **⚠️ OPERATOR ONLY — Should the AGENTS block carry the Review-skipping
      consequence?**
      **ANSWERED: NO. Mechanism only, plus a pointer to `get_doc_gates`.**
      Which profiles skip Review is a per-profile requirement fact —
      configuration-dependent by definition, exactly what `get_doc_gates` exists
      to answer, and it would be made wrong by this very ticket's gate change.

      The tension I flagged (the ticket's Why says the block is where rules must
      reach) resolves cleanly: the block carries the **mechanism** and directs
      the reader to the tool for the **values**. That is R1 working, not R1 being
      dodged.

      **And a scope addition:** the per-profile table already in the block must
      be **DELETED, not extended**. It omits `fix` — the default profile — and
      omits `questions-resolved` entirely. R1 violation *and* factually wrong.

---

## Settled in the plan — with the reason

- [x] **Does the widened check 7 forbid the five *illustrative* per-profile
      mentions, or permit them?**
      **Settled: permit, but only in that exact shape** — one profile named as an
      example, on a line whose neighbourhood also names `get_doc_gates`. A
      **list** of profiles-to-requirements is forbidden.

      That is the line that makes the AGENTS block's table a violation while
      `kanmer-research:14-15` is not, and it is what the surviving prose already
      does by accident — so the rule is being stated, not invented. It is
      mechanizable: count distinct profile names on the line, require
      `get_doc_gates` within N lines. `kanmer-plan:11-12` fails it on the second
      clause too (it is measurably false), so it is corrected regardless.

- [x] **Does the AGENTS block gain the "`board.yml` is not the effective
      requirement set" line, given its size cost?**
      **Settled: yes, as a clause on the existing `get_doc_gates` bullet, not a
      new bullet.** It is the strongest single reason to make the call, and
      deleting the per-profile sentence frees more room than the clause costs —
      so the block gets **shorter**, which is what SKILL-014's binding precedent
      asks for. The byte count is recorded in `proof`; if it came out
      net-**longer** this is the line that would have been dropped.

- [x] **Where does the verification script live, and what is it called?**
      **Settled: `scripts/verify-skill-prose.mjs`, wired as `npm run verify:skills`,
      added to `release.mjs` beside `verify:agents-block`.** FRD-023 R5 asks for
      exactly that and `verify-agents-block.mjs` is the established shape.

      Not deferred to CORE-025: that ticket is about what CI should assert about a
      *ticket*, a different question. SKILL-014 already parked one iteration of
      this — parking it twice is how it never ships, and its own proof lists
      "not committed" as a weakness.

- [x] **Does `verify-agents-block.mjs` also gain a check that the repo's own
      `AGENTS.md` carries the current `BLOCK_BODY`?**
      **Settled: yes — and this stopped being optional during this run.** Connect
      overwrote this repo's `AGENTS.md` with the stale v2 body from the third
      copy (`apps/gui/src/main/agentsBlock.ts:11-24`). Nothing detected it; the
      diff was caught by eye. So the script gains three things: the `AGENTS.md`
      check, equality of the fenced region instead of `skill.includes()`, and a
      check that the GUI copy is the canonical body.

      **The third copy is also fixed here rather than filed.** This ticket owns
      deciding what the canonical body *is*, so it owns making the other copies
      stop being independent — `connect.ts` points at the canonical body.
      CORE-023 keeps detection and is in flight.

## Parked (explicitly deferred)

- **Should `enter-verifying` be used by any profile?** No shipped profile
  declares it; it is dead configuration surface an agent can see and be confused
  by.

  Safe to defer, and *more* clearly so after this ticket: adding it would be a
  second boundary addition, and ADR-0013 spends the whole of this ticket's
  measurement budget proving that **one** such addition is safe. Reopens if a
  profile is ever proposed that wants evidence before Verifying.

- **Pruning `.claude/skills/`.** The install carries an orphan `run-kanmer/`
  directory absent from source; the installer only ever adds. Real, reproducible,
  and [[CORE-023]] already owns it. Recorded as evidence, not claimed as work.

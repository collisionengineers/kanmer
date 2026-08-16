# Open questions — SKILL-013

*The open questions. Not scratch — these **block** the ticket at three real gates; scratch is a notepad and is never gated.*

Six questions. **Two need the operator and are first, marked ⚠️ OPERATOR ONLY.**
Both are scope decisions about a change that reaches every existing board, and
neither is answerable from the code — that is the test I applied. The remaining
four are judgements I can make from FRD-023, ADR-0009/0011 and the code, and each
is recorded with its reason rather than resolved silently. Over-asking is its own
failure; so is shipping a board-wide profile change on my own reading of a note.

---

## ⚠️ OPERATOR ONLY — answer these before planning

- [ ] **⚠️ OPERATOR ONLY — Does `fix` gains `enter-review` ship in THIS ticket's
      PR, or its own?** The ticket is titled "carry the hard rules into AGENTS.md
      and skill prose". The operator's note adds a **profile change** that
      "changes what every existing board demands of every `fix`", needs its own
      ADR, needs resolve-time injection to reach existing boards, and needs a
      measured four-profile before/after table in `proof`.

      Those are two different risk profiles in one PR: prose that cannot break a
      board, and a gate change that can strand in-flight `fix` tickets on
      upgrade. SKILL-014's precedent was to file the larger question as its own
      ticket ([[SKILL-015]]) "rather than smuggling a deletion into a
      normalisation change".

      **My recommendation: split.** This ticket keeps the AGENTS block, the skill
      prose, the ADR-0011 amendment and the verification script; a new ticket
      takes the `fix` profile change, its new ADR, and the four-profile
      measurement. The ADR-0011 amendment belongs *here* either way, because it
      documents the mechanism the other ticket will rely on.

      **Cannot be defaulted.** The ticket body says "Decide it here"; the operator
      then decided the *behaviour* but not the *packaging*, and choosing wrong
      either delays a decided change or couples a safe PR to a risky one.

- [ ] **⚠️ OPERATOR ONLY — Should the AGENTS block carry the Review-skipping
      consequence at all?** After the `fix` change, `chore` and `spike` can still
      go implementing → done in one move; `feature` and `fix` cannot. That is a
      real behaviour most agents will never discover — but it is a *per-profile*
      fact, which is exactly the class finding 2 of `research` says must never be
      restated, and which changes the moment anyone edits `profiles:`.

      So the block can honestly say the **mechanism** ("a move crosses at most
      one gated boundary" — already there) but not the **outcome per profile**.

      **My recommendation: mechanism only, and add one sentence pointing at
      `get_doc_gates(id).reachable`,** which reports the outcome per ticket and
      is the tool that already answers this. That keeps R1 intact and still gives
      the agent a way to find out.

      **Needs the operator** because the ticket's Why explicitly frames the block
      as the place a rule must reach ("a rule absent from it is a rule most
      agents never see"), and this is the one finding of the ticket that my rule
      says cannot go there. That is a direct tension between the ticket's premise
      and its own governing doc, and resolving it against the ticket is not my
      call to make silently.

---

## Answerable here — recorded with the reason

- [ ] **Does the widened check 7 forbid the five *illustrative* per-profile
      mentions, or permit them?** Six sites exist (`research` finding 7). One
      (`kanmer-plan:11-12`) is measurably wrong and must be corrected regardless.
      The other five each sit immediately beside "ask `get_doc_gates`" and exist
      to motivate the call.

      **Leaning: permit, but only in that exact shape** — a single profile named
      as an example, on a line or in a sentence that also names `get_doc_gates`.
      Forbid a *list* of profiles-to-requirements, which is what
      `kanmer-setup:156` is and what R1's acceptance grep was written for.

      That rule is mechanizable (require `get_doc_gates` within N lines; count
      distinct profile names on the line) and it is what the existing prose
      already does by accident. Settling it in the plan, because it decides how
      many files the sweep touches and that is a planning input, not a research
      finding.

- [ ] **Does the AGENTS block gain the "`board.yml` is not the effective
      requirement set" line, given its size cost?** SKILL-014's binding
      precedent: the block "ships into every repo that installs Kanmer, so its
      size is a cost everyone pays".

      **Leaning: yes, as a clause on the existing `get_doc_gates` bullet, not a
      new bullet.** It is the strongest reason to make the call and it costs ~12
      words, while deleting the per-profile sentence it replaces frees more than
      that — so the block gets *shorter*. If the count comes out net-longer in
      the plan, this is the line to drop.

- [ ] **Where does the verification script live, and what is it called?**
      SKILL-014's is uncommitted, which its own proof lists as a weakness
      ("nothing prevents recurrence"). This ticket cannot carry rules into prose
      while its check sits in a scratchpad.

      **Leaning: `scripts/verify-skill-prose.mjs`, wired as `verify:skills` and
      added to `release.mjs` beside `verify:agents-block`** — FRD-023 R5 asks for
      exactly that, and `verify-agents-block.mjs` is the established shape
      (`check(name, cond, detail)`, PASS/FAIL lines, exit 1). Not deferred to
      [[CORE-025]]: CORE-025 is about what CI should assert about a *ticket*,
      which is a different question, and SKILL-014 already parked one iteration
      of this — parking it twice is how it never ships.

- [ ] **Does `verify-agents-block.mjs` also gain a check that the repo's own
      `AGENTS.md` carries the current `BLOCK_BODY`?** Today it compares only the
      two *sources*; the generated file is kept current by hand and happens to be
      correct.

      **Leaning: yes, and tighten line 153 from `skill.includes(BLOCK_BODY)` to
      equality of the fenced region** — a substring test passes on extra text
      inside the fence. Both are three-line changes to a script this ticket is
      already touching, and the ticket's Verification box asks that setup
      "refreshes its AGENTS block", which is untested end-to-end on a real repo.

## Parked (explicitly deferred)

- **Should `enter-verifying` be used by any profile?** `get_doc_gates` reports
  five boundaries and no shipped profile declares `enter-verifying`. It is dead
  configuration surface an agent can see and be confused by.

  Safe to defer: it costs nothing today, and touching it would add a gated
  boundary — precisely the move ADR-0011's second limit forbids without
  re-measuring `collapsesPipeline`. Reopens if a profile is ever proposed that
  wants evidence before Verifying.

- **Pruning `.claude/skills/`.** The install currently carries an orphan
  `run-kanmer/` directory absent from source, because the installer only ever
  adds. Real, reproducible, and [[CORE-023]] already owns it. Recorded here as
  evidence, not claimed as work. Reopens if a stale install ever causes an agent
  to act on a deleted rule — which is the same failure mode this ticket exists to
  fix, one tier down.

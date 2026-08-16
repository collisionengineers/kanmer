## OPERATOR + SCHEDULER ANSWERS — 2026-08-16

**Q1 — does `fix` gaining `enter-review` ship here or in its own ticket?
OPERATOR ANSWERED: ship BOTH in one PR.** One ticket, one PR, one revert unit. The
split recommendation was declined. The operator accepts that a prose fix which
cannot break a board is now coupled to a gate change that can strand in-flight
`fix` tickets on upgrade.

Because they ship together, the migration risk is this ticket's to handle, not to
note:
- the ADR for the gate change is written **here**
- `questions-resolved`-style **resolve-time injection** is the mechanism that
  reaches existing boards whose `board.yml` predates the change
- the `proof` must carry a **measured four-profile before/after table**, the way
  SKILL-012's proof did. Not asserted — measured.
- say explicitly what happens to a `fix` ticket already sitting in `implementing`
  when the new boundary appears

**Q2 — should the AGENTS block carry the Review-skipping consequence?
SCHEDULER ANSWERED: NO. Mechanism only, plus a pointer to `get_doc_gates`.**

This follows from the rule you yourself derived, not from taste:

> A rule may be stated in prose iff its truth-value is independent of board
> configuration.

Which profiles skip Review is a **per-profile requirement fact**. It is
configuration-dependent by definition, it is exactly what `get_doc_gates` exists
to answer, and it is the class R1 forbids restating. Stating it would also make
the block wrong the moment this very ticket changes `fix`.

The tension you flagged — the ticket's Why says the block is where rules must
reach — is real but resolves cleanly: the block carries the **mechanism** (that
boundaries exist, that a move crosses at most one, that gates constrain
`move_item` and nothing else) and directs the reader to the tool for the
**values**. That is R1 working, not R1 being dodged.

**And the per-profile table already in the block must be DELETED, not extended.**
`agents-block.mjs:30` / `kanmer-setup/SKILL.md:156` states a per-profile
requirement table that omits `fix` — the default profile — and omits
`questions-resolved` entirely. It is both a R1 violation and factually wrong
today. Deleting it makes the block net-shorter.

**Remember the duplication:** the block's literal body lives in BOTH
`scripts/agents-block.mjs` AND `plugins/kanmer/skills/kanmer-setup/SKILL.md`, and
there is a **third, stale v2 copy** at `apps/gui/src/main/agentsBlock.ts:11-24`
that `connect.ts:18` imports — so the GUI's Connect flow writes a seven-stage,
`impact.md`, `-import` block into every repo it touches today. CORE-023's research
found it and called it a live bug. Decide in the plan whether you fix it here (it
is small — point `connect.ts` at the canonical body) or file it; do not leave three
copies.

**Do not invent a new derive-vs-restate check.** Reuse SKILL-014's check 7. Note
its two measured holes: it only inspects lines that name a boundary (so
`kanmer-setup:156` is never even a candidate), and its verb list is
`needs|requires|owes` while real prose says "asks for", "may reach", "skips",
"may finish". It reports zero requirement lists truthfully — it just measures less
than R1. Widen it. **That script is currently UNCOMMITTED**, surviving only in a
scratchpad temp directory — committing it is part of this ticket's value.

**Also fix `kanmer-plan/SKILL.md:11-12`** — "a `chore` asks for a plan and nothing
else" is measurably wrong (chore also owes `proof` and `questions-resolved` twice).
Same defect class as the `kanmer-review:48` line SKILL-014 fixed.

**Sequencing — this ticket collides with two others:**
- **SKILL-018** edits skill frontmatter across the roster. It is one line plus a
  rail check and runs FIRST. Rebase onto it.
- **MCP-010** edits `AGENTS.md`. Rebase before opening your PR.

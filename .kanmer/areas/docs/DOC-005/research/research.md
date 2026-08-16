# The operating rule — research

## What the ticket asks for

`AGENTS.md` and `docs/README.md` record that Kanmer's own work flows through the
board: tickets before branches, PRs reference ticket ids, gates are not optional
here.

## The evidence, measured rather than asserted

This is the ticket that claims the repo follows its own process, so the claim
should be checkable. On the board today (102 tickets):

- **10 tickets carry four or more recorded stage entries** — GUI-007, GUI-010,
  GUI-015, GUI-016, GUI-017, SKILL-002, SKILL-003, SKILL-004, SKILL-006,
  SKILL-007.
- **10 carry a PR reference.**
- **60 are backfilled history** with `custom`/empty requirements, created
  directly in Done — correctly, since they predate the board.

`stageEntered` only began recording when CORE-011 landed, so tickets closed
before that have no history *and could not have*. That is a limit of the data,
not evidence of process.

## The uncomfortable part, which belongs in the rule

Earlier in this same session, **26 tickets were closed by writing every document
and firing one `backlog → done` move**. Legal at the time, and it produced
tickets that look fully worked with no pipeline behind them.

CORE-011 made that impossible. But the operating rule should not pretend the
history is clean — a rule stated as "we always do this" is falsified by the
repo's own board and then ignored. Stated as "this is the rule, here is when it
started being enforced, here is what came before", it survives contact with the
evidence.

## Where each half goes

**AGENTS.md** is read by agents. It gets the operative rules: file the ticket
first, one worktree and branch per ticket, PRs name the ticket, gates are not
optional. Short, imperative.

**`docs/README.md`** is read by humans deciding how to contribute. It gets the
same rule with the reasoning, and the honest note about what the board's history
does and does not demonstrate.

The AGENTS.md **managed block** must not be touched — it is generated from
`scripts/agents-block.mjs` and byte-checked. The operating rule goes *outside*
the markers, in the repo's own contributor guide.

## The stretch: release notes from tickets

`scripts/release.mjs` exists and refuses a dirty tree. Generating notes from
tickets that reached Done since the last tag is a real convenience — and now
genuinely possible, because `stageEntered.done` is committed data.

Worth doing: it is the first thing that makes the board's stage history *useful*
rather than merely recorded, which is a better argument for the operating rule
than any prose.

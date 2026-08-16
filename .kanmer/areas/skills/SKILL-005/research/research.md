# The AGENTS block — research

## What it is, and why it is the highest-leverage text in the repo

ADR-0009 layer 3. It is the only Kanmer text an agent reads **without being
asked** — it sits at the top of the repo's `AGENTS.md`, so every agent that
opens the project reads it before touching anything. Skills are opt-in; this is
not.

That makes its current state the worst outstanding bug in the roster: nine lines
of v2. It names seven stages including two that no longer exist, tells agents to
write `impact.md`, and lists thirteen skills including the deleted
`kanmer-import`. Any agent onboarding to a v3 repo today is instructed to do
things the board will reject.

## What is wrong, line by line

| Current | Problem |
|---|---|
| `backlog → researching → planning → …` | Two stages do not exist. `move_item` rejects both. |
| "hard document gates guard the transitions" | True but useless — it does not say the requirements are *per profile*. |
| "Before a ticket leaves Backlog, link a governing doc" | Only true for some profiles. A `chore` or `spike` has no such requirement. |
| `research.md + impact.md → plan.md → …` | Wrong paths (documents are folders), wrong type (`impact` is now `files`), and states one pipeline where there are five. |
| "write proof.md on merged main before Done" | Right idea, wrong filename. |
| "-import" in the skills list | Deleted in SKILL-001. |

## The one thing it must convey that it currently cannot

**Requirements are per ticket.** Profiles are the headline v3 change, and a
block that states a single pipeline actively teaches the wrong model — an agent
that believes every ticket needs six documents will write six documents,
which is PRD-001 problem 1 restated.

So the block should stop describing the pipeline at all and instead point at
`get_doc_gates`. That is also ADR-0009's own principle: the block orients, the
server gates. Prose that restates rules is prose that goes stale — this block is
the proof, having gone stale within one release.

## New since the ticket was written

CORE-011: a move may cross at most one gated boundary. That belongs in the
block, because it is a rule an agent will otherwise hit as a confusing error on
its first move. It is exactly the kind of thing orientation is for.

## The duplication

`BLOCK_BODY` in `scripts/agents-block.mjs` is duplicated by hand into
`kanmer-setup/SKILL.md`, and `verify-agents-block.mjs` asserts the skill
*contains* the script's literal. Both must change together.

The duplication is deliberate and should stay: the skill is the fallback for
plugin users who do not have this repo checked out, so the text has to exist in
both places. The byte-identity check is what makes hand-duplication survivable,
and it works — it is what will catch me if I edit only one.

## Length

Nine lines today. The block is read by every agent on every session, so it is
the wrong place to be generous. Orientation essentials only, per the ticket:
where work lives, the six stages, that requirements vary and where to ask, the
one-gate rule, worktree convention, scratch, and the skill roster. Anything an
agent can discover by calling a tool should be a pointer, not a paragraph.

---
name: kanmer-research
description: Research a Kanmer ticket before it gets planned — dig into the codebase, record what you learned in the ticket's research.md, and survey what the change touches in impact.md. Use when the user says "research", "investigate", "dig into" or "scope out" a ticket, when a ticket is missing its research or impact document, and always before writing any plan.md. DO NOT USE FOR writing the plan itself (kanmer-plan) or implementing the change (kanmer-execute).
---

# Researching a Kanmer ticket

Research is the read-only phase: you change no code and need no branch or
worktree. Its output is two documents in the ticket's folder, written with
`set_ticket_doc` — they are what plan.md will later be built FROM, so their
job is to make planning boring.

## Steps

1. **Read the ticket.** `get_item` for the body (the What/Why is your
   research question) and `get_links` for related tickets — prior research
   on a linked ticket often answers half the question. Check
   `get_ticket_doc` for an existing research.md; extend it rather than
   overwrite it (`append: true` for additions, or a full rewrite with
   `expected_updated` if it's genuinely stale).
2. **Move the ticket to the stage that means "designing"** (resolve against
   `list_board` — on a fresh board that's `planning`) so the human sees the
   ticket is being worked, not idle.
3. **Investigate.** Read the code, run read-only commands, check docs and
   history. Chase the question the ticket actually asks, not everything
   adjacent to it.
4. **Write `research.md`** from `assets/research-template.md`: the question,
   findings each with their source, what the findings imply for this ticket,
   and the open questions plan.md must not silently assume.
5. **Write `impact.md`** from `assets/impact-template.md`: the files/modules
   the change will touch and the risk in each, ripple effects (callers,
   tests, docs, build artifacts), and what's deliberately out of scope.
6. **Surface, don't sit on.** Open questions that only the user can answer
   go to the user now — not discovered again at planning time. New work you
   uncovered that doesn't belong in this ticket becomes its own ticket
   (`kanmer-tickets`), linked with `[[ID]]` or `rel: "blocks"` if it must
   land first.

When both documents exist and the open questions are either answered or
explicitly parked, the ticket is ready for `kanmer-plan`.

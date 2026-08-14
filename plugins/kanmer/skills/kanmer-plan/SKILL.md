---
name: kanmer-plan
description: Plan a Kanmer ticket — turn its research.md and impact.md into a concrete plan.md and an executable checklist.md. Use when the user says "plan", "design the approach for" or "break down" a ticket, or when a researched ticket needs its plan before implementation. DO NOT USE FOR the research itself (kanmer-research — do that first if research.md or impact.md is missing) or for implementing the plan (kanmer-execute).
---

# Planning a Kanmer ticket

A plan is only as good as what it's built from. plan.md is written FROM
research.md and impact.md — never before them, never instead of them.

## Steps

1. **Check the inputs.** `get_item` for the ticket, then `get_ticket_doc`
   for `research` and `impact`. If either is missing or visibly stale
   (the code it describes has moved on), do the `kanmer-research` skill's
   job first — don't plan around the gap.
2. **Keep the ticket in the designing stage** (resolve against `list_board`)
   while planning; research usually already moved it there.
3. **Write `plan.md`** from `assets/plan-template.md`: the chosen approach
   and why it beat the alternatives, concrete ordered steps, how proof will
   be produced (the tests to run, the behaviours to observe), and risks with
   mitigations. Every open question from research.md must be either resolved
   here or listed as a risk — silence is how plans go wrong.
4. **Distill `checklist.md`** from `assets/checklist-template.md`: one
   `- [ ]` box per plan step, ending with the verification run that produces
   proof.md. The checklist is what `kanmer-execute` actually works through
   and what the human watches tick over on the board, so each box must be
   independently checkable — "wire the retry call" not "do the backend".
5. **Sanity-check scope.** If the plan grew beyond one unit of work, split
   it: file the extra tickets (`kanmer-tickets`), link with `rel: "blocks"`
   where order matters, and shrink this plan back to its ticket.
6. **If the plan changes anything user-visible or contested, show it to the
   user before implementation starts** — a paragraph summary, not the whole
   document. Their board renders plan.md; they can read the rest there.

When plan.md and checklist.md exist, the ticket is ready for
`kanmer-execute`.

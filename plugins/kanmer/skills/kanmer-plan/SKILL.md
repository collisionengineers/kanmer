---
name: kanmer-plan
description: Plan a Kanmer ticket — turn its research and files documents into a concrete plan and an executable checklist. Use when the user says "plan", "design the approach for" or "break down" a ticket, or when a researched ticket needs its plan before implementation. DO NOT USE FOR the research itself (kanmer-research — do that first if research or files is missing) or for implementing the plan (kanmer-execute).
---

# Planning a Kanmer ticket

A plan is only as good as what it is built from. The plan is written FROM the
research and files documents — never before them, never instead of them.

**`get_doc_gates <id>` is the authority on what this ticket needs**, and it is
the only one — a profile's requirements are resolved per board and change
without this file changing. Some profiles ask for no plan at all. Ask rather
than assuming, and do not reason from `board.yml`: requirements are injected at
resolve time, so its `profiles:` block is not the effective set.

## Workflow

1. **Check the inputs.** `get_item` for the ticket, then `get_ticket_doc` for
   `research` and `files`. If either is missing or visibly stale, do the
   `kanmer-research` job first — you should not plan around the gap, whether or
   not this ticket's profile happens to gate on them.
2. **Select optional work-type overlays.** After the ticket evidence is clear,
   manually copy zero or more matching prompt sets into the brief:
   `assets/brief-fix.md`, `assets/brief-ui-ux.md`, `assets/brief-docs.md`,
   `assets/brief-cloud-infra.md`, and `assets/brief-data-migration.md`. They
   supplement the shared plan and checklist; choose none when they add no
   value, and combine them when work crosses domains. They are templates, never
   an automatic classifier, ticket field, profile mapping, or gate.
3. **The ticket is in Preparing.** Research and planning share that stage in the
   six-stage board, so there is no move between them — the move you are working
   towards is Preparing → Implementing.
4. **Write `plan.md`** from `assets/plan-template.md`, the bounded execution
   brief: Objective, Starting state, Required changes, Expected files, Do not
   modify, Constraints, Ordered steps, Acceptance checks, Commands, Failure and
   deviation rules, and its exact `## Stop condition`. It **must** carry a **Governing docs**
   section — how the plan meets each linked PRD/FRD/ADR (`refs`), or, *only with
   explicit user authorization*, how it modifies one, or why a new ADR is being
   written. Design decisions become **ADRs** via `kanmer-docs`, linked into
   `refs`. (Gates check a doc exists; this content rule is enforced here and
   checked by `kanmer-review`.)
5. **Resolve planner decisions before dispatch.** In Required changes, words
   such as `investigate`, `decide`, `choose`, or `determine` are an advisory
   warning that planning remains: resolve it or use a spike. This is not a hard
   gate. For user-visible, contested, or grouped work, derive a compact approval
   paragraph from `assets/approval-contract.md`; the 300–600-word asset is guidance,
   not a required document type.
6. **Distill `checklist.md`** from `assets/checklist-template.md`: one `- [ ]`
   box per plan step, ending with the verification the post-implementation
   report will summarise. Each box must be independently checkable — "wire the
   retry call", not "do the backend".
   `[pre-review]` and `[post-merge]` labels are advisory human/skill text; gates
   ignore them, so `get_doc_gates` remains authoritative.
7. **Sanity-check scope.** If the plan grew beyond one unit of work, split it:
   file the extra tickets (`kanmer-tickets`), link with `rel: "blocks"` where
   order matters, and shrink this plan back to its ticket.
8. **If the plan changes anything user-visible or contested, show it to the user
   before implementation starts** — a paragraph summary, not the whole document.
9. **Put the open questions to the user, then revise the plan around the
   answers.** This is the moment for it: research surfaced them, the plan is
   what would otherwise silently assume one. Ask them together, each with a
   recommendation, and record the answer in `open-questions` — a question
   answered in chat and not written down is a question nobody can find later.
   Take trivial defaults rather than asking; say in the document that you took
   them.

When the documents exist and the user has approved, `get_doc_gates <id>` shows
the Preparing → Implementing boundary passable and the ticket is ready for
`kanmer-execute`. If it still reports `questions-resolved` unmet, step 7 is not
finished: `open-questions` has unticked `- [ ]` lines. Answer them and tick, or
move them under `## Parked (explicitly deferred)` with a reason for deferring.

A move may cross **one** gated boundary at a time, so do not try to jump a
planned ticket further than Implementing — the move is refused, and the refusal
names the next stage.

---

**Hand off to `kanmer-execute`**, which takes the ticket into a worktree and
works the checklist you just wrote. If planning turned up a question only the
user can answer, hand off to *them* first — an unanswered question is the one
thing that should stop this ticket reaching Implementing.

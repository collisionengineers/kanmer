# Open questions — SKILL-014

*The open questions. Not scratch — these **block** the ticket at three real gates; scratch is a notepad and is never gated.*

Four questions came out of the audit. **None needs the operator**: each is a
scope judgement answerable from FRD-023, ADR-0009 and the code, and each is
recorded below with the reason rather than resolved silently. Over-asking is its
own failure, and inventing a question to look thorough is worse than not asking.

- [x] **Is "every SKILL.md names its successor" literal?** — **No, and it cannot
      be.** `kanmer-report`, `kanmer-docs` and `kanmer-tickets` are *service*
      skills: invoked from anywhere, returning to whoever called them. Naming a
      successor for `kanmer-report` would mean inventing one.

      **Taken as a default, not escalated**, because the ticket's own Why says
      what the requirement is *for* — "an agent that loads one skill mid-task has
      no reliable way to know what precedes or follows it" — and that need is met
      for a service skill by stating **who calls it and where control returns**.
      Same information, honest shape. The Verification box is amended to say so
      rather than left to be quietly failed.

- [x] **Does the routing summary in the AGENTS block become a table?** — **No: a
      single ordered line.** The ticket body says "put the routing table in the
      AGENTS block", and that intent is honoured — as a route, not a grid.

      Reasons, all mechanical: the block is injected into **every** repo that
      installs Kanmer, so its size is a cost everyone pays; the roster line is
      already there and only lacks the order; and a twelve-row table is the kind
      of duplication FRD-023 R1 exists to prevent — the skills already hold their
      own detail. The block gets the *sequence*, which is the part not otherwise
      available without loading a skill.

      Both `BLOCK_BODY` copies change together or `verify-agents-block` fails, so
      this is checked rather than trusted.

- [x] **Correct `kanmer-review/SKILL.md:48`, or delete the paragraph?** —
      **Correct it.** The paragraph does necessary work: it warns that the
      review-fix rule is a convention nothing enforces. What it gets wrong is the
      next clause, which claims `enter-review` and `enter-done` catch a question
      raised during implementation.

      Measured on [[SKILL-012]] and recorded in its proof: `fix` and `chore`
      declare no `enter-review` at all, and the **merge is unprotected on every
      profile** — `kanmer-review` merges before it moves, and `gh pr merge` is
      outside the gate engine. Only `enter-done` holds universally. Deleting the
      paragraph would lose a true warning to fix a false sentence.

- [x] **Do the four `kanmer-review/assets/pr-*.md` files still have a job?** —
      **Out of scope here; filed as [[SKILL-015]].** They describe four pipeline
      documents that `set_ticket_doc` now **rejects** — reviews moved to
      `append_scratch` (`kanmer-review/SKILL.md:24-31`). So they are not stale
      wording, they are assets for a mechanism that no longer exists, and the
      choice between deleting them and rewriting them as scratch templates is a
      real decision with a real answer either way.

      This ticket fixes their one `impact` line so the sweep's verification grep
      is honest, and leaves the larger question to its own ticket rather than
      smuggling a deletion into a normalisation change.

## Parked (explicitly deferred)

- **Should a lint or test assert the skill vocabulary against `profiles.ts`?**
  This ticket's verification is greps I run by hand, which is exactly the
  mechanism that let the drift happen: the release rail checks what it is told to
  check, and nobody told it about skill prose. A real check belongs in the rail.

  Safe to defer because the sweep leaves nothing to catch today, and because
  [[CORE-025]] is already the open investigation into what else CI should assert
  about a ticket — this is evidence for it, not a competing design. Reopens the
  moment a second drift of this kind is found, since two occurrences is a
  pattern and the manual grep will have been proven insufficient.

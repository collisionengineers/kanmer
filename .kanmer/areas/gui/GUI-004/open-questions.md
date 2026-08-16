# Open question — how do research-only tickets close under v2 gates?

**Status: the work of this ticket is complete.** `research.md` holds the verified provider
findings, `impact.md` maps them onto 1.1/1.2, and the plan footer is written. GUI-002 and
GUI-003 are unblocked — they were waiting on the *findings*, not on this ticket's stage.

## The question

This ticket cannot reach Done without `plan`, `checklist`, `post-implementation-report` and
`proof`. It has no code change, so all four would be retroactive restatements of the research:
a plan describing verification already performed, a checklist of hosts already checked, a report
repeating the findings, and a proof whose evidence is the findings themselves.

That is precisely the failure PRD-001 problem 1 names — *"trivial tickets either stall at gates
or teach agents to write junk documents to satisfy them"* — and it landed on the very first
ticket worked under the new board.

Under v3 this ticket is a **`spike`**: FRD-002 P2 gives spike an empty pipeline with `research`
required only at enter-done, so it would go Backlog → Done on `research.md` alone. The profile
that fixes this does not exist until Phase 2 (CORE-003).

## Why it is not a one-off

It applies to every research-only or docs-only item in the roadmap — 1.3 here, and by the same
argument the Phase 0 items, which were only closable because creation into Done is ungated. It
will recur on 7.2's backfill and on any chore-shaped ticket.

## Options

**(a) Park research-only tickets mid-pipeline until Phase 2, then assign `spike` and close.**
Recommended. Costs nothing, writes no false documents, and the migration assigns profiles
anyway. The board temporarily shows a few tickets parked in `researching`/`planning` whose work
is finished — visible and explainable, which is better than invisible and wrong.

**(b) Add a temporary per-area doc-set for a `research` area with empty gates.** Uses the shipped
v2 `board.docs.areas` mechanism honestly and closes tickets properly. But it is throwaway
configuration that the format-3 migration then has to unpick, and it splits work across areas by
ceremony rather than by subsystem.

**(c) Write the four documents.** Rejected: it is the behaviour the initiative exists to stop,
and it would poison Phase 7.2's history backfill with documents that assert work that never
happened.

## Recommendation

(a). Leave this ticket in `researching` with its deliverable complete, proceed to 1.1/1.2, and
close it as a `spike` once CORE-003 lands. If a parked ticket is unacceptable on the live board,
(b) is the fallback — but it should be a deliberate choice, not a default.

**This is a decision for the user**: it sets the policy for every research-only ticket on the
board, not just this one.

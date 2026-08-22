---
status: draft
---

# ADR-0011 — Gates may read a document's content, for open questions and nothing else

## Context

Every gate to date is satisfied by **existence**. `statusOf` (`packages/core/src/gates.ts`) resolves a requirement through `ev.hasType(type)` — at least one markdown file under the type's folder — or, for the `governing-doc` pseudo-type, through a non-empty `refs`/`docs_todo`. Nothing reads what a document says. That was deliberate: `collapsesPipeline` was built as a structural boundary count precisely because it "needs no timestamps and so has nothing to be wrong about", after CORE-011's mtime-based proposal (R2) was judged unimplementable. The only content-adjacent check in the engine — visual proof with no image beneath `proof/` — is a **warning, never a block**, because "an image check cannot tell a screenshot from a decorative logo".

Against that, the board's own record: across 118 tickets, three ever carried an `open-questions` document, and the number that recorded a resolution is **zero**. GUI-064 shipped in v0.3.2 with four unticked boxes, one of them a measurement genuinely never taken. GUI-004 closed on a policy question that had resolved itself in practice. CORE-011's three questions were answered inside its own other documents. CORE-021 was archived with four decisions simply unmade. All twelve were closed by hand in one sitting on 2026-08-16, and every one proved either already decided or trivially decidable. The rule that questions "**block** the plan" — the open-questions template says exactly that — has never once been enforced, because there is nothing to enforce it.

Two candidate fixes are ruled out before this decision starts. **Requiring the `open-questions` document** at a boundary is worse than nothing: existence semantics mean a file of four unanswered questions *satisfies* the gate, enforcing paperwork instead of the rule. **Writing the rule into skill prose** contradicts ADR-0009 and FRD-023 R1 — skills derive rules, never restate them — and would add five new restatements to the roster whose prose deletion is Phase 6's exit criterion.

## Decision

Introduce **`questions-resolved`**, a pseudo-requirement alongside `governing-doc`, satisfied when the ticket has **no unticked `- [ ]` line above the `## Parked (explicitly deferred)` heading** across the files in `open-questions/`. An absent document satisfies it: raising no questions is not a failure state.

This is the **only** requirement permitted to read inside a document, and the exception is bounded by three properties that do not generalise:

1. **The convention is already shipped and already parsed.** The open-questions template writes one `- [ ]` per question, and `getTicketDocsInfo` already runs exactly this regex over `checklist/` for progress counts. The implementation is that loop pointed at a second folder — not new machinery, and not a new thing for authors to learn.
2. **The parser judges syntax, not meaning.** It counts checkboxes. It never decides whether an answer is *good*, which is the class of judgement `gates.ts` reserves for warnings. A machine can be trusted to see an unticked box.
3. **The failure mode is a stuck ticket, not a wrong one.** A false block is visible immediately and clears with one edit; a false pass is invisible. Existence gates fail in the invisible direction, which is how twelve questions reached Done unanswered.

It applies at `leave-preparing`, `enter-review` and `enter-done`, on **every** profile — including `spike`, whose sole boundary is `enter-done`. No carve-out by work type: open questions arise from any work that is new or unclear on specifics, and exempting a profile asserts that some work is inherently unambiguous. Existing boards inherit the requirement on upgrade.

A ticked box is the whole mechanism. Nothing records **who** answered: Kanmer is a solo-developer tool, and where more than one person is involved the commit that ticks the box already carries the author.

### Merge-gate read boundary (CORE-025)

The profile-resolved movement gates remain governed by the decision above: their
only content reader is the `questions-resolved` parser. The separate, read-only
CI merge predicate `kanmer-gate` is allowed to inspect the machine record
`scratch/review.md` and Git ancestry evidence at its package boundary. That is
not a new document requirement and it never mutates a ticket or makes core
spawn a subprocess. The gate parses review frontmatter structurally, compares a
full attested `head_sha` with the exact PR head, and passes typed reachability
evidence into the pure evaluator. Missing, malformed, or stale review evidence
and unreachable historical commits are compatibility-period warnings; stage and
live-dependency failures remain errors. This keeps the movement-gate contract
and the GitHub merge contract explicit instead of silently broadening the
`questions-resolved` parser.

`## Parked (explicitly deferred)` is promoted from a suggested heading to the **normative** escape. A question moved beneath it with a reason clears the gate, which is what makes kanmer-research's "answered or explicitly parked" mechanically true rather than aspirational.

## Alternatives considered

**(a) Require the `open-questions` document.** Free — `open-questions` is already a legal `DOC_TYPE`. Rejected: existence semantics make it satisfiable by unanswered questions, so it enforces the ceremony and not the rule, which is PRD-001 problem 1 reappearing.

**(b) A frontmatter flag (`questions_open: boolean`), parallel to `docs_todo`.** No parsing, mechanically clean. Rejected: it adds a second place to be wrong — a flag that disagrees with the document is undetectable — and `docs_todo` works precisely because it has no document to contradict.

**(c) Skill prose in kanmer-plan / execute / review / verify / closeout.** Cheapest to ship. Rejected: ADR-0009 puts skills at the bottom of the contract hierarchy — on-demand, permission-gated, install-time copies that go stale. A rule that has already failed twelve times for want of enforcement is not repaired by writing it down five more times.

**(d) A warning rather than a block.** Consistent with the visual-proof precedent. Rejected: a warning is what exists today in prose form, and its observed compliance is zero.

## Consequences

- **The engine gains a content-reading path**, and this ADR is the boundary on it. Any future requirement proposing to read inside a document must clear the three properties above and amend this ADR; the default remains existence.
- **`EvidenceProbe` gains a method**, so every implementer — tests included — must be updated. `GOVERNING_DOC` is duplicated in `apps/gui/src/renderer/src/lib/profileDraft.ts` for the Settings profile editor, and the new pseudo-type must be added there too or Settings rejects a profile core accepts.
- **Upgrading boards can strand in-flight tickets.** A ticket in Preparing with an unticked box becomes unmovable on upgrade. Intended, and the release notes must say so and name the escape: tick it, or park it with a reason.
- **`## Parked` becomes load-bearing.** Renaming or restyling that heading in the template silently changes what the gate counts; it needs a test asserting the exact string.
- **One requested stop cannot be delivered.** Refusing to apply *review fixes* while questions are open is not a stage transition — review fixes happen inside the review stage with no `move_item` — so it stays prose in `kanmer-review`, labelled as a convention rather than enforcement. Promising otherwise would be the "gate that claims more than it delivers" CORE-021 warned about.
- **Dispatch needs no exception.** FRD-009 R3 tells a headless run to record the question and "stop at the deliverable — never guess *forward* across a decision boundary". Under this gate it writes its questions, cannot tick them, and stops. The boundary becomes literal instead of honour-system. What remains is a reporting obligation: kanmer-auto must report a lane that stopped on a question as such, not as a generic failure.

## Two limits on the injection

Added by amendment (SKILL-013). Both were **found by implementing this ADR**, not
by reasoning about it, and both lived only in a doc comment on `resolveProfiles`
in `packages/core/src/board.ts` — the wrong home for a rule that constrains future
work, and the reason a closed ticket was the only other place they were written
down. Neither contradicts anything above; they are limits this ADR should have
stated.

1. **Never gate `leave-backlog`.** Questions are raised *during* research, which
   happens after Backlog. Gating entry to the stage where questions get worked
   would trap the ticket outside it, unable to reach the place where it could be
   fixed. The first implementation did exactly this and was wrong.

2. **Only boundaries the profile already declares.** Adding a *new* gated boundary
   changes which multi-stage moves are legal, because `collapsesPipeline` counts
   gated boundaries. Giving `spike` a gated `leave-preparing` and `enter-review`
   would turn its Backlog → Done jump from one gated boundary into three and
   refuse it — breaking the acceptance case FRD-002 exists to protect. So a
   `spike` gains the requirement at `enter-done` and nowhere else, and `chore`'s
   one-jump to Implementing survives untouched.

   The cost of limit 2 is a narrow gap, stated because it is real: a profile that
   declares no `enter-review` catches a question raised during implementation at
   `enter-done` rather than at review.

**ADR-0014 crosses limit 2, once, deliberately.** It gives `fix` a gated
`enter-review` it did not declare — and thereby closes the gap above for `fix`,
leaving it open for `chore`. That is not a repeal. Limit 2 exists so that adding
a gated boundary is a decision with an ADR and a measured before/after table
behind it rather than a side effect; ADR-0014 is what satisfying it looks like.
The two injections are kept as **separate functions with separate rules** in
`board.ts` for the same reason: a single generalised "inject a requirement"
helper would erase the difference between a pass that may not change the boundary
count and one that exists to.

Related: ADR-0003 (requirement profiles) · ADR-0009 (skills are not the contract) · ADR-0014 (`fix` gains a gated `enter-review`) · FRD-002 · FRD-009 · FRD-023 · CORE-011 · SKILL-012 · SKILL-013.

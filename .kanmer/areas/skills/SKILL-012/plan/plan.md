# Plan — SKILL-012: questions-resolved as a real gate

## Approach

**A `questions-resolved` pseudo-requirement in the gate engine, alongside
`governing-doc`.** Research ruled out the two cheaper designs: requiring the
`open-questions` *document* is satisfiable by a file of unanswered questions
(F3), and skill prose adds five restatements of a gate rule to the roster whose
prose deletion is Phase 6's exit criterion (F5). ADR-0011 records the decision
and the three properties that keep the exception from generalising.

The implementation is smaller than the decision. `EvidenceProbe` is the extension
point the engine already has; `statusOf` already branches on `GOVERNING_DOC`; and
the checkbox parser is the loop `getTicketDocsInfo` runs over `checklist/` today,
pointed at a second folder with one addition — stop counting at `## Parked`. That
last detail is what makes kanmer-research's "answered or **explicitly parked**"
mechanically true rather than aspirational, and it is why parking is an honest
exit rather than ticking a box you did not answer.

## Governing docs

**`docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md` — meets.**
This ticket *is* the ADR's implementation, so every clause is a step:
- The satisfaction rule (no unticked box above `## Parked`; absent document
  satisfies) → steps 3–4.
- The three bounding properties → step 4 reuses the shipped regex (property 1),
  counts syntax only (property 2), and blocks rather than warns, which is the
  visible-failure direction (property 3).
- Boundaries `leave-preparing` / `enter-review` / `enter-done` on **every**
  profile including `spike` → step 5.
- `## Parked` is load-bearing and "needs a test asserting the exact string" →
  step 8, an explicit box.
- The GUI `GOVERNING_DOC` duplication → step 6.
- "The default remains existence; any future content-reading requirement must
  amend this ADR" → step 3 adds one pseudo-type, not a general mechanism.

**`docs/functional/frd/FRD-009-interrogative-workflow.md` — modifies, authorized.**
The operator agreed the enforcement point and settled the two questions that
change the FRD's meaning. FRD-009 today has four requirements, all about
*asking*; it needs a fifth about *not proceeding*. R3 is restated to say the
gate implements the headless rule rather than sitting in tension with it —
dispatch is for work with no open questions, so a dispatched task that raises one
stops at the deliverable, which is what R3 already asks for. R1–R2 and R4 are
untouched. Step 9.

**`docs/functional/frd/FRD-023-agent-skills-system.md` — meets.**
R1 (derive, don't restate) is the reason this is a requirement and not prose. The
skill edits in step 7 add no rule: `kanmer-plan` gains the ask-then-revise moment
it already owns, `kanmer-review` gains the one stop that *cannot* be a gate
(labelled as a convention, per the ADR), and `kanmer-auto` gains a reporting
obligation. R5's rail is step 11.

**`docs/functional/frd/FRD-002-requirement-profiles.md` — modifies, authorized.**
It governs the requirement vocabulary and the profile table; both change. Step 9.

## Steps

1. **Extract the checkbox counter** from `getTicketDocsInfo`
   (`packages/core/src/store.ts:1045-1060`) into a reusable helper, so
   `open-questions/` does not grow a second regex that can drift from the first.
2. **Give the helper a stop-at-heading mode.** Counting halts at the first
   heading matching `## Parked` (case-insensitive, tolerant of the
   "(explicitly deferred)" suffix). Everything below is parked, not open.
3. **`QUESTIONS_RESOLVED` constant** in `packages/core/src/profiles.ts`, beside
   `GOVERNING_DOC`, and accepted by `validateProfileMap` — which today rejects
   anything that is neither `governing-doc` nor a `DOC_TYPES` member, so missing
   this makes every board carrying the requirement fail validation.
4. **`EvidenceProbe` gains `unresolvedQuestions(): Promise<number>`** and
   `statusOf` gains a branch before the `hasType` path, mirroring the
   `GOVERNING_DOC` branch. Satisfied when the count is 0; an absent document
   returns 0.
5. **`DEFAULT_PROFILES` gains the requirement** at `leave-preparing`,
   `enter-review` and `enter-done` — on each profile, at whichever of those
   boundaries it has. `spike` gets it at `enter-done`, its only one.
6. **GUI:** add the pseudo-type to
   `apps/gui/src/renderer/src/lib/profileDraft.ts` (which duplicates
   `GOVERNING_DOC`) or Settings will reject a profile core accepts, and check the
   readiness panel renders a requirement that has no document to link to.
7. **Skills** (`plugins/kanmer/skills/`, **not** `.claude/skills/`):
   `kanmer-plan` — ask, then revise the plan, before the Preparing→Implementing
   move; `kanmer-review` — do not apply fixes while questions are open, stated as
   a convention because no `move_item` occurs there; `kanmer-auto` — report a
   lane that stopped on a question as such, not as a generic failure;
   `kanmer-research` — point its closing paragraph at `get_doc_gates` instead of
   asserting the rule itself.
8. **Template:** `## Parked (explicitly deferred)` documented as normative in
   `open-questions-template.md`, since the parser now depends on it.
9. **Docs:** FRD-009 gains the enforcement requirement and R3 is restated;
   FRD-002 gains the requirement type and the profile-table change.
10. **Release note** — existing boards inherit the requirement on upgrade and a
    ticket in Preparing with an unticked box becomes unmovable. Name the escape:
    tick it, or park it with a reason.
11. **Rebuild the committed bundle** — core changed, so `plugin:build` then
    commit `plugins/kanmer/mcp/kanmer-mcp.cjs`.

## Verification

- **Unit, the parser** (`store.test.ts`): unticked blocks; `- [x]` and `- [X]`
  both clear; `*` bullets as well as `-`; questions below `## Parked` are
  ignored; several files under `open-questions/` are summed; **no document at all
  returns 0**; a document with prose but no boxes returns 0.
- **Unit, the gate** (`gates.test.ts`): unsatisfied at each of the three
  boundaries; satisfied when clear; a profile without the requirement is
  unaffected; `blockedBy` names it in the refusal.
- **Unit, validation** (`docs.test.ts`, `profileDraft.test.ts`): the new type is
  accepted by both validators — the GUI one already asserts
  `ok("governing-doc")`, so the parallel case goes beside it.
- **The exact-string test** (ADR-0011 consequence): `## Parked` is load-bearing;
  a test asserts the heading the parser matches, so renaming it in the template
  fails loudly rather than silently changing what the gate counts.
- **Integration, on real data:** [[GUI-064]]'s `open-questions/` — a real
  document with a `Parked` section — now reads 0 unresolved because all four
  boxes were ticked on 2026-08-16. Restoring one box to `- [ ]` in a fixture copy
  must read 1. That is the fixture the feature exists for.
- **Rail:** `npm test`, `typecheck`, `typecheck -w @kanmer/gui`, GUI build,
  `smoke:protocol`, `plugin:check`, boot smoke.
- **The demonstration that closes it:** `get_doc_gates` on a ticket with an open
  question shows `questions-resolved` unsatisfied and `move_item` refuses,
  naming it. This ticket's own [[SKILL-012]] documents are the natural subject —
  all its questions are now resolved, so it should pass, and re-opening one
  should stop it.

## Risks / open questions

- **Risk: stranding a user's board.** Adding a requirement to shipped profiles
  re-evaluates immediately. Accepted deliberately (ADR-0011, operator's
  decision); mitigated by step 10's release note and by parking being a
  one-line escape in a document the agent already wrote.
- **Risk: the parser over-reads.** A `- [ ]` in a code fence or an illustrative
  example inside `open-questions/` would count. Mitigation: the same exposure
  already exists for `checklist/` progress and has never bitten; the failure is a
  stuck ticket that clears with an edit, which is the direction ADR-0011 chose.
- **Risk: editing the stale `.claude/skills/` tree.** Gitignored, so it cannot
  reach a diff — but time spent there is wasted. Step 7 names the path.
- **Sequencing:** [[SKILL-011]] also edits `kanmer-auto/SKILL.md`. Same file,
  same lane — this ticket rebases on `origin/main` after SKILL-011 merges.
- **No open questions.** All five are resolved; ADR-0011 is merged (`c7ba074`)
  and linked.

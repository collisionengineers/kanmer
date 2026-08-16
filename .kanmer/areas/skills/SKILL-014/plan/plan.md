# Plan — SKILL-014: skill workflows, hand-offs, and the format-2 sweep

*The plan. Not the checklist — this is the **reasoning**; the checklist is the executable distillation of it.*

Written FROM `research` and `files`.

## Approach

**Normalise, don't rewrite.** The audit found the information mostly present but
inconsistently shaped and, in three places, absent — so the work is to impose one
shape, not to re-author twelve skills. Concretely: every SKILL.md gets a
`## Workflow` section carrying an ordered list whose steps name the stage they
operate in, and every SKILL.md **ends** with a hand-off line. Section prose stays
as it is; FRD-023 R3 protects each skill's voice, and a uniform-tone rewrite
would destroy the thing the roster is good at while claiming to fix routing.

The alternative considered and rejected: a shared `workflow.md` fragment
referenced by all twelve. It would guarantee consistency, but skills are loaded
**one at a time** (ADR-0009), so a reference to a sibling file is a reference an
agent may never follow — the same failure the ticket exists to fix. R4 permits
cross-skill references only because the roster installs atomically, and it names
exactly one such reference (the tool reference) as the allowed exception. Twelve
short duplicated endings beat one shared file nobody reads.

Two skills already have the target shape (`kanmer-research`, `kanmer-verify`);
they are the template, and they should barely change. That is the check on
whether the shape is real or invented for this ticket.

The sweep and the false-claim fix ride along because they are the same defect —
prose that drifted from the engine — and because verifying "no skill names a
document type that does not exist" is one grep whether it runs over four sites or
ten.

## Governing docs

**FRD-023 — Agent skills system.** *Meets.*

- **R1 (derive, don't restate)** — the workflow steps name **stages and skills**,
  never requirements. No step says which document a boundary needs. The
  acceptance grep is re-run and its output recorded in proof; step 8 is
  specifically the guard against smuggling rules back in while adding prose.
- **R3 (per-skill voice; the AGENTS block carries orientation essentials)** — only
  the workflow section and the closing line are normalised. The AGENTS block
  gains the pipeline **order**, which is orientation, and not a routing table,
  which would be restatement.
- **R4 (cross-skill references only to the tool reference)** — preserved; no new
  cross-skill file references are introduced, and the rejected shared-fragment
  option above is rejected precisely on R4 grounds.
- **R5 (release rail: any tool-surface change updates the tool reference)** — the
  tool surface does not change here, but the reference's prose is repaired to
  match the surface it already documents. This is R5's intent applied late.

**ADR-0009 — Skills are not the contract.** *Meets.* The tier ordering is the
justification for correcting `kanmer-review/SKILL.md:48` rather than defending
it: a skill statement that contradicts the engine is a bug in the skill. The
correction also removes prose that could be read as a guarantee, which is the
failure mode ADR-0009 is written against.

**No modification to any governing doc, and no new ADR.** The one design
judgement — a route line rather than a table in the AGENTS block — is a shape
choice within R3's "orientation essentials", not a new decision, and it is
recorded in `open-questions` with its reasoning.

## Steps

1. **Fix the ticket body's withdrawn claim.** It asserts `kanmer-import` is
   "still routed to"; the tracked tree has no such reference. Correct the body so
   the ticket does not carry a false premise into review.

2. **Correct `kanmer-review/SKILL.md:48`.** Keep the warning that the review-fix
   rule is unenforceable; replace the false clause with what is measured: only
   `enter-done` carries the requirement on every profile, `fix` and `chore`
   declare no `enter-review` at all, and the **merge is unprotected on every
   profile** because `gh pr merge` is outside the gate engine. Cite [[SKILL-012]].

3. **Add `get_doc_gates` to `kanmer-review`'s gather step.** It is the only
   stage-moving skill that never self-checks. One sentence.

4. **Sweep `kanmer-tickets/references/tool-reference.md`** — the six passages at
   lines 53, 65–67, 73, 107, 110, 119. Delete `priority`, add `profile` and
   `groups` to the summary field list, replace the seven v2 stages with the six
   fixed ones, say format 3, and redraw the ticket-folder diagram as
   folder-per-doc-type. **Leave the tool table untouched** — it is current, and
   editing it risks a regression in the one part that never drifted.

5. **Sweep the three `impact` sites** in `kanmer-plan/assets/plan-template.md`,
   `kanmer-review/assets/pr-review.md` and `kanmer-docs/assets/doc-structure.md`.

6. **Give each of the twelve SKILL.md files a `## Workflow` and a closing
   hand-off.** Pipeline skills name their successor; service skills
   (`kanmer-tickets`, `kanmer-docs`, `kanmer-report`) name their callers and
   where control returns; `kanmer-closeout` ends the pipeline and says so.
   `kanmer-research` and `kanmer-verify` are the reference shape and change least.

7. **Update the AGENTS block** — one ordered route line, in **both** copies:
   `scripts/agents-block.mjs` (`BLOCK_BODY`) and the fenced block in
   `kanmer-setup/SKILL.md`. Then run the script against this repo's own
   `AGENTS.md` so it carries what it documents.

8. **Re-run the R1 acceptance grep** and read the hits, not just the count. The
   only legitimate survivors are structural invariants (one gated boundary per
   move; the six stages) and the `questions-resolved` parse rule ADR-0011 puts in
   the open-questions template. Any per-profile requirement list added by step 6
   is a defect introduced by this ticket.

9. **Rebuild the plugin bundle at the repo root** — never inside the worktree
   (AGENTS.md gotcha 8; [[SKILL-011]] shipped a bundle without its own feature
   this way, with every other signal green).

10. **Run the rail** and open the PR.

## Verification

Greps, run on merged `main`, with output pasted into proof rather than
summarised — there is no test that asserts skill prose, so the commands *are* the
evidence:

- `grep -rn "impact" plugins/kanmer/skills/` → no hit naming a document type.
- `grep -rniE "researching|planning" …` → no hit naming a **stage**.
- `grep -rn "priorit" …` → no hit naming a **field**.
- Every doc type named anywhere in the tree appears in `profiles.ts:17`, checked
  by extracting both lists and diffing them, not by eye.
- Every `kanmer-*` reference in the tree resolves to a directory that exists.
- Each of the twelve SKILL.md files has a `## Workflow` and a closing hand-off —
  scripted over the twelve files, so "every" is measured.
- The R1 grep, with its surviving hits listed and each justified.
- `npm run verify:agents-block` (26/26), `npm run plugin:check`, `npm test`,
  `npm run smoke:protocol`, `npm run check:manual`.

## Risks / open questions

- **Both `BLOCK_BODY` copies must move together.** Mitigated mechanically:
  `verify-agents-block` asserts byte-equality and fails the rail otherwise. This
  is a caught risk, not a carried one.
- **Adding prose to twelve skills is the easiest possible way to break R1.**
  Mitigated by step 8 being a distinct step with a defined pass condition, run
  after the edits rather than assumed during them.
- **Scope creep into rewriting skills.** Mitigated by the two-reference-skills
  test: if `kanmer-research` and `kanmer-verify` end up substantially rewritten,
  the shape was invented rather than extracted, and the change has drifted.
- **The sweep's real fix is a rail check, not a grep.** Parked in
  `open-questions` and pointed at [[CORE-025]]; a manual grep is what let this
  drift happen, and the honest statement is that this ticket cleans up rather
  than prevents recurrence.
- Open questions: all four resolved and recorded; one parked, one spun out as
  [[SKILL-015]]. Nothing awaits the operator.
